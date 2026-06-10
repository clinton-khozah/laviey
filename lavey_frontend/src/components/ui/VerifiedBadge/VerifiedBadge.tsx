import './VerifiedBadge.css';

export type VerifiedBadgeSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_PX: Record<VerifiedBadgeSize, number> = {
  sm: 18,
  md: 22,
  lg: 26,
  xl: 40,
};

interface VerifiedBadgeProps {
  size?: VerifiedBadgeSize;
  ring?: boolean;
  className?: string;
  title?: string;
}

/** Facebook-style blue circle with white checkmark. */
export function VerifiedBadge({
  size = 'md',
  ring = false,
  className = '',
  title = 'Verified',
}: VerifiedBadgeProps) {
  const px = SIZE_PX[size];

  return (
    <span
      className={`verified-badge${ring ? ' verified-badge--ring' : ''}${className ? ` ${className}` : ''}`}
      title={title}
      aria-label={title}
    >
      <svg viewBox="0 0 40 40" width={px} height={px} aria-hidden="true">
        <path
          fill="#1877F2"
          d="M40,20c0,11-9,20-20,20S0,31,0,20S9,0,20,0S40,9,40,20z"
        />
        <path
          fill="#fff"
          d="M17.2,29.2l-7.2-7.2l2.5-2.5l4.7,4.7l12.1-12.1l2.5,2.5L17.2,29.2z"
        />
      </svg>
    </span>
  );
}
