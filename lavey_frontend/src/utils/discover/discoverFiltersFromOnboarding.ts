import { DISCOVER_AGE } from "@/constants/discoverFilter";
import {
  DEFAULT_DISCOVER_FILTERS,
  type DiscoverFilters,
  type DiscoverGender,
} from "@/types";
import type {
  OnboardingAgePreference,
  OnboardingGender,
  OnboardingInterestedIn,
  OnboardingOrientation,
  OnboardingQuizAnswers,
} from "@/types/domain/onboardingQuiz.types";

const AGE_BOUNDS: Record<
  OnboardingAgePreference,
  { min: number; max: number }
> = {
  "18-24": { min: 18, max: 24 },
  "25-29": { min: 25, max: 29 },
  "30-34": { min: 30, max: 34 },
  "35-39": { min: 35, max: 39 },
  "40-44": { min: 40, max: 44 },
  "45+": { min: 45, max: DISCOVER_AGE.max },
  "open-all": { min: DISCOVER_AGE.min, max: DISCOVER_AGE.max },
};

function inferGendersFromIdentity(
  gender: OnboardingGender,
  orientation: OnboardingOrientation,
): DiscoverGender[] {
  if (gender === "man") {
    if (orientation === "gay" || orientation === "lesbian") {
      return ["man"];
    }
    if (
      orientation === "bisexual" ||
      orientation === "pansexual" ||
      orientation === "queer"
    ) {
      return ["woman", "man", "nonbinary"];
    }
    return ["woman"];
  }

  if (gender === "woman") {
    if (orientation === "gay" || orientation === "lesbian") {
      return ["woman"];
    }
    if (
      orientation === "bisexual" ||
      orientation === "pansexual" ||
      orientation === "queer"
    ) {
      return ["woman", "man", "nonbinary"];
    }
    return ["man"];
  }

  return DEFAULT_DISCOVER_FILTERS.genders;
}

export function gendersFromInterestedIn(
  interestedIn: OnboardingInterestedIn[],
  gender?: OnboardingGender,
  orientation?: OnboardingOrientation,
): DiscoverGender[] {
  if (interestedIn.includes("everyone")) {
    return ["woman", "man", "nonbinary"];
  }

  const genders: DiscoverGender[] = [];
  if (interestedIn.includes("women")) genders.push("woman");
  if (interestedIn.includes("men")) genders.push("man");
  if (interestedIn.includes("nonbinary")) genders.push("nonbinary");

  if (genders.length > 0) return genders;

  if (gender && orientation) {
    return inferGendersFromIdentity(gender, orientation);
  }

  return DEFAULT_DISCOVER_FILTERS.genders;
}

export function ageRangeFromPreferences(
  preferences: OnboardingAgePreference[],
): {
  ageMin: number;
  ageMax: number;
} {
  if (!preferences.length || preferences.includes("open-all")) {
    return {
      ageMin: DEFAULT_DISCOVER_FILTERS.ageMin,
      ageMax: DEFAULT_DISCOVER_FILTERS.ageMax,
    };
  }

  let ageMin: number = DISCOVER_AGE.max;
  let ageMax: number = DISCOVER_AGE.min;

  for (const pref of preferences) {
    const bounds = AGE_BOUNDS[pref];
    if (!bounds) continue;
    ageMin = Math.min(ageMin, bounds.min);
    ageMax = Math.max(ageMax, bounds.max);
  }

  return {
    ageMin: Math.max(DISCOVER_AGE.min, ageMin),
    ageMax: Math.min(DISCOVER_AGE.max, ageMax),
  };
}

export function discoverFiltersFromOnboarding(
  answers: OnboardingQuizAnswers,
): DiscoverFilters {
  const { ageMin, ageMax } = ageRangeFromPreferences(answers.agePreference);

  return {
    ...DEFAULT_DISCOVER_FILTERS,
    genders: gendersFromInterestedIn(
      answers.interestedIn,
      answers.gender,
      answers.orientation,
    ),
    ageMin,
    ageMax,
  };
}
