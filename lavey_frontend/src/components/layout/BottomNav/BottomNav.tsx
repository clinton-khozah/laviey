import { MAIN_NAV_ITEMS } from '@/constants/navigation';
import type { BottomNavProps } from './BottomNav.types';
import './BottomNav.css';

export function BottomNav({
  activeId,
  messageBadgeCount = 2,
  onNavigate,
}: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <div className="bottom-nav__inner">
        {MAIN_NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`bottom-nav__item ${activeId === item.id ? 'bottom-nav__item--active' : ''} ${item.id === 'post' ? 'bottom-nav__item--post' : ''}`}
            aria-current={activeId === item.id ? 'page' : undefined}
            onClick={() => onNavigate?.(item.id)}
          >
            <span className="bottom-nav__icon">{item.icon}</span>
            <span className="bottom-nav__label">{item.label}</span>
            {item.id === 'messages' && messageBadgeCount > 0 && (
              <span className="bottom-nav__badge">{messageBadgeCount}</span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
