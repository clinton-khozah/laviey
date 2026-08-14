import type { Filters, GenderFilter } from "../screens/discover/components/FilterModal";
import { ensureNonBinaryIncluded } from "./forYouFeedFilters";

const AGE_BOUNDS: Record<string, { min: number; max: number }> = {
  "18-24": { min: 18, max: 24 },
  "25-29": { min: 25, max: 29 },
  "30-34": { min: 30, max: 34 },
  "35-39": { min: 35, max: 39 },
  "40-44": { min: 40, max: 44 },
  "45+": { min: 45, max: 70 },
  "open-all": { min: 18, max: 70 },
};

export const DEFAULT_DISCOVER_FILTERS: Filters = {
  verifiedOnly: false,
  hasProfilePhoto: true,
  maxDistanceKm: 500,
  ageMin: 18,
  ageMax: 70,
  genders: ["woman", "man", "nonbinary"],
};

export type MobileOnboardingQuizSnapshot = {
  interestedIn: string;
  agePreference: string;
  gender?: string;
  orientation?: string;
};

function splitKeys(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function inferGendersFromIdentity(gender: string, orientation: string): GenderFilter[] {
  if (gender === "man") {
    if (orientation === "gay" || orientation === "lesbian") return ["man"];
    if (orientation === "bisexual" || orientation === "pansexual" || orientation === "queer") {
      return ["woman", "man", "nonbinary"];
    }
    return ["woman"];
  }

  if (gender === "woman") {
    if (orientation === "gay" || orientation === "lesbian") return ["woman"];
    if (orientation === "bisexual" || orientation === "pansexual" || orientation === "queer") {
      return ["woman", "man", "nonbinary"];
    }
    return ["man"];
  }

  return DEFAULT_DISCOVER_FILTERS.genders;
}

export function gendersFromInterestedIn(
  interestedIn: string,
  gender?: string,
  orientation?: string,
): GenderFilter[] {
  const keys = splitKeys(interestedIn);
  if (keys.includes("everyone")) return ["woman", "man", "nonbinary"];

  const genders: GenderFilter[] = [];
  if (keys.includes("women")) genders.push("woman");
  if (keys.includes("men")) genders.push("man");
  if (keys.includes("nonbinary")) genders.push("nonbinary");

  if (genders.length > 0) return ensureNonBinaryIncluded(genders);

  if (gender && orientation) return ensureNonBinaryIncluded(inferGendersFromIdentity(gender, orientation));
  return DEFAULT_DISCOVER_FILTERS.genders;
}

export function ageRangeFromPreferences(agePreference: string): { ageMin: number; ageMax: number } {
  const preferences = splitKeys(agePreference);
  if (!preferences.length || preferences.includes("open-all")) {
    return { ageMin: DEFAULT_DISCOVER_FILTERS.ageMin, ageMax: DEFAULT_DISCOVER_FILTERS.ageMax };
  }

  let ageMin = 70;
  let ageMax = 18;

  for (const pref of preferences) {
    const bounds = AGE_BOUNDS[pref];
    if (!bounds) continue;
    ageMin = Math.min(ageMin, bounds.min);
    ageMax = Math.max(ageMax, bounds.max);
  }

  return {
    ageMin: Math.max(18, ageMin),
    ageMax: Math.min(70, ageMax),
  };
}

export function discoverFiltersFromOnboarding(quiz: MobileOnboardingQuizSnapshot): Filters {
  return {
    ...DEFAULT_DISCOVER_FILTERS,
    genders: gendersFromInterestedIn(quiz.interestedIn, quiz.gender, quiz.orientation),
  };
}
