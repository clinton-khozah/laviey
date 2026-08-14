import type { Filters, GenderFilter } from "../screens/discover/components/FilterModal";
import { DEFAULT_DISCOVER_FILTERS } from "./discoverFiltersFromOnboarding";

export const GLOBAL_DISTANCE_KM = 500;

export function ensureNonBinaryIncluded(genders: GenderFilter[]): GenderFilter[] {
  if (genders.length === 0) return DEFAULT_DISCOVER_FILTERS.genders;
  if (genders.includes("nonbinary") || genders.length >= 3) return genders;
  return [...genders, "nonbinary"];
}

export function resolveForYouGenders(filters: Filters): GenderFilter[] {
  return ensureNonBinaryIncluded(filters.genders);
}

/** For You — worldwide, any age; gender (+ non-binary) and profile-photo preference. */
export function buildForYouDiscoverParams(filters: Filters) {
  return {
    filter: "for-you" as const,
    expandDistance: true,
    maxDistanceKm: GLOBAL_DISTANCE_KM,
    ageMin: DEFAULT_DISCOVER_FILTERS.ageMin,
    ageMax: DEFAULT_DISCOVER_FILTERS.ageMax,
    genders: resolveForYouGenders(filters).join(","),
    verifiedOnly: filters.verifiedOnly,
    hasProfilePhoto: filters.hasProfilePhoto,
  };
}

export function applyForYouGenderFilter<T extends { gender?: string | null }>(
  profiles: T[],
  filters: Filters,
): T[] {
  const genders = resolveForYouGenders(filters);
  return profiles.filter((profile) => profile.gender && genders.includes(profile.gender as GenderFilter));
}
