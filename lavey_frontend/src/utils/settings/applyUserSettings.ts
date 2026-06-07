import { MEETING_LANGUAGE_STORAGE_KEY, DEFAULT_MEETING_LANGUAGE, type MeetingLanguageCode } from '@/constants/meeting/meetingLanguages';
import type { AppTheme, ChatTypingStyle } from '@/types';
import {
  applyChatTypingStyleToDocument,
  loadChatTypingStyle,
  saveChatTypingStyle,
} from '@/utils/chat/chatTypingStyleStorage';
import {
  saveUserSettings,
  loadUserSettings,
  type UserSettings,
} from '@/utils/settings/userSettingsStorage';
import { applyThemeToDocument, loadTheme, saveTheme, resolveEffectiveTheme } from '@/utils/theme/themeStorage';

export interface ApplyUserSettingsHandlers {
  setTheme: (theme: AppTheme) => void;
  setChatTypingStyle: (style: ChatTypingStyle) => void;
  setLanguage: (language: MeetingLanguageCode) => void;
}

function readStoredLanguage(): MeetingLanguageCode {
  try {
    const stored = localStorage.getItem(MEETING_LANGUAGE_STORAGE_KEY);
    if (stored && ['en', 'es', 'fr', 'de', 'pt', 'ja', 'ko', 'zh'].includes(stored)) {
      return stored as MeetingLanguageCode;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_MEETING_LANGUAGE;
}

export function getLocalUserSettings(): UserSettings {
  const cached = loadUserSettings();
  return {
    theme: loadTheme(),
    chatTypingStyle: loadChatTypingStyle(),
    language: readStoredLanguage(),
    pushNotificationsEnabled: cached.pushNotificationsEnabled,
  };
}

export function applyUserSettings(
  settings: UserSettings,
  handlers: ApplyUserSettingsHandlers,
): void {
  const theme = resolveEffectiveTheme(settings.theme);
  handlers.setTheme(theme);
  saveTheme(theme);
  applyThemeToDocument(theme);

  handlers.setChatTypingStyle(settings.chatTypingStyle);
  saveChatTypingStyle(settings.chatTypingStyle);
  applyChatTypingStyleToDocument(settings.chatTypingStyle);

  handlers.setLanguage(settings.language);
  try {
    localStorage.setItem(MEETING_LANGUAGE_STORAGE_KEY, settings.language);
  } catch {
    /* ignore */
  }

  saveUserSettings({ ...settings, theme });
}
