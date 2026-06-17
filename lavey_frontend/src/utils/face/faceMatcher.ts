import * as faceapi from "@vladmandic/face-api";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";

const MODEL_PATH = "/models/face-api";
export const FACE_MATCH_THRESHOLD = 0.55;

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

export class FaceMatchError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "FaceMatchError";
    this.code = code;
  }
}

async function ensureBackend(): Promise<void> {
  await tf.setBackend("webgl");
  await tf.ready();
}

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    await ensureBackend();
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_PATH),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_PATH),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_PATH),
    ]);
    modelsLoaded = true;
  })();

  try {
    await loadingPromise;
  } catch (error) {
    loadingPromise = null;
    throw error;
  }
}

export function loadImageFromDataUrl(
  dataUrl: string,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(
        new FaceMatchError("IMAGE_LOAD_FAILED", "Could not load that image."),
      );
    img.src = dataUrl;
  });
}

export function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(
        new FaceMatchError(
          "IMAGE_LOAD_FAILED",
          "Could not load that image for face check.",
        ),
      );
    img.src = url;
  });
}

function loadImageSource(src: string): Promise<HTMLImageElement> {
  return src.startsWith("data:")
    ? loadImageFromDataUrl(src)
    : loadImageFromUrl(src);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else
        reject(
          new FaceMatchError("IMAGE_LOAD_FAILED", "Could not read that image."),
        );
    };
    reader.onerror = () =>
      reject(
        new FaceMatchError("IMAGE_LOAD_FAILED", "Could not read that image."),
      );
    reader.readAsDataURL(file);
  });
}

function imageToDataUrl(img: HTMLImageElement): string {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx)
    throw new FaceMatchError("IMAGE_LOAD_FAILED", "Could not analyze image.");
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.92);
}

export interface FaceValidationOptions {
  /** Slightly looser thresholds for profile photo uploads. */
  relaxed?: boolean;
}

async function validateClearFaceOnImage(
  img: HTMLImageElement,
  options?: FaceValidationOptions,
): Promise<void> {
  const relaxed = options?.relaxed ?? false;
  const detections = await faceapi
    .detectAllFaces(
      img,
      new faceapi.TinyFaceDetectorOptions({
        inputSize: relaxed ? 448 : 512,
        scoreThreshold: relaxed ? 0.4 : 0.48,
      }),
    )
    .withFaceLandmarks();

  if (detections.length === 0) {
    throw new FaceMatchError(
      "NO_FACE",
      relaxed
        ? "We could not see a clear face. Use a well-lit photo where your face is easy to see."
        : "No clear face found. Use a well-lit photo where your face fills most of the frame.",
    );
  }

  if (detections.length > 1) {
    throw new FaceMatchError(
      "MULTIPLE_FACES",
      "Only one person should be in the photo.",
    );
  }

  const detection = detections[0]!.detection;
  const minDim = Math.min(img.width, img.height);
  const faceSize = Math.max(detection.box.width, detection.box.height);
  const minFaceRatio = relaxed ? 0.14 : 0.2;
  const minDetectionScore = relaxed ? 0.44 : 0.52;

  if (faceSize / minDim < minFaceRatio) {
    throw new FaceMatchError(
      "FACE_TOO_SMALL",
      "Your face is too small in this photo. Move closer or use a tighter crop.",
    );
  }

  if (detection.score < minDetectionScore) {
    throw new FaceMatchError(
      "FACE_UNCLEAR",
      "Your face is not clear enough. Avoid blur, heavy filters, hats, or sunglasses.",
    );
  }
}

export async function validateClearFaceImage(
  file: File,
  options?: FaceValidationOptions,
): Promise<void> {
  if (!file.type.startsWith("image/")) {
    throw new FaceMatchError("INVALID_IMAGE", "Please choose a photo file.");
  }
  await loadFaceModels();
  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImageFromDataUrl(dataUrl);
  await validateClearFaceOnImage(img, options);
}

async function detectAllFaceDescriptors(
  img: HTMLImageElement,
): Promise<Float32Array[]> {
  const detections = await faceapi
    .detectAllFaces(
      img,
      new faceapi.TinyFaceDetectorOptions({
        inputSize: 512,
        scoreThreshold: 0.48,
      }),
    )
    .withFaceLandmarks()
    .withFaceDescriptors();

  return detections.map((detection) => detection.descriptor);
}

/** Posts must include the uploader — solo shots must be you; group shots must include you. */
export async function validateUserInPostPhoto(
  file: File,
  referenceUrl: string,
): Promise<void> {
  if (!referenceUrl.trim()) {
    throw new FaceMatchError(
      "NO_REFERENCE",
      "Add a clear profile photo first so we can verify you are in the picture.",
    );
  }

  await loadFaceModels();
  const dataUrl = await readFileAsDataUrl(file);
  const postImg = await loadImageFromDataUrl(dataUrl);
  const refImg = await loadImageSource(referenceUrl);
  const referenceDescriptor = await detectSingleFaceDescriptor(refImg);
  const postDescriptors = await detectAllFaceDescriptors(postImg);

  if (postDescriptors.length === 0) {
    throw new FaceMatchError(
      "NO_FACE",
      "We could not detect anyone in this photo. Use a clear picture where your face is visible.",
    );
  }

  const userPresent = postDescriptors.some(
    (descriptor) =>
      faceapi.euclideanDistance(referenceDescriptor, descriptor) <=
      FACE_MATCH_THRESHOLD,
  );

  if (userPresent) return;

  if (postDescriptors.length === 1) {
    throw new FaceMatchError(
      "NOT_YOU",
      "This photo does not look like you. Only post pictures where you are in the shot.",
    );
  }

  throw new FaceMatchError(
    "USER_NOT_IN_PHOTO",
    "You must be in this photo. You cannot post someone else without being in the picture too.",
  );
}

