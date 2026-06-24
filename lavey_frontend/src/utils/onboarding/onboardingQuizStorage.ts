import type { OnboardingQuizAnswers } from '@/types/domain/onboardingQuiz.types';

const STORAGE_KEY = 'lavey_onboarding_quiz';

function storageKey(userId?: string): string {
  return userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
}

export function saveOnboardingQuizAnswers(answers: OnboardingQuizAnswers, userId?: string): void {
  try {
    const key = storageKey(userId);
    localStorage.setItem(key, JSON.stringify(answers));
    if (userId) {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadOnboardingQuizAnswers(userId?: string): OnboardingQuizAnswers | null {
  try {
    if (userId) {
      const scoped = localStorage.getItem(storageKey(userId));
      if (scoped) return JSON.parse(scoped) as OnboardingQuizAnswers;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingQuizAnswers;
  } catch {
    return null;
  }
}

/** Removes cached quiz answers (legacy global key and per-user keys). */
export function clearOnboardingQuizAnswers(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key === STORAGE_KEY || key?.startsWith(`${STORAGE_KEY}:`)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    /* ignore */
  }
}
