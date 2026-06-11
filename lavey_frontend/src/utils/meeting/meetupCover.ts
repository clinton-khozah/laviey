import { MOCK_FEED_IMAGES } from '@/constants/mockMedia';

const MOCK_COVER_URLS = new Set<string>(MOCK_FEED_IMAGES);

/** True when the meetup has a real uploaded cover (not empty or a mock placeholder path). */
export function resolveMeetupCover(url?: string | null): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  if (MOCK_COVER_URLS.has(trimmed)) return undefined;
  if (trimmed.startsWith('/images/templates/') || trimmed.includes('/images/post-template')) {
    return undefined;
  }
  return trimmed;
}

export function hasMeetupCover(url?: string | null): boolean {
  return Boolean(resolveMeetupCover(url));
}
