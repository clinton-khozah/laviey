import type { DiscoverFilters, FeedFilter, Profile } from '@/types';
import { hasCustomProfileAvatar } from '@/utils/discover/discoverProfileReady';
import {
  filterProfilesByDistanceCap,
  resolveDistanceCapKm,
  sortProfilesByDistance,
} from './discoverDistanceTiers';

function hasProfilePhoto(profile: Profile): boolean {
  return hasCustomProfileAvatar(profile.avatar);
}

/** Age + gender + optional verified — distance tiers are handled by the discover feed loader / API. */
export function applyDiscoverDemographicFilters(
  profiles: Profile[],
  filters: DiscoverFilters,
): Profile[] {
  return profiles.filter((profile) => {
    if (filters.hasProfilePhoto && !hasProfilePhoto(profile)) return false;
    if (filters.verifiedOnly && !profile.verified) return false;
    if (profile.age < filters.ageMin || profile.age > filters.ageMax) return false;
    if (filters.genders.length > 0) {
      if (!profile.gender || !filters.genders.includes(profile.gender)) {
        return false;
      }
    }
    return true;
  });
}

/** Age + gender for For You — keeps explicit gender picks from onboarding/filters. */
export function applyForYouFeedFilters(
  profiles: Profile[],
  filters: DiscoverFilters,
): Profile[] {
  const filtered = applyDiscoverDemographicFilters(profiles, filters);
  if (filtered.length > 0 || profiles.length === 0) return filtered;

  if (filters.verifiedOnly) return filtered;

  // User chose a specific gender — don't fall back to showing everyone.
  if (filters.genders.length > 0 && filters.genders.length < 3) {
    return filtered;
  }

  if (filters.genders.length > 0) {
    const withoutGender = applyDiscoverDemographicFilters(profiles, {
      ...filters,
      genders: [],
    });
    if (withoutGender.length > 0) return withoutGender;
  }

  return filters.hasProfilePhoto ? profiles.filter(hasProfilePhoto) : profiles;
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
