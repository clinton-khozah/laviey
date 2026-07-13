import type { Profile } from '@/types';

export interface VerticalFeedProps {
  profiles: Profile[];
  likedIds: Set<string>;
  likedPostIds: Set<string>;
  iCrushSentIds: Set<string>;
  onFlame: (profileId: string) => void | Promise<void>;
  onPostLike: (profile: Profile) => void;
  onICrush?: (profileId: string) => void;
  onProfileClick: (profile: Profile) => void;
  onMoreOptions: (profile: Profile) => void;
  onPaidChat?: (profile: Profile) => void;
  clearPhotoProfileId?: string | null;
  onExitClearPhoto?: () => void;
  isLocked?: boolean;
  /** Seamless up/down looping for short For You pools */
  infiniteLoop?: boolean;
  onNearEndOfFeed?: () => void;
}
