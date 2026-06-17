import type { TopBarProps } from './TopBar.types';
import './TopBar.css';

export function TopBar({
  filter,
  onFilterChange,
  quota,
  isQuotaLoading,
  likeCount = 0,
  onLikesClick,
  onDiscoveryFiltersClick,
  hasActiveDiscoveryFilters = false,
  isPremium = false,
  onUpgrade,
  onFindClick,
}: TopBarProps) {
  const remaining = quota?.remaining ?? '—';
  const max = quota?.max ?? '—';
  const showUpgrade = !isPremium && onUpgrade;

  const flameQuota = (
    <div
      className="top-bar__flames"
      title={quota ? `${remaining} crushes left today` : 'Loading quota'}
      aria-busy={isQuotaLoading}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="top-bar__flame-icon">
        <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.39 13.5.67z" />
      </svg>
      <span className="top-bar__flame-count">{isPremium ? '∞' : `${remaining}/${max}`}</span>
    </div>
  );

  const findButton = onFindClick ? (
    <button type="button" className="top-bar__find" onClick={onFindClick} aria-label="Find people">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4-4" />
      </svg>
    </button>
  ) : (
    flameQuota
  );

  const discoveryFilterButton = onDiscoveryFiltersClick ? (
    <button
      type="button"
      className="top-bar__filter"
      onClick={onDiscoveryFiltersClick}
      aria-label="Discovery filters"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M4 6h16M6 12h12M8 18h8" />
        <circle cx="18" cy="6" r="2" fill="currentColor" stroke="none" />
        <circle cx="6" cy="12" r="2" fill="currentColor" stroke="none" />
        <circle cx="16" cy="18" r="2" fill="currentColor" stroke="none" />
      </svg>
      {hasActiveDiscoveryFilters && <span className="top-bar__filter-dot" aria-hidden />}
    </button>
  ) : null;

  return (
    <header className="top-bar">
      <div className="top-bar__brand">
        {showUpgrade ? (
          <button
            type="button"
            className="top-bar__upgrade"
            onClick={onUpgrade}
            aria-label="Upgrade to Platinum"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="top-bar__upgrade-crown">
              <path d="M5 16 3 8l5.2 3.3L12 4l3.8 7.3L21 8l-2 8H5zm-1 2h18v2H4v-2z" />
            </svg>
            Upgrade
          </button>
        ) : (
          discoveryFilterButton ?? (
            <span className="top-bar__logo" aria-hidden>
              L
            </span>
          )
        )}
      </div>

      {showUpgrade && discoveryFilterButton ? (
        <div className="top-bar__filter-slot">{discoveryFilterButton}</div>
      ) : null}

      <nav className="top-bar__tabs" aria-label="Feed filter">
        <button
          type="button"
          className={`top-bar__tab ${filter === 'for-you' ? 'top-bar__tab--active' : ''}`}
          onClick={() => onFilterChange('for-you')}
        >
          For You
        </button>
        <button
          type="button"
          className={`top-bar__tab ${filter === 'nearby' ? 'top-bar__tab--active' : ''}`}
          onClick={() => onFilterChange('nearby')}
        >
          Nearby
        </button>
        <span
          className="top-bar__tab-indicator"
          style={{ transform: filter === 'for-you' ? 'translateX(0)' : 'translateX(100%)' }}
        />
      </nav>

      <div className="top-bar__actions">
        {onLikesClick && (
          <button
            type="button"
            className="top-bar__likes"
            onClick={onLikesClick}
            aria-label={`${likeCount} likes — see who liked you`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="top-bar__likes-icon">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            {likeCount > 0 && (
              <span className="top-bar__likes-badge">{likeCount}</span>
            )}
          </button>
        )}

        {findButton}
      </div>
    </header>
  );
}
