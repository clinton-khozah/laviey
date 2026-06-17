import type { DiscoverFilters, FeedFilter, Profile } from '@/types';
import {
  filterProfilesByDistanceCap,
  resolveDistanceCapKm,
  sortProfilesByDistance,
} from './discoverDistanceTiers';

/** Age + gender + optional verified — distance tiers are handled by the discover feed loader / API. */
export function applyDiscoverDemographicFilters(
  profiles: Profile[],
  filters: DiscoverFilters,
): Profile[] {
  return profiles.filter((profile) => {
    if (filters.verifiedOnly && !profile.verified) return false;
    if (profile.age < filters.ageMin || profile.age > filters.ageMax) return false;
    if (
      filters.genders.length > 0 &&
      profile.gender &&
      !filters.genders.includes(profile.gender)
    ) {
      return false;
    }
    return true;
  });
}

/** Age + gender for For You — relaxes filters when they would hide every profile. */
export function applyForYouFeedFilters(
  profiles: Profile[],
  filters: DiscoverFilters,
): Profile[] {
  const filtered = applyDiscoverDemographicFilters(profiles, filters);
  if (filtered.length > 0 || profiles.length === 0) return filtered;

  if (filters.verifiedOnly) return filtered;

  if (filters.genders.length > 0) {
    const withoutGender = applyDiscoverDemographicFilters(profiles, {
      ...filters,
      genders: [],
    });
    if (withoutGender.length > 0) return withoutGender;
  }

  return profiles;
}

/** Client-side distance pass for mock API and legacy callers. */
export function applyDiscoverFilters(
  profiles: Profile[],
  filters: DiscoverFilters,
  feedFilter: FeedFilter,
  options?: {
    distanceTierKm?: number | null;
    expandedDistance?: boolean;
  },
): Profile[] {
  const demographic = applyDiscoverDemographicFilters(profiles, filters);
  const maxKm = resolveDistanceCapKm({
    feedFilter,
    distanceTierKm: options?.distanceTierKm ?? null,
    expandedDistance: options?.expandedDistance ?? false,
    maxDistanceKm: filters.maxDistanceKm,
  });
  const filtered = filterProfilesByDistanceCap(demographic, maxKm);

  if (feedFilter === 'nearby') {
    return sortProfilesByDistance(filtered);
  }

  return filtered;
}
