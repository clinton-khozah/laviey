import { normalizeMeetupCode } from '@/utils/meeting/meetupAccess';

export const MEETUP_JOIN_PATH = '/join';
export const PENDING_MEETUP_CODE_KEY = 'lavey:pendingMeetupCode';
const LEGACY_PENDING_CODE_KEY = 'lavey:adminJoinCode';

/** Full URL others can open to join this meetup (includes room code). */
export function buildMeetupJoinLink(accessCode: string, origin = window.location.origin): string {
  const code = normalizeMeetupCode(accessCode);
  const url = new URL(MEETUP_JOIN_PATH, origin);
  url.searchParams.set('code', code);
  return url.toString();
}

export function parseMeetupJoinCode(search: string): string | null {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  const raw = params.get('code')?.trim();
  return raw ? normalizeMeetupCode(raw) : null;
}

export function isMeetupJoinPath(pathname: string): boolean {
  return pathname === MEETUP_JOIN_PATH || pathname === `${MEETUP_JOIN_PATH}/`;
}

export function storePendingMeetupCode(code: string): void {
  try {
    window.sessionStorage.setItem(PENDING_MEETUP_CODE_KEY, normalizeMeetupCode(code));
    window.sessionStorage.setItem('lavey:adminTargetNav', 'rooms');
  } catch {
    /* ignore */
  }
}

export function consumePendingMeetupCode(): string | null {
  for (const key of [PENDING_MEETUP_CODE_KEY, LEGACY_PENDING_CODE_KEY]) {
    try {
      const raw = window.sessionStorage.getItem(key);
      if (!raw) continue;
      window.sessionStorage.removeItem(key);
      return normalizeMeetupCode(raw);
    } catch {
      /* ignore */
    }
  }
  return null;
}
