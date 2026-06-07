import type { NavItemId } from '@/constants/navigation';

export interface BottomNavProps {
  activeId: NavItemId;
  messageBadgeCount?: number;
  onNavigate?: (id: NavItemId) => void;
}
