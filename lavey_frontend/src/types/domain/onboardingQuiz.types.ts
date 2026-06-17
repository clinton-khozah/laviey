export type OnboardingPurpose = 'dating' | 'friendship' | 'both';
export type OnboardingVibe = 'chill' | 'bold' | 'fun';

export type OnboardingAgePreference =
  | '18-24'
  | '25-29'
  | '30-34'
  | '35-39'
  | '40-44'
  | '45+'
  | 'open-all';

export type OnboardingInterestedIn = 'men' | 'women' | 'nonbinary' | 'everyone';

export type OnboardingGender = 'man' | 'woman' | 'nonbinary' | 'prefer-not-to-say';

export type OnboardingOrientation =
  | 'straight'
  | 'gay'
  | 'lesbian'
  | 'bisexual'
  | 'pansexual'
  | 'queer'
  | 'prefer-not-to-say';

export type OnboardingReligion =
  | 'christian'
  | 'muslim'
  | 'hindu'
  | 'buddhist'
  | 'jewish'
  | 'spiritual'
  | 'agnostic'
  | 'atheist'
  | 'other'
  | 'prefer-not-to-say';

export type OnboardingInterest =
  | 'travel'
  | 'shopping'
  | 'fitness'
  | 'music'
  | 'food'
  | 'nightlife'
  | 'gaming'
  | 'reading'
  | 'art'
  | 'outdoors'
  | 'pets'
  | 'tech'
  | 'movies'
  | 'wellness';

/** Device location captured during onboarding for proximity matching. */
export interface UserLocationSnapshot {
  latitude: number;
  longitude: number;
  country: string;
  province: string;
  city: string;
  suburb: string;
}

/** Snapshot collected during onboarding — used for matching & product insights. */
export interface OnboardingQuizAnswers {
  purpose: OnboardingPurpose;
  vibe: OnboardingVibe;
  /** ISO date string in YYYY-MM-DD form (from <input type="date">). */
  dateOfBirth: string;
  agePreference: OnboardingAgePreference[];
  interestedIn: OnboardingInterestedIn[];
  gender: OnboardingGender;
  orientation: OnboardingOrientation;
  religion: OnboardingReligion;
  interests: OnboardingInterest[];
  location: UserLocationSnapshot;
  completedAt: string;
}
