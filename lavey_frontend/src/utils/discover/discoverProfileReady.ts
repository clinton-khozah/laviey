import { defaultAvatar } from '@/constants/defaultAvatar';
import type { ProfilePost } from '@/types';
import { isPlaceholderMediaUrl } from '@/utils/profile/feedMedia';

/** OAuth sign-in avatars (Google, Facebook, etc.) are not treated as uploaded profile photos. */
export function isOAuthProviderAvatar(avatarUrl: string): boolean {
  const lower = avatarUrl.toLowerCase();
  return (
    lower.includes('googleusercontent.com') ||
    lower.includes('ggpht.com') ||
    lower.includes('graph.facebook.com') ||
    lower.includes('platform-lookaside.fbsbx.com') ||
    lower.includes('fbcdn.net') ||
    lower.includes('apple-cdn.com') ||
    lower.includes('appleid.apple.com')
  );
}

/** True when the user uploaded a real profile photo (not the default placeholder or OAuth avatar). */
export function hasCustomProfileAvatar(avatarUrl?: string): boolean {
  if (!avatarUrl?.trim()) return false;
  if (avatarUrl === defaultAvatar) return false;
  if (isOAuthProviderAvatar(avatarUrl)) return false;
  if (isPlaceholderMediaUrl(avatarUrl)) return false;
  return true;
}

export function hasAtLeastOnePost(posts: ProfilePost[] | undefined): boolean {
  return (posts?.length ?? 0) >= 1;
}

/** Discover unlocks after profile photo + at least one profile moment (photo/clip). */
export function isDiscoverProfileReady(
  avatarUrl: string | undefined,
  posts: ProfilePost[] | undefined,
): boolean {
  return hasCustomProfileAvatar(avatarUrl) && hasAtLeastOnePost(posts);
}
