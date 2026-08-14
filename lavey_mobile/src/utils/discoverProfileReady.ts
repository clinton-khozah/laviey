import type { ProfilePost } from "../types";

/** OAuth sign-in avatars (Google, etc.) don't count as an uploaded profile photo. */
export function isOAuthAvatar(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes("googleusercontent.com") ||
    lower.includes("ggpht.com") ||
    lower.includes("graph.facebook.com") ||
    lower.includes("fbcdn.net")
  );
}

export function hasCustomProfileAvatar(url?: string): boolean {
  if (!url?.trim()) return false;
  if (isOAuthAvatar(url)) return false;
  return true;
}

export function hasAtLeastOnePost(posts?: ProfilePost[]): boolean {
  return (posts?.length ?? 0) >= 1;
}

/** For You unlocks after profile photo + at least one profile moment (photo/clip) — mirrors the web app. */
export function isDiscoverProfileReady(avatarUrl?: string, posts?: ProfilePost[]): boolean {
  return hasCustomProfileAvatar(avatarUrl) && hasAtLeastOnePost(posts);
}
