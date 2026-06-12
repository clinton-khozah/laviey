export interface PhotoCropTransform {
  /** Multiplier on top of the base cover scale (1 = fill frame). */
  scale: number;
  offsetX: number;
  offsetY: number;
}

export const DEFAULT_CROP_TRANSFORM: PhotoCropTransform = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

export function coverBaseScale(
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
): number {
  if (imageWidth <= 0 || imageHeight <= 0 || frameWidth <= 0 || frameHeight <= 0) return 1;
  return Math.max(frameWidth / imageWidth, frameHeight / imageHeight);
}

export function drawCoverImageWithTransform(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  frameX: number,
  frameY: number,
  frameWidth: number,
  frameHeight: number,
  transform: PhotoCropTransform,
): void {
  const iw = image.naturalWidth;
  const ih = image.naturalHeight;
  if (iw === 0 || ih === 0) return;

  const base = coverBaseScale(iw, ih, frameWidth, frameHeight);
  const scale = base * transform.scale;
  const drawW = iw * scale;
  const drawH = ih * scale;
  const centerX = frameX + frameWidth / 2 + transform.offsetX;
  const centerY = frameY + frameHeight / 2 + transform.offsetY;

  ctx.drawImage(image, centerX - drawW / 2, centerY - drawH / 2, drawW, drawH);
}

export function getCropPreviewLayout(
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
  transform: PhotoCropTransform,
): { width: number; height: number; left: number; top: number } {
  const base = coverBaseScale(imageWidth, imageHeight, frameWidth, frameHeight);
  const scale = base * transform.scale;
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return {
    width,
    height,
    left: (frameWidth - width) / 2 + transform.offsetX,
    top: (frameHeight - height) / 2 + transform.offsetY,
  };
}
