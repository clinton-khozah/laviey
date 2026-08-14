// Static UI text for OnboardingQuizScreen.tsx, translated via useTranslatedStrings.
// The quiz's per-step question titles/subtitles/option labels come from the backend
// (onboarding_questions/onboarding_options) and are translated separately, dynamically,
// alongside this fixed list — see the `dynamicStrings` construction in the component.
export const ONBOARDING_QUIZ_STRINGS = [
  "Retry",
  "Couldn't load the quiz",
  "Display name",
  "What should we call you?",
  "You signed in with Google — pick the name your matches will see.",
  "Your preferred name",
  "Tell us about you",
  "A short bio helps your matches know what makes you, you. You can always change this later.",
  "I'm probably talking about...",
  "Don't be shy",
  "Enter Lavey",
  "Continue",
  "Skip for now",
  "minimum selected",
] as const;
