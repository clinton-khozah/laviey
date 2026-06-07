import type { ProfilePost } from '@/types';

export async function downloadPostToDevice(post: ProfilePost): Promise<void> {
  const url = post.src;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Could not download this post');
  }

  const blob = await response.blob();
  const ext = post.type === 'video' ? 'mp4' : 'webp';
  const objectUrl = URL.createObjectURL(blob);

  try {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = `lavey-post-${post.id}.${ext}`;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function copyPostLink(post: ProfilePost): Promise<void> {
  await navigator.clipboard.writeText(post.src);
}
