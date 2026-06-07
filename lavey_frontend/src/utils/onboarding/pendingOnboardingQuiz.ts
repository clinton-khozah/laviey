import { STORAGE_KEYS } from '@/constants/storageKeys';

/** Set before Google OAuth redirect; read after callback reload. */
export function markPendingOnboardingQuiz(): void {
  sessionStorage.setItem(STORAGE_KEYS.pendingOnboardingQuiz, '1');
}

export function consumePendingOnboardingQuiz(): boolean {
  const pending = sessionStorage.getItem(STORAGE_KEYS.pendingOnboardingQuiz) === '1';
  if (pending) {
    sessionStorage.removeItem(STORAGE_KEYS.pendingOnboardingQuiz);
  }
  return pending;
}

export function clearPendingOnboardingQuiz(): void {
  sessionStorage.removeItem(STORAGE_KEYS.pendingOnboardingQuiz);
}
