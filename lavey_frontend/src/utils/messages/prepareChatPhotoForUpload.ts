import { prepareImageForUpload, MAX_CONTENT_BYTES } from '@/utils/media/prepareUploadMedia';

/** Prepare a chat photo — images only, safety checks, no video. */
export async function prepareChatPhotoForUpload(file: File): Promise<File> {
  if (file.type.startsWith('video/')) {
    throw new Error('Videos are not allowed in chat — send a photo instead.');
  }
  return prepareImageForUpload(file, MAX_CONTENT_BYTES);
}
