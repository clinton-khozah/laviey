/** Portrait crop frame used when posting (4:5, mobile-style). */
export const POST_PHOTO_FRAME_WIDTH = 224;
export const POST_PHOTO_FRAME_HEIGHT = 280;

export const POST_EXPORT_WIDTH = 1080;
export const POST_EXPORT_HEIGHT = 1350;

/** Typical phone feed card aspect (height / width). */
export const FEED_PREVIEW_ASPECT = 19.5 / 9;

export function isLandscapePhoto(width: number, height: number): boolean {
  return width > height;
}

export function getFeedImageFit(
  imageWidth: number,
  imageHeight: number,
  containerAspect: number = FEED_PREVIEW_ASPECT,
): 'cover' | 'contain' {
  if (imageWidth <= 0 || imageHeight <= 0) return 'cover';
  const imageAspect = imageHeight / imageWidth;
  return imageAspect >= containerAspect ? 'cover' : 'contain';
}
