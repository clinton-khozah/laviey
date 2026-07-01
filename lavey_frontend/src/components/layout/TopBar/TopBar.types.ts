import type { FeedFilter, FlameQuota } from '@/types';

export interface TopBarProps {
  filter: FeedFilter;
  onFilterChange: (filter: FeedFilter) => void;
  quota: FlameQuota | null;
  isQuotaLoading?: boolean;
  likeCount?: number;
  onLikesClick?: () => void;
  onDiscoveryFiltersClick?: () => void;
  hasActiveDiscoveryFilters?: boolean;
  /** Brief highlight after filters are applied or reset */
  filtersUpdatedPulse?: boolean;
  /** Unlimited crushes / premium feature access */
  isPremium?: boolean;
  /** Active paid Platinum subscription — controls badge vs upgrade CTA */
  isPlatinumMember?: boolean;
  onUpgrade?: () => void;
  onPlatinumManage?: () => void;
  onFindClick?: () => void;
}
