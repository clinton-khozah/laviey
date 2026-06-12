const MAX_EDGE = 512;
const JPEG_QUALITY = 0.82;

/** Small JPEG for the vision-model compliment API — keeps uploads fast. */
export async function createComplimentThumbnail(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Could not prepare photo preview.');
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error('Could not prepare photo preview.'));
      },
      'image/jpeg',
      JPEG_QUALITY,
    );
  });

  return new File([blob], 'compliment.jpg', { type: 'image/jpeg' });
}
