import './MessagesHeader.css';

interface MessagesHeaderProps {
  unreadTotal: number;
  matchCount: number;
}

export function MessagesHeader({ unreadTotal, matchCount }: MessagesHeaderProps) {
  return (
    <header className="messages-header">
      <div className="messages-header__top">
        <div>
          <h1 className="messages-header__title">Messages</h1>
          <p className="messages-header__subtitle">
            {matchCount} {matchCount === 1 ? 'match' : 'matches'}
            {unreadTotal > 0 && (
              <>
                {' · '}
                <span className="messages-header__unread">{unreadTotal} unread</span>
              </>
            )}
          </p>
        </div>
        <button type="button" className="messages-header__compose" aria-label="New message">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </header>
  );
}
