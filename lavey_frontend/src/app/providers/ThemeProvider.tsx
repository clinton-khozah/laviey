import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AppTheme } from '@/types';
import { applyThemeToDocument, loadTheme, resolveEffectiveTheme, saveTheme } from '@/utils/theme/themeStorage';

export interface ThemeContextValue {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  isNight: boolean;
  isLight: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(() => loadTheme());

  const setTheme = useCallback((next: AppTheme) => {
    const resolved = resolveEffectiveTheme(next);
    setThemeState(resolved);
    saveTheme(resolved);
    applyThemeToDocument(resolved);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      isNight: theme === 'night',
      isLight: theme === 'light',
    }),
    [theme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
