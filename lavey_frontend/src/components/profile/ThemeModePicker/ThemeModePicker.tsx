import type { AppTheme } from '@/types';
import './ThemeModePicker.css';

interface ThemeModePickerProps {
  value: AppTheme;
  onChange: (theme: AppTheme) => void;
}

export function ThemeModePicker({ value, onChange }: ThemeModePickerProps) {
  return (
    <div className="theme-mode-picker">
      <span className="theme-mode-picker__label">Appearance</span>
      <div className="theme-mode-picker__options" role="group" aria-label="Appearance">
        <button
          type="button"
          className={`theme-mode-picker__option ${value === 'night' ? 'theme-mode-picker__option--active' : ''}`}
          onClick={() => onChange('night')}
          aria-pressed={value === 'night'}
        >
          <span className="theme-mode-picker__icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          </span>
          <span className="theme-mode-picker__name">Night</span>
        </button>
        <button
          type="button"
          className={`theme-mode-picker__option ${value === 'light' ? 'theme-mode-picker__option--active' : ''}`}
          onClick={() => onChange('light')}
          aria-pressed={value === 'light'}
        >
          <span className="theme-mode-picker__icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          </span>
          <span className="theme-mode-picker__name">Bright</span>
        </button>
      </div>
    </div>
  );
}
