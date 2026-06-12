const ANALYSIS_MAX_EDGE = 480;
const MIN_SHORT_EDGE = 360;
/** Laplacian variance — low values mean blur. Kept lenient for phone photos. */
const MIN_SHARPNESS = 36;
const MIN_BRIGHTNESS = 24;
const MAX_BRIGHTNESS = 252;

export class ImageQualityError extends Error {
  constructor(message = 'This photo looks low quality. Please upload a clear, well-lit picture.') {
    super(message);
    this.name = 'ImageQualityError';
  }
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
      reject(new ImageQualityError('Could not read this image. Try another photo.'));
    };
    img.src = url;
  });
}

function sampleImageData(img: HTMLImageElement): ImageData {
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  if (srcW < 1 || srcH < 1) {
    throw new ImageQualityError('This photo is too small. Use a higher resolution image.');
  }

  const scale = ANALYSIS_MAX_EDGE / Math.max(srcW, srcH);
  const width = Math.max(1, Math.round(srcW * Math.min(1, scale)));
  const height = Math.max(1, Math.round(srcH * Math.min(1, scale)));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new ImageQualityError('Could not analyze this image. Try another photo.');
  }

  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

function laplacianVariance(data: ImageData): number {
  const { width, height, data: pixels } = data;
  const gray = new Float32Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const offset = i * 4;
    gray[i] =
      0.299 * pixels[offset]! + 0.587 * pixels[offset + 1]! + 0.114 * pixels[offset + 2]!;
  }

  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap =
        -gray[i - width]! -
        gray[i - 1]! +
        4 * gray[i]! -
        gray[i + 1]! -
        gray[i + width]!;
      sum += lap;
      sumSq += lap * lap;
      count += 1;
    }
  }

  if (count === 0) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean;
}

function averageBrightness(data: ImageData): number {
  const { data: pixels } = data;
  let total = 0;
  const count = pixels.length / 4;

  for (let i = 0; i < pixels.length; i += 4) {
    total += 0.299 * pixels[i]! + 0.587 * pixels[i + 1]! + 0.114 * pixels[i + 2]!;
  }

  return total / count;
}

/** Reject very blurry, tiny, or badly lit photos. Thresholds are intentionally lenient. */
export async function validateImageQuality(file: File): Promise<void> {
  if (!file.type.startsWith('image/')) {
    throw new ImageQualityError('Please choose a photo file.');
  }

  const img = await loadImageFromFile(file);
  const shortEdge = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);

  if (shortEdge < MIN_SHORT_EDGE) {
    throw new ImageQualityError(
      'This photo is too small. Upload a clearer picture with at least 360px on the shortest side.',
    );
  }

  const sample = sampleImageData(img);
  const brightness = averageBrightness(sample);

  if (brightness < MIN_BRIGHTNESS) {
    throw new ImageQualityError(
      'This photo is too dark. Use a well-lit, clear picture so people can see you properly.',
    );
  }

  if (brightness > MAX_BRIGHTNESS) {
    throw new ImageQualityError(
      'This photo looks washed out or overexposed. Try a clearer shot with balanced lighting.',
    );
  }

  const sharpness = laplacianVariance(sample);
  if (sharpness < MIN_SHARPNESS) {
    throw new ImageQualityError(
      'This photo looks blurry or low quality. Please upload a clear, sharp picture.',
    );
  }
}
