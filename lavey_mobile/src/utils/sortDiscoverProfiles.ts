import type { Profile } from "../types";

const ONLINE_WINDOW_MS = 15 * 60 * 1000;
const NEW_MEMBER_WINDOW_MS = 21 * 24 * 60 * 60 * 1000;

function profileCreatedMs(profile: Profile): number {
  if (!profile.createdAt) return 0;
  const ms = new Date(profile.createdAt).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function profileActiveMs(profile: Profile): number {
  if (!profile.lastActiveAt) return 0;
  const ms = new Date(profile.lastActiveAt).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

export function isProfileOnlineNow(profile: Profile, now = Date.now()): boolean {
  if (profile.isOnline) return true;
  const activeMs = profileActiveMs(profile);
  return activeMs > 0 && now - activeMs <= ONLINE_WINDOW_MS;
}

export function isNewMemberProfile(profile: Profile, now = Date.now()): boolean {
  const createdMs = profileCreatedMs(profile);
  return createdMs > 0 && now - createdMs <= NEW_MEMBER_WINDOW_MS;
}

/** Discovery lists — newest members first. */
export function sortProfilesNewestFirst(profiles: Profile[]): Profile[] {
  return [...profiles].sort((a, b) => profileCreatedMs(b) - profileCreatedMs(a));
}

function profileRecentMs(profile: Profile): number {
  return Math.max(profileCreatedMs(profile), profileActiveMs(profile));
}

/**
 * For You — people who joined recently come first (newest first).
 * After that group, everyone else follows by most recent date.
 */
export function sortForYouFeedProfiles(profiles: Profile[]): Profile[] {
  const now = Date.now();
  return [...profiles].sort((a, b) => {
    const aNew = isNewMemberProfile(a, now);
    const bNew = isNewMemberProfile(b, now);
    if (aNew !== bNew) return Number(bNew) - Number(aNew);
    if (aNew && bNew) return profileCreatedMs(b) - profileCreatedMs(a);
    const recentDiff = profileRecentMs(b) - profileRecentMs(a);
    if (recentDiff !== 0) return recentDiff;
    return profileCreatedMs(b) - profileCreatedMs(a);
  });
}
