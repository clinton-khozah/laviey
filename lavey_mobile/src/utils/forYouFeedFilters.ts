import type { Filters, GenderFilter } from "../screens/discover/components/FilterModal";
import { DEFAULT_DISCOVER_FILTERS } from "./discoverFiltersFromOnboarding";
import { hasCustomProfileAvatar } from "./discoverProfileReady";

export const GLOBAL_DISTANCE_KM = 500;

export function resolveForYouGenders(filters: Filters): GenderFilter[] {
  return filters.genders.length > 0 ? filters.genders : DEFAULT_DISCOVER_FILTERS.genders;
}

/** Default For You stays worldwide, and uses the gender chosen at signup until the member filters. */
export function buildForYouDiscoverParams(filters: Filters, manual = false) {
  const genders = resolveForYouGenders(filters);
  const genderParams = genders.length < 3 ? { genders: genders.join(",") } : {};
  if (!manual) {
    return {
      filter: "for-you" as const,
      expandDistance: true,
      ageMin: 18,
      ageMax: 99,
      verifiedOnly: false,
      hasProfilePhoto: false,
      limit: 50,
      ...genderParams,
    };
  }
  const global = filters.maxDistanceKm >= GLOBAL_DISTANCE_KM;
  return {
    filter: "for-you" as const,
    expandDistance: global,
    maxDistanceKm: global ? undefined : filters.maxDistanceKm,
    ageMin: filters.ageMin,
    ageMax: filters.ageMax,
    genders: resolveForYouGenders(filters).join(","),
    verifiedOnly: filters.verifiedOnly,
    hasProfilePhoto: filters.hasProfilePhoto,
    limit: 50,
  };
}

function normalizedGender(value?: string | null): GenderFilter | null {
  const key = String(value || "").trim().toLowerCase().replace(/[\s_-]/g, "");
  if (key === "woman" || key === "women" || key === "female") return "woman";
  if (key === "man" || key === "men" || key === "male") return "man";
  if (key === "nonbinary") return "nonbinary";
  return null;
}

type FilterableProfile = {
  gender?: string | null;
  age?: number;
  distanceKm?: number | null;
  verified?: boolean;
  avatar?: string;
};

/** Keeps the people who match the open filters, even when the server returns a wider list. */
export function applyForYouFeedFilters<T extends FilterableProfile>(
  profiles: T[],
  filters: Filters,
  manual = false,
): T[] {
  const genders = resolveForYouGenders(filters);
  const limitGender = genders.length > 0 && genders.length < 3;
  const limitDistance = manual && filters.maxDistanceKm < GLOBAL_DISTANCE_KM;
  return profiles.filter((profile) => {
    if (limitGender && !genders.includes(normalizedGender(profile.gender) as GenderFilter)) return false;
    if (!manual) return true;
    if (typeof profile.age === "number" && (profile.age < filters.ageMin || profile.age > filters.ageMax)) return false;
    if (limitDistance && !(typeof profile.distanceKm === "number" && profile.distanceKm <= filters.maxDistanceKm)) return false;
    if (filters.verifiedOnly && !profile.verified) return false;
    if (filters.hasProfilePhoto && !hasCustomProfileAvatar(profile.avatar)) return false;
    return true;
  });
}
