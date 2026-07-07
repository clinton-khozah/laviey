import { useEffect } from 'react';
import { useAuth, useChatTypingStyle, useMeetingLanguage, useTheme } from '@/hooks';
import { settingsService } from '@/services/settings/settingsService';
import { applyUserSettings } from '@/utils/settings/applyUserSettings';
import { resolveEffectiveTheme } from '@/utils/theme/themeStorage';
import { usesBackendApi } from '@/config/env';

/** Pulls saved preferences from the API after sign-in and applies them app-wide. */
export function UserSettingsSync() {
  const { isAuthenticated } = useAuth();
  const { setTheme } = useTheme();
  const { setChatTypingStyle } = useChatTypingStyle();
  const { setLanguage } = useMeetingLanguage();

  useEffect(() => {
    if (!isAuthenticated || !usesBackendApi()) return;

    let cancelled = false;
    void (async () => {
      try {
        const data = await settingsService.getSettings();
        if (cancelled) return;

        const theme = resolveEffectiveTheme(data.theme);
        if (theme === 'light' && data.theme === 'night') {
          void settingsService.updateSettings({ theme: 'light' }).catch(() => {});
        }

        applyUserSettings(
          {
            theme,
            chatTypingStyle: data.chatTypingStyle,
            language: data.language,
            pushNotificationsEnabled: data.pushNotificationsEnabled,
            likeFeedbackSoundEnabled: data.likeFeedbackSoundEnabled,
          },
          { setTheme, setChatTypingStyle, setLanguage },
        );
      } catch {
        /* keep local preferences */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, setTheme, setChatTypingStyle, setLanguage]);

  return null;
}
