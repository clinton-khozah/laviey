export type PlatinumBadgeSize = 'sm' | 'md' | 'lg';

export interface PlatinumBadgeProps {
  size?: PlatinumBadgeSize;
  /** Show "Platinum" text. Defaults to true for md/lg, false for sm. */
  showLabel?: boolean;
  className?: string;
  onClick?: () => void;
}
