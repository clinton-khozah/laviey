import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MobileOnboardingQuizSnapshot } from "./discoverFiltersFromOnboarding";

const STORAGE_KEY = "@lavey/onboarding-quiz";

function storageKey(userId: string): string {
  return `${STORAGE_KEY}:${userId}`;
}

export async function saveOnboardingQuizSnapshot(
  userId: string,
  snapshot: MobileOnboardingQuizSnapshot,
): Promise<void> {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(snapshot));
}

export async function loadOnboardingQuizSnapshot(
  userId?: string,
): Promise<MobileOnboardingQuizSnapshot | null> {
  if (!userId) return null;
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as MobileOnboardingQuizSnapshot;
  } catch {
    return null;
  }
}
