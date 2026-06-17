import './MessagesHeader.css';

export type MessageFilter = 'all' | 'unread' | 'online';

interface MessagesHeaderProps {
  unreadTotal: number;
  matchCount: number;
  filter: MessageFilter;
  filterCounts: { all: number; unread: number; online: number };
  onFilterChange: (filter: MessageFilter) => void;
  onComposeClick?: () => void;
}

const FILTERS: { id: MessageFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'online', label: 'Online' },
];

export function MessagesHeader({
  unreadTotal,
  matchCount,
  filter,
  filterCounts,
  onFilterChange,
  onComposeClick,
}: MessagesHeaderProps) {
  return (
    <header className="messages-header">
      <div className="messages-header__top">
        <div className="messages-header__brand">
          <h1 className="messages-header__title">Messages</h1>
          <div className="messages-header__stats">
            <span className="messages-header__stat messages-header__stat--matches">
              {matchCount} {matchCount === 1 ? 'match' : 'matches'}
            </span>
            {unreadTotal > 0 && (
              <span className="messages-header__stat messages-header__stat--unread">
                {unreadTotal} unread
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          className="messages-header__compose"
          aria-label="Discover people"
          onClick={onComposeClick}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      <div className="messages-header__filters" role="tablist" aria-label="Filter conversations">
        {FILTERS.map((f) => {
          const isActive = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-filter={f.id}
              className={`messages-header__filter ${isActive ? 'messages-header__filter--active' : ''}`}
              onClick={() => onFilterChange(f.id)}
            >
              <span className="messages-header__filter-label">{f.label}</span>
              <span className="messages-header__filter-count">{filterCounts[f.id]}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