async function detectSingleFaceDescriptor(
  img: HTMLImageElement,
): Promise<Float32Array> {
  const detections = await faceapi
    .detectAllFaces(
      img,
      new faceapi.TinyFaceDetectorOptions({
        inputSize: 416,
        scoreThreshold: 0.45,
      }),
    )
    .withFaceLandmarks()
    .withFaceDescriptors();

  if (detections.length === 0) {
    throw new FaceMatchError(
      "NO_FACE",
      "No face detected. Use a clear photo with your face centered and good lighting.",
    );
  }

  if (detections.length > 1) {
    throw new FaceMatchError(
      "MULTIPLE_FACES",
      "More than one face was found. Use a photo with only your face visible.",
    );
  }

  return detections[0]!.descriptor;
}

export async function extractFaceDescriptor(
  dataUrl: string,
): Promise<Float32Array> {
  await loadFaceModels();
  const img = await loadImageFromDataUrl(dataUrl);
  return detectSingleFaceDescriptor(img);
}

function loadThumb(dataUrl: string): Promise<Uint8ClampedArray> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 48;
      canvas.height = 48;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(
          new FaceMatchError("IMAGE_LOAD_FAILED", "Could not analyze image."),
        );
        return;
      }
      ctx.drawImage(img, 0, 0, 48, 48);
      resolve(ctx.getImageData(0, 0, 48, 48).data);
    };
    img.onerror = () =>
      reject(
        new FaceMatchError("IMAGE_LOAD_FAILED", "Could not analyze image."),
      );
    img.src = dataUrl;
  });
}

/** Reject when the live shot is essentially the same file as the reference (replay attack). */
export async function validateNotDuplicatePhotos(
  referenceDataUrl: string,
  liveDataUrl: string,
): Promise<void> {
  if (referenceDataUrl === liveDataUrl) {
    throw new FaceMatchError(
      "SAME_IMAGE",
      "The live photo matches your uploaded file exactly. Use your camera for the selfie step, not the same gallery image.",
    );
  }

  const [refImg, liveImg] = await Promise.all([
    loadThumb(referenceDataUrl),
    loadThumb(liveDataUrl),
  ]);

  let samePixels = 0;
  const total = refImg.length / 4;

  for (let i = 0; i < refImg.length; i += 4) {
    const dr = Math.abs(refImg[i]! - liveImg[i]!);
    const dg = Math.abs(refImg[i + 1]! - liveImg[i + 1]!);
    const db = Math.abs(refImg[i + 2]! - liveImg[i + 2]!);
    if (dr < 8 && dg < 8 && db < 8) samePixels += 1;
  }

  const similarity = samePixels / total;
  if (similarity > 0.92) {
    throw new FaceMatchError(
      "SAME_IMAGE",
      "This looks like the same photo twice — possibly a picture held up to the camera. Take a fresh live selfie.",
    );
  }
}

export interface FaceCompareResult {
  match: boolean;
  distance: number;
  threshold: number;
  confidencePercent: number;
}

export async function compareFacePhotos(
  referenceDataUrl: string,
  liveDataUrl: string,
): Promise<FaceCompareResult> {
  await validateNotDuplicatePhotos(referenceDataUrl, liveDataUrl);

  const [referenceDescriptor, liveDescriptor] = await Promise.all([
    extractFaceDescriptor(referenceDataUrl),
    extractFaceDescriptor(liveDataUrl),
  ]);

  const distance = faceapi.euclideanDistance(
    referenceDescriptor,
    liveDescriptor,
  );

  if (distance < 0.06) {
    throw new FaceMatchError(
      "SUSPICIOUS_MATCH",
      "These images look identical. Use a live camera selfie — not the same photo or a picture on another screen.",
    );
  }

  const match = distance <= FACE_MATCH_THRESHOLD;
  const confidencePercent = Math.max(
    0,
    Math.min(100, Math.round((1 - distance / FACE_MATCH_THRESHOLD) * 100)),
  );

  return {
    match,
    distance,
    threshold: FACE_MATCH_THRESHOLD,
    confidencePercent,
  };
}

export async function compareFaceReferenceToLive(
  referenceUrl: string,
  liveDataUrl: string,
): Promise<FaceCompareResult> {
  await loadFaceModels();
  const [refImg, liveImg] = await Promise.all([
    loadImageSource(referenceUrl),
    loadImageFromDataUrl(liveDataUrl),
  ]);

  await validateNotDuplicatePhotos(imageToDataUrl(refImg), liveDataUrl);

  const [referenceDescriptor, liveDescriptor] = await Promise.all([
    detectSingleFaceDescriptor(refImg),
    detectSingleFaceDescriptor(liveImg),
  ]);

  const distance = faceapi.euclideanDistance(
    referenceDescriptor,
    liveDescriptor,
  );

  if (distance < 0.06) {
    throw new FaceMatchError(
      "SUSPICIOUS_MATCH",
      "These images look identical. Use a live camera selfie — not the same photo or a picture on another screen.",
    );
  }

  const match = distance <= FACE_MATCH_THRESHOLD;
  const confidencePercent = Math.max(
    0,
    Math.min(100, Math.round((1 - distance / FACE_MATCH_THRESHOLD) * 100)),
  );

  return {
    match,
    distance,
    threshold: FACE_MATCH_THRESHOLD,
    confidencePercent,
  };
}

export function faceMatchUserMessage(error: unknown): string {
  if (error instanceof FaceMatchError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Face comparison failed. Please try again.";
}
