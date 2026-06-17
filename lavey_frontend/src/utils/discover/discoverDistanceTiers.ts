import type { FeedFilter } from '@/types';
import { parseProfileDistanceKm } from './parseProfileDistance';
import type { Profile } from '@/types';

export const DISCOVER_NEARBY_DISTANCE_TIERS_KM = [10, 20, 30, 40] as const;

export type DiscoverNearbyDistanceTierKm = (typeof DISCOVER_NEARBY_DISTANCE_TIERS_KM)[number];

export function profileDistanceKm(profile: Profile): number {
  return profile.distanceKm ?? parseProfileDistanceKm(profile.distance);
}

/** Hide distance labels beyond this range on For You / Discovery UI. */
export const MAX_PROFILE_DISTANCE_DISPLAY_KM = 50;

export function getDisplayableProfileDistance(profile: Profile): string | null {
  const label = profile.distance?.trim();
  if (!label || /^unknown distance$/i.test(label)) return null;
  if (profileDistanceKm(profile) > MAX_PROFILE_DISTANCE_DISPLAY_KM) return null;
  return label;
}

export function buildNearbyDistanceTiers(maxDistanceKm: number): DiscoverNearbyDistanceTierKm[] {
  return DISCOVER_NEARBY_DISTANCE_TIERS_KM.filter((tier) => tier <= maxDistanceKm);
}

export function defaultNearbyDistanceTier(maxDistanceKm: number): DiscoverNearbyDistanceTierKm | null {
  const tiers = buildNearbyDistanceTiers(maxDistanceKm);
  return tiers[0] ?? null;
}

export function nextNearbyDistanceTier(
  current: number | null,
  maxDistanceKm: number,
): number | null {
  const tiers = buildNearbyDistanceTiers(maxDistanceKm);
  if (current === null) return null;
  const index = tiers.indexOf(current as DiscoverNearbyDistanceTierKm);
  if (index === -1) return tiers[0] ?? null;
  return tiers[index + 1] ?? null;
}

export function profileWithinDistanceKm(distanceKm: number | null, maxKm: number | null): boolean {
  if (maxKm === null) return true;
  if (distanceKm === null) return false;
  return distanceKm <= maxKm;
}

export function filterProfilesByDistanceCap(
  profiles: Profile[],
  maxKm: number | null,
): Profile[] {
  if (maxKm === null) return profiles;
  return profiles.filter((profile) =>
    profileWithinDistanceKm(profileDistanceKm(profile), maxKm),
  );
}

export function sortProfilesByDistance(profiles: Profile[]): Profile[] {
  return [...profiles].sort((a, b) => profileDistanceKm(a) - profileDistanceKm(b));
}

export function resolveDistanceCapKm(params: {
  feedFilter: FeedFilter;
  distanceTierKm: number | null;
  expandedDistance: boolean;
  maxDistanceKm: number;
}): number | null {
  const { feedFilter, distanceTierKm, expandedDistance, maxDistanceKm } = params;
  if (expandedDistance) return null;

  if (feedFilter === 'nearby') {
    return distanceTierKm;
  }

  return maxDistanceKm;
}
