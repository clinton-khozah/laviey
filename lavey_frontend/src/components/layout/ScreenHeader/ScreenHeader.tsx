import type { ReactNode } from 'react';
import './ScreenHeader.css';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: ReactNode;
}

export function ScreenHeader({ title, subtitle, onBack, action }: ScreenHeaderProps) {
  return (
    <header className="screen-header">
      <div className="screen-header__row">
        {onBack ? (
          <button type="button" className="screen-header__back" onClick={onBack} aria-label="Go back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        ) : (
          <span className="screen-header__spacer" />
        )}
        <div className="screen-header__titles">
          <h1 className="screen-header__title">{title}</h1>
          {subtitle && <p className="screen-header__subtitle">{subtitle}</p>}
        </div>
        <div className="screen-header__action">{action ?? <span className="screen-header__spacer" />}</div>
      </div>
    </header>
  );
}
