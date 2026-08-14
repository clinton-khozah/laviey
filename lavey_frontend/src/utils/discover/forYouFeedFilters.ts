import {
  DISCOVER_AGE,
  DISCOVER_DISTANCE_GLOBAL_KM,
} from '@/constants/discoverFilter';
import type { DiscoverFilters, DiscoverGender, Profile } from '@/types';

export function ensureNonBinaryIncluded(
  genders: DiscoverGender[],
): DiscoverGender[] {
  if (genders.length === 0) return ['woman', 'man', 'nonbinary'];
  if (genders.includes('nonbinary') || genders.length >= 3) return genders;
  return [...genders, 'nonbinary'];
}

export function resolveForYouGenderFilters(
  filters: DiscoverFilters,
): DiscoverGender[] {
  return ensureNonBinaryIncluded(filters.genders);
}

/** For You API requests — worldwide, any age; gender (+ non-binary) and profile-photo preference. */
export function buildForYouApiFilters(filters: DiscoverFilters): {
  expandDistance: true;
  maxDistanceKm: number;
  ageMin: number;
  ageMax: number;
  genders: DiscoverGender[];
  verifiedOnly: boolean;
  hasProfilePhoto: boolean;
} {
  return {
    expandDistance: true,
    maxDistanceKm: DISCOVER_DISTANCE_GLOBAL_KM,
    ageMin: DISCOVER_AGE.min,
    ageMax: DISCOVER_AGE.max,
    genders: resolveForYouGenderFilters(filters),
    verifiedOnly: filters.verifiedOnly,
    hasProfilePhoto: filters.hasProfilePhoto,
  };
}

/** Client-side For You pass — gender (+ non-binary) only. */
export function applyForYouGenderFilters(
  profiles: Profile[],
  filters: DiscoverFilters,
): Profile[] {
  const genders = resolveForYouGenderFilters(filters);
  if (genders.length === 0) return profiles;

  return profiles.filter(
    (profile) => profile.gender && genders.includes(profile.gender),
  );
}
