import { applyThemeToDocument, ensureLightThemeDefault, isThemeExplicitlyChosen, loadTheme } from './themeStorage';
import { loadUserSettings, saveUserSettings } from '@/utils/settings/userSettingsStorage';

/** Apply saved theme before first paint — light unless user chose dark in Settings. */
export function initTheme(): void {
  ensureLightThemeDefault();

  if (!isThemeExplicitlyChosen()) {
    try {
      const settings = loadUserSettings();
      if (settings.theme === 'night') {
        saveUserSettings({ ...settings, theme: 'light' });
      }
    } catch {
      /* ignore */
    }
  }

  applyThemeToDocument(loadTheme());
}
