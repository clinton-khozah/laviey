import type { ReactNode } from 'react';
import './ProfileMenuItem.css';

interface ProfileMenuItemProps {
  icon: ReactNode;
  label: string;
  value?: string;
  description?: string;
  variant?: 'default' | 'premium' | 'danger' | 'earnings';
  badge?: string;
  onClick: () => void;
  disabled?: boolean;
}

export function ProfileMenuItem({
  icon,
  label,
  value,
  description,
  variant = 'default',
  badge,
  onClick,
  disabled,
}: ProfileMenuItemProps) {
  return (
    <button
      type="button"
      className={`profile-menu-item profile-menu-item--${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="profile-menu-item__icon">{icon}</span>
      <span className="profile-menu-item__text">
        <span className="profile-menu-item__label">{label}</span>
        {value && <span className="profile-menu-item__value">{value}</span>}
        {description && <span className="profile-menu-item__desc">{description}</span>}
      </span>
      {badge && <span className="profile-menu-item__badge">{badge}</span>}
      <svg className="profile-menu-item__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  );
}
