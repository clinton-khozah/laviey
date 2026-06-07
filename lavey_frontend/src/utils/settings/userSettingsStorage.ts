import type { MeetingLanguageCode } from '@/constants/meeting/meetingLanguages';
import type { AppTheme, ChatTypingStyle } from '@/types';

const KEY = 'lavey_user_settings';

export interface UserSettings {
  theme: AppTheme;
  chatTypingStyle: ChatTypingStyle;
  language: MeetingLanguageCode;
  pushNotificationsEnabled: boolean;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: 'light',
  chatTypingStyle: 'romantic',
  language: 'en',
  pushNotificationsEnabled: true,
};

export function loadUserSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_USER_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return {
      ...DEFAULT_USER_SETTINGS,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_USER_SETTINGS };
  }
}

export function saveUserSettings(settings: UserSettings): void {
  localStorage.setItem(KEY, JSON.stringify(settings));
}

export function arePushNotificationsEnabled(): boolean {
  return loadUserSettings().pushNotificationsEnabled;
}
