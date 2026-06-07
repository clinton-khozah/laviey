import type { DiscoverFilters, FeedFilter, Profile } from '@/types';
import {
  filterProfilesByDistanceCap,
  resolveDistanceCapKm,
  sortProfilesByDistance,
} from './discoverDistanceTiers';

/** Age + gender only — distance tiers are handled by the discover feed loader / API. */
export function applyDiscoverDemographicFilters(
  profiles: Profile[],
  filters: DiscoverFilters,
): Profile[] {
  return profiles.filter((profile) => {
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
