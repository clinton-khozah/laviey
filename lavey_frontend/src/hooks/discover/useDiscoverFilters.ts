import { useCallback, useEffect, useMemo, useState } from 'react';
import { authService } from '@/services/auth/authService';
import { DEFAULT_DISCOVER_FILTERS, type DiscoverFilters } from '@/types';
import { discoverFiltersFromOnboarding } from '@/utils/discover/discoverFiltersFromOnboarding';
import {
  clearDiscoverFiltersManual,
  discoverFiltersAreDefault,
  hasManualDiscoverFilters,
  loadDiscoverFilters,
  markDiscoverFiltersManual,
  resolveDiscoverFilters,
  saveDiscoverFilters,
} from '@/utils/discover/discoverFilterStorage';
import { loadOnboardingQuizAnswers } from '@/utils/onboarding/onboardingQuizStorage';

export function useDiscoverFilters() {
  const [filters, setFiltersState] = useState<DiscoverFilters>(() => {
    const userId = authService.getStoredSession()?.user.id;
    return resolveDiscoverFilters(userId);
  });

  useEffect(() => {
    const userId = authService.getStoredSession()?.user.id;
    if (!userId) return;

    const resolved = resolveDiscoverFilters(userId);
    const stored = loadDiscoverFilters(userId);
    const quiz = loadOnboardingQuizAnswers(userId);

    if (
      quiz &&
      !hasManualDiscoverFilters(userId) &&
      JSON.stringify(resolved) !== JSON.stringify(stored)
    ) {
      saveDiscoverFilters(resolved, userId);
    }

    setFiltersState(resolved);
  }, []);

  useEffect(() => {
    const onOnboardingCompleted = (event: Event) => {
      const detail = (event as CustomEvent<{ filters?: DiscoverFilters }>).detail;
      if (detail?.filters) {
        setFiltersState(detail.filters);
        return;
      }
      const userId = authService.getStoredSession()?.user.id;
      setFiltersState(resolveDiscoverFilters(userId));
    };

    window.addEventListener('lavey:onboarding-completed', onOnboardingCompleted);
    return () => window.removeEventListener('lavey:onboarding-completed', onOnboardingCompleted);
  }, []);

  const hasActiveFilters = useMemo(() => !discoverFiltersAreDefault(filters), [filters]);

  const setFilters = useCallback((next: DiscoverFilters) => {
    setFiltersState(next);
    const userId = authService.getStoredSession()?.user.id;
    markDiscoverFiltersManual(userId);
    saveDiscoverFilters(next, userId);
  }, []);

  const resetFilters = useCallback(() => {
    const userId = authService.getStoredSession()?.user.id;
    const quiz = userId ? loadOnboardingQuizAnswers(userId) : null;
    const next = quiz ? discoverFiltersFromOnboarding(quiz) : { ...DEFAULT_DISCOVER_FILTERS };
    clearDiscoverFiltersManual(userId);
    setFiltersState(next);
    saveDiscoverFilters(next, userId);
  }, []);

  return { filters, setFilters, resetFilters, hasActiveFilters };
}
