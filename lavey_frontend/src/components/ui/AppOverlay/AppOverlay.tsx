import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import './AppOverlay.css';

interface AppOverlayProps {
  children: ReactNode;
}

/**
 * Renders above the app shell (outside #root / scroll containers) so modals
 * and full-screen layers are not clipped by overflow:hidden on .app-shell.
 */
export function AppOverlay({ children }: AppOverlayProps) {
  const target = document.getElementById('overlay-root');
  if (!target) return null;

  return createPortal(<div className="app-overlay">{children}</div>, target);
}
