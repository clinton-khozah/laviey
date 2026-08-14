import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Filters } from "../screens/discover/components/FilterModal";
import {
  DEFAULT_DISCOVER_FILTERS,
  discoverFiltersFromOnboarding,
} from "./discoverFiltersFromOnboarding";
import { loadOnboardingQuizSnapshot } from "./onboardingQuizStorage";

const STORAGE_KEY = "@lavey/discover-filters";
const MANUAL_SUFFIX = ":manual";

function storageKey(userId?: string): string {
  return userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
}

function manualFlagKey(userId: string): string {
  return `${storageKey(userId)}${MANUAL_SUFFIX}`;
}

function isValidFilters(value: unknown): value is Filters {
  if (!value || typeof value !== "object") return false;
  const filters = value as Filters;
  return (
    typeof filters.maxDistanceKm === "number" &&
    typeof filters.ageMin === "number" &&
    typeof filters.ageMax === "number" &&
    Array.isArray(filters.genders)
  );
}

function parseStoredFilters(raw: string): Filters | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidFilters(parsed)) return null;
    return {
      ...DEFAULT_DISCOVER_FILTERS,
      ...parsed,
      genders: parsed.genders.length > 0 ? parsed.genders : DEFAULT_DISCOVER_FILTERS.genders,
      verifiedOnly: parsed.verifiedOnly === true,
      hasProfilePhoto: parsed.hasProfilePhoto !== false,
    };
  } catch {
    return null;
  }
}

export async function loadDiscoverFilters(userId?: string): Promise<Filters> {
  try {
    if (userId) {
      const scoped = await AsyncStorage.getItem(storageKey(userId));
      if (scoped) {
        const parsed = parseStoredFilters(scoped);
        if (parsed) return parsed;
      }
    }
    const legacy = await AsyncStorage.getItem(STORAGE_KEY);
    if (!legacy) return { ...DEFAULT_DISCOVER_FILTERS };
    return parseStoredFilters(legacy) ?? { ...DEFAULT_DISCOVER_FILTERS };
  } catch {
    return { ...DEFAULT_DISCOVER_FILTERS };
  }
}

export async function saveDiscoverFilters(filters: Filters, userId?: string): Promise<void> {
  const key = storageKey(userId);
  await AsyncStorage.setItem(key, JSON.stringify(filters));
  if (userId) await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function markDiscoverFiltersManual(userId?: string): Promise<void> {
  if (!userId) return;
  await AsyncStorage.setItem(manualFlagKey(userId), "1");
}

export async function hasManualDiscoverFilters(userId?: string): Promise<boolean> {
  if (!userId) return false;
  return (await AsyncStorage.getItem(manualFlagKey(userId))) === "1";
}

/** Quiz "interested in" drives gender/age unless the user changed filters manually. */
export async function resolveDiscoverFilters(userId?: string): Promise<Filters> {
  const stored = await loadDiscoverFilters(userId);
  if (!userId) return stored;

  const quiz = await loadOnboardingQuizSnapshot(userId);
  if (!quiz || (await hasManualDiscoverFilters(userId))) return stored;

  const fromQuiz = discoverFiltersFromOnboarding(quiz);
  return {
    ...stored,
    maxDistanceKm: DEFAULT_DISCOVER_FILTERS.maxDistanceKm,
    ageMin: DEFAULT_DISCOVER_FILTERS.ageMin,
    ageMax: DEFAULT_DISCOVER_FILTERS.ageMax,
    genders: fromQuiz.genders,
    hasProfilePhoto: DEFAULT_DISCOVER_FILTERS.hasProfilePhoto,
  };
}
