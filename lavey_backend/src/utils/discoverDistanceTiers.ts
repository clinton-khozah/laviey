/** Progressive nearby radii (km). After the last tier, callers use `null` = any distance. */
export const DISCOVER_NEARBY_DISTANCE_TIERS_KM = [10, 20, 30, 40] as const;

export type DiscoverNearbyDistanceTierKm = (typeof DISCOVER_NEARBY_DISTANCE_TIERS_KM)[number];

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

export function parseDistanceTierKm(
  raw: string | undefined,
  filter: 'for-you' | 'nearby',
  maxDistanceKm: number,
): number | null {
  if (raw === 'any') return null;
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  if (filter === 'nearby') return defaultNearbyDistanceTier(maxDistanceKm);
  return null;
}

export function profileWithinDistanceKm(
  distanceKm: number | null,
  maxKm: number | null,
): boolean {
  if (maxKm === null) return true;
  if (distanceKm === null) return false;
  return distanceKm <= maxKm;
}
