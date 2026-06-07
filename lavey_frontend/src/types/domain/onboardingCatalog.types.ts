export interface OnboardingOptionDto {
  key: string;
  label: string;
  hint: string;
  emoji: string;
  sortOrder: number;
}

export interface OnboardingQuestionDto {
  stepKey: string;
  kind: 'single' | 'multi' | 'input';
  sortOrder: number;
  heroEmoji: string;
  title: string;
  subtitle: string;
  minSelections: number | null;
  maxSelections: number | null;
  options: OnboardingOptionDto[];
}

export interface UserOnboardingStatusDto {
  completed: boolean;
  completedAt: string | null;
}

/** UI-friendly option shape used by the quiz page. */
export interface QuizOptionView {
  value: string;
  label: string;
  hint: string;
  emoji: string;
}
