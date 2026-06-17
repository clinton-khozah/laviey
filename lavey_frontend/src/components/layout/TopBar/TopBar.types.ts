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
  isPremium?: boolean;
  onUpgrade?: () => void;
  onFindClick?: () => void;
}
