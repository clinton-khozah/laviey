import type { OnboardingQuizAnswers } from '@/types/domain/onboardingQuiz.types';
import type { OnboardingOptionDto, QuizOptionView } from '@/types/domain/onboardingCatalog.types';

export type QuizAnswerField = keyof Pick<
  OnboardingQuizAnswers,
  | 'purpose'
  | 'dateOfBirth'
  | 'agePreference'
  | 'interestedIn'
  | 'gender'
  | 'orientation'
  | 'religion'
  | 'interests'
>;

const STEP_TO_ANSWER_FIELD: Record<string, QuizAnswerField> = {
  purpose: 'purpose',
  age_preference: 'agePreference',
  interested_in: 'interestedIn',
  gender: 'gender',
  orientation: 'orientation',
  religion: 'religion',
  interests: 'interests',
  date_of_birth: 'dateOfBirth',
};

export function answerFieldForStepKey(stepKey: string): QuizAnswerField | null {
  return STEP_TO_ANSWER_FIELD[stepKey] ?? null;
}

export function isDenseGridStep(stepKey: string): boolean {
  return stepKey === 'interests' || stepKey === 'interested_in' || stepKey === 'age_preference';
}

export function toQuizOptionViews(options: OnboardingOptionDto[]): QuizOptionView[] {
  return options.map((opt) => ({
    value: opt.key,
    label: opt.label,
    hint: opt.hint,
    emoji: opt.emoji,
  }));
}
