import './MessageSearch.css';

interface MessageSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function MessageSearch({ value, onChange }: MessageSearchProps) {
  return (
    <div className="message-search">
      <svg className="message-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <input
        type="search"
        className="message-search__input"
        placeholder="Search matches or messages…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search conversations"
      />
      {value && (
        <button
          type="button"
          className="message-search__clear"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </div>
  );
}
