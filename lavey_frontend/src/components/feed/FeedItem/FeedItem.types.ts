import type { Profile } from '@/types';

export interface FeedItemProps {
  profile: Profile;
  liked: boolean;
  likedPost: boolean;
  iCrushSent: boolean;
  onLike: () => void;
  onPostLike: () => void;
  onICrush: () => void;
  onProfileClick: () => void;
  showSwipeHint?: boolean;
}
