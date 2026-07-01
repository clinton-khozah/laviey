import { useId } from 'react';
import type { PlatinumBadgeProps } from './PlatinumBadge.types';
import './PlatinumBadge.css';

function PlatinumCrestIcon({ className, uid }: { className?: string; uid: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <defs>
        <linearGradient id={`${uid}-ring`} x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#bbf7d0" />
          <stop offset="42%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
        <linearGradient id={`${uid}-gem`} x1="7" y1="6" x2="17" y2="19" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ecfdf5" />
          <stop offset="38%" stopColor="#6ee7b7" />
          <stop offset="72%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id={`${uid}-gold`} x1="10" y1="2" x2="14" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#d9f99d" />
          <stop offset="50%" stopColor="#84cc16" />
          <stop offset="100%" stopColor="#4d7c0f" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="50%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="12" cy="12" r="10.25" stroke={`url(#${uid}-ring)`} strokeWidth="1.15" />
      <circle cx="12" cy="12" r="8.85" stroke="rgba(187, 247, 208, 0.28)" strokeWidth="0.6" />

      <path
        d="M12 3.2 8.1 8.6 12 6.2l3.9 2.4L12 3.2Z"
        fill={`url(#${uid}-gold)`}
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="0.35"
        strokeLinejoin="round"
      />

      <path
        d="M12 7.1 6.2 10.1l5.8 10.2 5.8-10.2L12 7.1Z"
        fill={`url(#${uid}-gem)`}
        stroke="rgba(255,255,255,0.42)"
        strokeWidth="0.65"
        strokeLinejoin="round"
      />
      <path
        d="M12 7.1v13.2M6.2 10.1h11.6M8.5 10.1 12 20.3l3.5-10.2"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth="0.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <ellipse cx="10.2" cy="11.4" rx="1.5" ry="2.2" fill={`url(#${uid}-glow)`} transform="rotate(-18 10.2 11.4)" />
    </svg>
  );
}

export function PlatinumBadge({
  size = 'sm',
  showLabel = false,
  className = '',
  onClick,
}: PlatinumBadgeProps) {
  const uid = useId().replace(/:/g, '');
  const label = showLabel || size !== 'sm';
  const iconOnly = size === 'sm' && !label;

  const classes = [
    'platinum-badge',
    `platinum-badge--${size}`,
    iconOnly ? 'platinum-badge--icon-only' : '',
    onClick ? 'platinum-badge--interactive' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      <span className="platinum-badge__crest" aria-hidden>
        <PlatinumCrestIcon uid={uid} className="platinum-badge__icon" />
      </span>
      {label ? <span className="platinum-badge__label">Platinum</span> : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={classes}
        onClick={onClick}
        title="Manage Platinum"
        aria-label="Manage Platinum subscription"
      >
        {content}
      </button>
    );
  }

  return (
    <span className={classes} title="Platinum member" aria-label="Platinum member">
      {content}
    </span>
  );
}
