import * as nsfwjs from 'nsfwjs';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

const PORN_THRESHOLD = 0.55;
const HENTAI_THRESHOLD = 0.55;
const EXPLICIT_COMBINED_THRESHOLD = 0.72;

let modelPromise: Promise<nsfwjs.NSFWJS> | null = null;

export class NsfwImageError extends Error {
  constructor(
    message = 'We can\'t save this photo because it appears to contain explicit or inappropriate adult content. Please choose a different image.',
  ) {
    super(message);
    this.name = 'NsfwImageError';
  }
}

async function ensureBackend(): Promise<void> {
  await tf.setBackend('webgl');
  await tf.ready();
}

async function loadNsfwModel(): Promise<nsfwjs.NSFWJS> {
  if (!modelPromise) {
    modelPromise = (async () => {
      await ensureBackend();
      return nsfwjs.load();
    })();
  }
  return modelPromise;
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image.'));
    };
    img.src = url;
  });
}

function scoreFor(predictions: nsfwjs.predictionType[], className: string): number {
  return predictions.find((p) => p.className === className)?.probability ?? 0;
}

/** Rejects explicit adult content; allows any other image. */
export async function validateSafeImage(file: File): Promise<void> {
  const img = await loadImageFromFile(file);
  const model = await loadNsfwModel();
  const predictions = await model.classify(img);

  const porn = scoreFor(predictions, 'Porn');
  const hentai = scoreFor(predictions, 'Hentai');

  if (
    porn >= PORN_THRESHOLD ||
    hentai >= HENTAI_THRESHOLD ||
    porn + hentai >= EXPLICIT_COMBINED_THRESHOLD
  ) {
    throw new NsfwImageError();
  }
}

export function nsfwImageUserMessage(error: unknown): string {
  if (error instanceof NsfwImageError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'We couldn\'t upload this photo. The file may be unreadable or unsupported — please try a different image.';
}
