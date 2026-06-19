const STORAGE_PREFIX = 'lavey_meetup_participant';

/** Stable per-tab id for meetup presence and WebRTC signaling. */
export function getMeetupParticipantId(
  authUserId: string | undefined,
  meetupId: string,
): string {
  if (authUserId) return authUserId;

  const storageKey = `${STORAGE_PREFIX}:${meetupId}`;
  try {
    const existing = sessionStorage.getItem(storageKey);
    if (existing) return existing;
    const guestId = `guest-${meetupId}-${crypto.randomUUID()}`;
    sessionStorage.setItem(storageKey, guestId);
    return guestId;
  } catch {
    return `guest-${meetupId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}
