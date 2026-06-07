export const CONTENT_BUCKET = 'content';

/** Max photos on a user's profile timeline */
export const MAX_PROFILE_POSTS = 5;

/** 3 MB — matches Supabase bucket file_size_limit */
export const MAX_CONTENT_BYTES = 3 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const ALLOWED_VIDEO_MIME = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

export function avatarStoragePath(userId: string): string {
  return `users/${userId}/avatar/main.webp`;
}

export function postMediaStoragePath(userId: string, postId: string, ext: string): string {
  return `users/${userId}/posts/${postId}/media.${ext}`;
}

export function postPosterStoragePath(userId: string, postId: string): string {
  return `users/${userId}/posts/${postId}/poster.webp`;
}

export function extensionForMime(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'video/mp4':
      return 'mp4';
    case 'video/webm':
      return 'webm';
    case 'video/quicktime':
      return 'mov';
    default:
      return 'bin';
  }
}
