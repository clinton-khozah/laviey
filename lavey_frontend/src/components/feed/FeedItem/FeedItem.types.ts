import type { Profile } from '@/types';

export interface FeedItemProps {
  profile: Profile;
  liked: boolean;
  likedPost: boolean;
  onLike: () => void;
  onPostLike: () => void;
  onCollab: () => void;
  onProfileClick: () => void;
  showSwipeHint?: boolean;
}
