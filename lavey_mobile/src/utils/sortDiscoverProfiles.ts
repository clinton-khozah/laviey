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

/**
 * For You feed — online members first, then new members, then everyone else
 * (most recently active / newest within each group).
 */
export function sortForYouFeedProfiles(profiles: Profile[]): Profile[] {
  const now = Date.now();
  return [...profiles].sort((a, b) => {
    const aOnline = isProfileOnlineNow(a, now);
    const bOnline = isProfileOnlineNow(b, now);
    if (aOnline !== bOnline) return Number(bOnline) - Number(aOnline);

    const aNew = isNewMemberProfile(a, now);
    const bNew = isNewMemberProfile(b, now);
    if (aNew !== bNew) return Number(bNew) - Number(aNew);

    const activeDiff = profileActiveMs(b) - profileActiveMs(a);
    if (activeDiff !== 0) return activeDiff;

    return profileCreatedMs(b) - profileCreatedMs(a);
  });
}
