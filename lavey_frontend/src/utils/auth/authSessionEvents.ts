import { STORAGE_KEYS } from '@/constants/storageKeys';

export const SESSION_EXPIRED_EVENT = 'lavey:session-expired';

export function clearStoredAuthSession(): void {
  localStorage.removeItem(STORAGE_KEYS.authToken);
  localStorage.removeItem(STORAGE_KEYS.authUser);
}

export function emitSessionExpired(): void {
  clearStoredAuthSession();
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}
