import { DISCOVER_GENDER_OPTIONS } from '@/constants/discoverFilter';
import type { DiscoverFilters, DiscoverGender } from '@/types';

const FIND_AGE_EXTENSION = 10;
const ABSOLUTE_AGE_MIN = 18;
const ABSOLUTE_AGE_MAX = 99;

/** Widen saved discovery preferences by 10 years on each side for the Find feed. */
export function buildFindFeedFilters(base: DiscoverFilters): DiscoverFilters {
  return {
    maxDistanceKm: base.maxDistanceKm,
    ageMin: Math.max(ABSOLUTE_AGE_MIN, base.ageMin - FIND_AGE_EXTENSION),
    ageMax: Math.min(ABSOLUTE_AGE_MAX, base.ageMax + FIND_AGE_EXTENSION),
    genders: base.genders,
    verifiedOnly: base.verifiedOnly,
    hasProfilePhoto: base.hasProfilePhoto,
  };
}

export function formatFindGenderLabel(genders: DiscoverGender[]): string {
  if (genders.length === 0 || genders.length >= DISCOVER_GENDER_OPTIONS.length) {
    return 'Everyone';
  }

  return genders
    .map((id) => DISCOVER_GENDER_OPTIONS.find((option) => option.id === id)?.label ?? id)
    .join(', ');
}

export function formatFindPreferenceSubtitle(base: DiscoverFilters): string {
  const extended = buildFindFeedFilters(base);
  const gender = formatFindGenderLabel(base.genders);
  return `${gender} · ages ${extended.ageMin}–${extended.ageMax}`;
}
