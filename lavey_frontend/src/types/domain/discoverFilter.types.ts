export type DiscoverGender = 'woman' | 'man' | 'nonbinary';

export interface DiscoverFilters {
  maxDistanceKm: number;
  ageMin: number;
  ageMax: number;
  genders: DiscoverGender[];
}

export const DEFAULT_DISCOVER_FILTERS: DiscoverFilters = {
  maxDistanceKm: 50,
  ageMin: 18,
  ageMax: 35,
  genders: ['woman'],
};
