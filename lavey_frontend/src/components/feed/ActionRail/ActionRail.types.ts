import type { Profile } from '@/types';

export interface ActionRailProps {
  profile: Profile;
  liked: boolean;
  iCrushSent: boolean;
  onLike: () => void;
  onICrush: () => void;
  onProfileClick: () => void;
  onMoreOptions: () => void;
}
