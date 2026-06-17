import type { Profile } from '@/types';
import { hasCustomProfileAvatar } from '@/utils/discover/discoverProfileReady';
import { hasFeedDisplayMedia } from '@/utils/profile/feedMedia';

/** Collect display URLs for a match profile photo carousel */
export function getProfilePhotoUrls(profile: Profile): string[] {
  const urls: string[] = [];
  const add = (url: string | undefined) => {
    if (!url || !hasFeedDisplayMedia(url)) return;
    const hiRes = url.replace(/w=\d+/g, 'w=1080').replace(/h=\d+/g, 'h=1440');
    if (!urls.includes(hiRes)) urls.push(hiRes);
  };

  if (hasCustomProfileAvatar(profile.avatar)) {
    add(profile.avatar);
  }
  for (const post of profile.posts) {
    if (post.type === 'image') add(post.src);
    else add(post.poster);
  }

  return urls;
}
