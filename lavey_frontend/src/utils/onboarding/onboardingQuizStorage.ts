import type { OnboardingQuizAnswers } from '@/types/domain/onboardingQuiz.types';

const STORAGE_KEY = 'lavey_onboarding_quiz';

export function saveOnboardingQuizAnswers(answers: OnboardingQuizAnswers): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadOnboardingQuizAnswers(): OnboardingQuizAnswers | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingQuizAnswers;
  } catch {
    return null;
  }
}
