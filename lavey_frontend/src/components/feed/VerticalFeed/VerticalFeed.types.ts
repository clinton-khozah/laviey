import type { Profile } from '@/types';

export interface VerticalFeedProps {
  profiles: Profile[];
  likedIds: Set<string>;
  likedPostIds: Set<string>;
  onFlame: (profileId: string) => void;
  onPostLike: (profile: Profile) => void;
  onCollab?: (profileId: string) => void;
  onProfileClick: (profile: Profile) => void;
  isLocked?: boolean;
  onNearEndOfFeed?: () => void;
}
