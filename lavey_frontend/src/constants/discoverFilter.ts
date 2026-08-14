import type { DiscoverGender } from '@/types';

export const DISCOVER_DISTANCE_KM = { min: 1, max: 100 } as const;
/** Used for default “Anyone globally” on For You and expanded discover requests. */
export const DISCOVER_DISTANCE_GLOBAL_KM = 500;
export const DISCOVER_AGE = { min: 18, max: 55 } as const;

export const DISCOVER_GENDER_OPTIONS: { id: DiscoverGender; label: string }[] = [
  { id: 'woman', label: 'Women' },
  { id: 'man', label: 'Men' },
  { id: 'nonbinary', label: 'Non-binary' },
];
