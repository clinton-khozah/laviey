import { DEFAULT_DISCOVER_FILTERS, type DiscoverFilters } from '@/types';

const STORAGE_KEY = 'lavey_discover_filters';

function isValidFilters(value: unknown): value is DiscoverFilters {
  if (!value || typeof value !== 'object') return false;
  const f = value as DiscoverFilters;
  return (
    typeof f.maxDistanceKm === 'number' &&
    typeof f.ageMin === 'number' &&
    typeof f.ageMax === 'number' &&
    Array.isArray(f.genders)
  );
}

export function loadDiscoverFilters(): DiscoverFilters {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_DISCOVER_FILTERS };
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidFilters(parsed)) return { ...DEFAULT_DISCOVER_FILTERS };
    return {
      ...DEFAULT_DISCOVER_FILTERS,
      ...parsed,
      genders: parsed.genders.length > 0 ? parsed.genders : DEFAULT_DISCOVER_FILTERS.genders,
      verifiedOnly: parsed.verifiedOnly === true,
    };
  } catch {
    return { ...DEFAULT_DISCOVER_FILTERS };
  }
}

export function saveDiscoverFilters(filters: DiscoverFilters): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
    /* ignore */
  }
}

export function discoverFiltersAreDefault(filters: DiscoverFilters): boolean {
  return JSON.stringify(filters) === JSON.stringify(DEFAULT_DISCOVER_FILTERS);
}
