/** Onboarding quiz hero illustrations — shared by quiz and profile preview. */
export const QUIZ_HERO_IMAGES = {
  purpose: require("../../assets/what-are-you-here-for.png"),
  age_preference: require("../../assets/age-range.png"),
  interested_in: require("../../assets/who-you-interested-in.png"),
  gender: require("../../assets/how-do.png"),
  orientation: require("../../assets/myself.png"),
  religion: require("../../assets/your-religion.png"),
  interests: require("../../assets/What-are-you-into.png"),
  languages: require("../../assets/languages.png"),
  date_of_birth: require("../../assets/your age.png"),
  location: require("../../assets/location.png"),
  bio: require("../../assets/bio.png"),
} as const;

export type QuizHeroStepKey = keyof typeof QUIZ_HERO_IMAGES;
