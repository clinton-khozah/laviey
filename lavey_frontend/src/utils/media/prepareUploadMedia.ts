import {
  FaceMatchError,
  validateClearFaceImage,
  validateUserInPostPhoto,
} from '@/utils/face/faceMatcher';
import { validateImageQuality } from '@/utils/media/imageQualityCheck';
import { validateSafeImage } from '@/utils/media/nsfwImageCheck';

/** Max upload size — matches Supabase content bucket (3 MB) */
export const MAX_CONTENT_BYTES = 3 * 1024 * 1024;

export interface PrepareImageOptions {
  /** Skip NSFW screening (internal tooling only). */
  skipSafetyCheck?: boolean;
  /** Skip blur / lighting / resolution checks (internal tooling only). */
  skipQualityCheck?: boolean;
  /** Profile avatars — quality and safety only (no face-size rules). */
  avatarUpload?: boolean;
  /** Profile avatars — require one clear face in frame (strict). */
  requireFace?: boolean;
  /** Gallery / post photos — quality and safety only (no face-match rules). */
  galleryUpload?: boolean;
  /** Posts — uploader must appear in the photo (matched to profile reference). */
  requireUserInPhoto?: boolean;
  userReferenceUrl?: string;
}

export async function prepareImageForUpload(
  file: File,
  maxBytes = MAX_CONTENT_BYTES,
  options?: PrepareImageOptions,
): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose a photo file');
  }

  if (!options?.skipSafetyCheck) {
    await validateSafeImage(file);
  }

  if (!options?.skipQualityCheck) {
    await validateImageQuality(file);
    if (options?.requireFace) {
      await validateClearFaceImage(file);
    }
  }

  if (options?.requireUserInPhoto) {
    if (!options.userReferenceUrl?.trim()) {
      throw new FaceMatchError(
        'NO_REFERENCE',
        'Add a clear profile photo first so we can verify you are in the picture.',
      );
    }
    await validateUserInPostPhoto(file, options.userReferenceUrl);
  }

  if (file.size <= maxBytes && file.type === 'image/webp') {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  let width = bitmap.width;
  let height = bitmap.height;
  const maxEdge = 1440;

  if (width > maxEdge || height > maxEdge) {
    const scale = maxEdge / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Could not process image');
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.88;
  let blob: Blob | null = null;

  while (quality >= 0.5) {
    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', quality);
    });
    if (blob && blob.size <= maxBytes) break;
    quality -= 0.08;
  }

  if (!blob || blob.size > maxBytes) {
    throw new Error('Photo is too large. Try a smaller image (max 3 MB).');
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
  return new File([blob], `${baseName}.webp`, { type: 'image/webp' });
}

export function assertVideoWithinLimit(file: File, maxBytes = MAX_CONTENT_BYTES): void {
  if (!file.type.startsWith('video/')) {
    throw new Error('Choose a video clip');
  }
  if (file.size > maxBytes) {
    throw new Error('Video must be 3 MB or smaller. Trim your clip and try again.');
  }
}

export async function captureVideoPoster(file: File): Promise<File | undefined> {
  const url = URL.createObjectURL(file);

  try {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error('Could not read video'));
    });

    video.currentTime = Math.min(0.5, video.duration / 2 || 0.5);
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
    });

    const canvas = document.createElement('canvas');
    canvas.width = Math.min(720, video.videoWidth || 720);
    canvas.height = Math.min(1280, video.videoHeight || 1280);
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', 0.82);
    });
    if (!blob) return undefined;

    return new File([blob], 'poster.webp', { type: 'image/webp' });
  } finally {
    URL.revokeObjectURL(url);
  }
}
