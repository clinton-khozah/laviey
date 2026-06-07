import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_DISCOVER_FILTERS, type DiscoverFilters } from '@/types';
import {
  discoverFiltersAreDefault,
  loadDiscoverFilters,
  saveDiscoverFilters,
} from '@/utils/discover/discoverFilterStorage';

export function useDiscoverFilters() {
  const [filters, setFiltersState] = useState<DiscoverFilters>(() => loadDiscoverFilters());

  const hasActiveFilters = useMemo(() => !discoverFiltersAreDefault(filters), [filters]);

  const setFilters = useCallback((next: DiscoverFilters) => {
    setFiltersState(next);
    saveDiscoverFilters(next);
  }, []);

  const resetFilters = useCallback(() => {
    const defaults = { ...DEFAULT_DISCOVER_FILTERS };
    setFiltersState(defaults);
    saveDiscoverFilters(defaults);
  }, []);

  return { filters, setFilters, resetFilters, hasActiveFilters };
}
