import './MessageFilters.css';

export type MessageFilter = 'all' | 'unread' | 'online';

interface MessageFiltersProps {
  active: MessageFilter;
  onChange: (filter: MessageFilter) => void;
  counts: { all: number; unread: number; online: number };
}

const FILTERS: { id: MessageFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'online', label: 'Online' },
];

export function MessageFilters({ active, onChange, counts }: MessageFiltersProps) {
  return (
    <div className="message-filters" role="tablist" aria-label="Filter conversations">
      {FILTERS.map((f) => (
        <button
          key={f.id}
          type="button"
          role="tab"
          aria-selected={active === f.id}
          className={`message-filters__tab ${active === f.id ? 'message-filters__tab--active' : ''}`}
          onClick={() => onChange(f.id)}
        >
          {f.label}
          <span className="message-filters__count">{counts[f.id]}</span>
        </button>
      ))}
    </div>
  );
}
