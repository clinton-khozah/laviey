import type { ReactNode } from 'react';
import './PageScroller.css';

interface PageScrollerProps {
  children: ReactNode;
  className?: string;
}

export function PageScroller({ children, className = '' }: PageScrollerProps) {
  return (
    <div className={`page-scroller ${className}`.trim()}>
      {children}
    </div>
  );
}
