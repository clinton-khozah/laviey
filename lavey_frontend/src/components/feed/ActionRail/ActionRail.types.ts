import type { Profile } from '@/types';

export interface ActionRailProps {
  profile: Profile;
  liked: boolean;
  onLike: () => void;
  onCollab: () => void;
  onProfileClick: () => void;
}
