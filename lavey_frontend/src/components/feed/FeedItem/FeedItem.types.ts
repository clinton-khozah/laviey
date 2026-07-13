import type { Profile } from '@/types';

export interface FeedItemProps {
  profile: Profile;
  liked: boolean;
  likedPost: boolean;
  iCrushSent: boolean;
  onLike: () => void | Promise<void>;
  onPostLike: () => void;
  onICrush: () => void;
  onProfileClick: () => void;
  onMoreOptions: () => void;
  onPaidChat?: () => void;
  clearPhoto?: boolean;
  onExitClearPhoto?: () => void;
  showSwipeHint?: boolean;
}
