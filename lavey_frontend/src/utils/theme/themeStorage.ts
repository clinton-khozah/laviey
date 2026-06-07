import type { AppTheme } from '@/types';

const STORAGE_KEY = 'lavey_theme';
const EXPLICIT_KEY = 'lavey_theme_explicit';

export const DEFAULT_THEME: AppTheme = 'light';

export function isThemeExplicitlyChosen(): boolean {
  try {
    return localStorage.getItem(EXPLICIT_KEY) === '1';
  } catch {
    return false;
  }
}

export function markThemeExplicitlyChosen(): void {
  try {
    localStorage.setItem(EXPLICIT_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** Night mode only when the user chose it in Settings; otherwise default to light. */
export function resolveEffectiveTheme(theme: AppTheme): AppTheme {
  if (theme === 'night' && !isThemeExplicitlyChosen()) return DEFAULT_THEME;
  return theme === 'night' ? 'night' : DEFAULT_THEME;
}

export function loadTheme(): AppTheme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return resolveEffectiveTheme(raw === 'night' ? 'night' : DEFAULT_THEME);
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveTheme(theme: AppTheme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

export function applyThemeToDocument(theme: AppTheme): void {
  document.documentElement.setAttribute('data-theme', resolveEffectiveTheme(theme));
}

/** Reset legacy dark defaults (stored before light became the app default). */
export function ensureLightThemeDefault(): void {
  if (isThemeExplicitlyChosen()) return;
  saveTheme(DEFAULT_THEME);
}
