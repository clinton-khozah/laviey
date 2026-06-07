import { STORAGE_KEYS } from '@/constants/storageKeys';

export function hasSeenDiscoverSwipeHint(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.discoverSwipeHintSeen) === '1';
  } catch {
    return false;
  }
}

export function markDiscoverSwipeHintSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.discoverSwipeHintSeen, '1');
  } catch {
    /* storage unavailable */
  }
}
