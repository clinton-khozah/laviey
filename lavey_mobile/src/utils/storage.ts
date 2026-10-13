import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthSession } from '../types';

const SESSION_KEY = '@lavey/auth-session';
const UI_LANGUAGE_KEY = '@lavey/ui-language';
const GUEST_LANGUAGE_KEY = '@lavey/guest-language-choice';

function onboardingCompleteKey(userId: string): string {
  return `@lavey/onboarding-complete:${userId}`;
}

export const storage = {
  async getSession(): Promise<AuthSession | null> {
    const value = await AsyncStorage.getItem(SESSION_KEY);
    if (!value) return null;
    try { return JSON.parse(value) as AuthSession; } catch { await AsyncStorage.removeItem(SESSION_KEY); return null; }
  },
  setSession: (session: AuthSession) => AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session)),
  clearSession: () => AsyncStorage.removeItem(SESSION_KEY),
  getOnboardingComplete: (userId: string) =>
    AsyncStorage.getItem(onboardingCompleteKey(userId)).then((v) => v === '1'),
  setOnboardingComplete: (userId: string) => AsyncStorage.setItem(onboardingCompleteKey(userId), '1'),
  clearOnboardingComplete: (userId: string) => AsyncStorage.removeItem(onboardingCompleteKey(userId)),
  getUiLanguage: () => AsyncStorage.getItem(UI_LANGUAGE_KEY),
  setUiLanguage: (code: string) => AsyncStorage.setItem(UI_LANGUAGE_KEY, code),
  getGuestLanguageChoice: () => AsyncStorage.getItem(GUEST_LANGUAGE_KEY),
  setGuestLanguageChoice: (code: string) => AsyncStorage.setItem(GUEST_LANGUAGE_KEY, code),
  clearGuestLanguageChoice: () => AsyncStorage.removeItem(GUEST_LANGUAGE_KEY),
};
