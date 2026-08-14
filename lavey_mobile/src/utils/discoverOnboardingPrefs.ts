import AsyncStorage from "@react-native-async-storage/async-storage";

const FIRST_TIME_HINTS_KEY = "@lavey/discover-first-time-hints-pending";

/** Called right after the onboarding quiz submits — arms the first-time "scroll" and
 * "filters" hints for the next feed load. */
export async function saveOnboardingDiscoverPrefs(): Promise<void> {
  await AsyncStorage.setItem(FIRST_TIME_HINTS_KEY, "1");
}

/** Consumes the first-time-hints flag — true only the first time it's read after onboarding. */
export async function consumeFirstTimeHintsFlag(): Promise<boolean> {
  const value = await AsyncStorage.getItem(FIRST_TIME_HINTS_KEY);
  if (!value) return false;
  await AsyncStorage.removeItem(FIRST_TIME_HINTS_KEY);
  return true;
}
