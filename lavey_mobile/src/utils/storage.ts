import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthSession } from '../types';

const SESSION_KEY = '@lavey/auth-session';

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
};
