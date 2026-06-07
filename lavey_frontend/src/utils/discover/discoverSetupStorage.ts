const SKIP_PREFIX = 'lavey_discover_setup_skipped_';
const FINISHED_PREFIX = 'lavey_discover_setup_finished_';
const PEEK_PREFIX = 'lavey_discover_setup_peek_';

export function hasSkippedDiscoverSetup(userId: string): boolean {
  try {
    return localStorage.getItem(`${SKIP_PREFIX}${userId}`) === '1';
  } catch {
    return false;
  }
}

export function markDiscoverSetupSkipped(userId: string): void {
  localStorage.setItem(`${SKIP_PREFIX}${userId}`, '1');
}

export function clearDiscoverSetupSkipped(userId: string): void {
  localStorage.removeItem(`${SKIP_PREFIX}${userId}`);
}

export function hasFinishedDiscoverSetup(userId: string): boolean {
  try {
    return localStorage.getItem(`${FINISHED_PREFIX}${userId}`) === '1';
  } catch {
    return false;
  }
}

export function markDiscoverSetupFinished(userId: string): void {
  localStorage.setItem(`${FINISHED_PREFIX}${userId}`, '1');
}

/** User has already seen the brief For You preview before the setup prompt. */
export function hasSeenDiscoverFeedPeek(userId: string): boolean {
  try {
    return localStorage.getItem(`${PEEK_PREFIX}${userId}`) === '1';
  } catch {
    return false;
  }
}

export function markDiscoverFeedPeek(userId: string): void {
  localStorage.setItem(`${PEEK_PREFIX}${userId}`, '1');
}
