import type { Profile } from '@/types';

/** Collect display URLs for a match profile photo carousel */
export function getProfilePhotoUrls(profile: Profile): string[] {
  const urls: string[] = [];
  const add = (url: string | undefined) => {
    if (!url) return;
    const hiRes = url.replace(/w=\d+/g, 'w=1080').replace(/h=\d+/g, 'h=1440');
    if (!urls.includes(hiRes)) urls.push(hiRes);
  };

  add(profile.avatar);
  for (const post of profile.posts) {
    add(post.type === 'image' ? post.src : post.poster);
  }

  return urls;
}
