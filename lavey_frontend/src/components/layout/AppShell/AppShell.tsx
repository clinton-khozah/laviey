import type { ReactNode } from 'react';
import { BottomNav } from '@/components/layout/BottomNav';
import type { NavItemId } from '@/constants/navigation';
import './AppShell.css';

interface AppShellProps {
  children: ReactNode;
  activeNavId?: NavItemId;
  messageBadgeCount?: number;
  onNavigate?: (id: NavItemId) => void;
}

export function AppShell({
  children,
  activeNavId = 'feed',
  messageBadgeCount,
  onNavigate,
}: AppShellProps) {
  return (
    <div className="app-shell">
      {children}
      <BottomNav
        activeId={activeNavId}
        messageBadgeCount={messageBadgeCount}
        onNavigate={onNavigate}
      />
    </div>
  );
}
