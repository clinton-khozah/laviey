import { DEFAULT_DISCOVER_FILTERS, type DiscoverFilters } from '@/types';
import { discoverFiltersFromOnboarding } from '@/utils/discover/discoverFiltersFromOnboarding';
import { loadOnboardingQuizAnswers } from '@/utils/onboarding/onboardingQuizStorage';

const STORAGE_KEY = 'lavey_discover_filters';
const MANUAL_SUFFIX = ':manual';

function storageKey(userId?: string): string {
  return userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
}

function manualFlagKey(userId: string): string {
  return `${storageKey(userId)}${MANUAL_SUFFIX}`;
}

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

function parseStoredFilters(raw: string): DiscoverFilters | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidFilters(parsed)) return null;
    return {
      ...DEFAULT_DISCOVER_FILTERS,
      ...parsed,
      genders: parsed.genders.length > 0 ? parsed.genders : DEFAULT_DISCOVER_FILTERS.genders,
      verifiedOnly: parsed.verifiedOnly === true,
    };
  } catch {
    return null;
  }
}

export function loadDiscoverFilters(userId?: string): DiscoverFilters {
  try {
    if (userId) {
      const scoped = localStorage.getItem(storageKey(userId));
      if (scoped) {
        const parsed = parseStoredFilters(scoped);
        if (parsed) return parsed;
      }
    }
    const legacy = localStorage.getItem(STORAGE_KEY);
    if (!legacy) return { ...DEFAULT_DISCOVER_FILTERS };
    return parseStoredFilters(legacy) ?? { ...DEFAULT_DISCOVER_FILTERS };
  } catch {
    return { ...DEFAULT_DISCOVER_FILTERS };
  }
}

export function saveDiscoverFilters(filters: DiscoverFilters, userId?: string): void {
  try {
    const key = storageKey(userId);
    localStorage.setItem(key, JSON.stringify(filters));
    if (userId) {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function clearDiscoverFilters(userId?: string): void {
  try {
    if (userId) {
      localStorage.removeItem(storageKey(userId));
      localStorage.removeItem(manualFlagKey(userId));
    }
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function markDiscoverFiltersManual(userId?: string): void {
  if (!userId) return;
  try {
    localStorage.setItem(manualFlagKey(userId), '1');
  } catch {
    /* ignore */
  }
}

export function clearDiscoverFiltersManual(userId?: string): void {
  if (!userId) return;
  try {
    localStorage.removeItem(manualFlagKey(userId));
  } catch {
    /* ignore */
  }
}

export function hasManualDiscoverFilters(userId?: string): boolean {
  if (!userId) return false;
  try {
    return localStorage.getItem(manualFlagKey(userId)) === '1';
  } catch {
    return false;
  }
}

/** Quiz "interested in" drives gender/age unless the user changed filters manually. */
export function resolveDiscoverFilters(userId?: string): DiscoverFilters {
  const stored = loadDiscoverFilters(userId);
  if (!userId) return stored;

  const quiz = loadOnboardingQuizAnswers(userId);
  if (!quiz || hasManualDiscoverFilters(userId)) return stored;

  const fromQuiz = discoverFiltersFromOnboarding(quiz);
  return {
    ...stored,
    genders: fromQuiz.genders,
    ageMin: fromQuiz.ageMin,
    ageMax: fromQuiz.ageMax,
  };
}

export function discoverFiltersAreDefault(filters: DiscoverFilters): boolean {
  return JSON.stringify(filters) === JSON.stringify(DEFAULT_DISCOVER_FILTERS);
}
