import './FeedProfilePlaceholder.css';

interface FeedProfilePlaceholderProps {
  name?: string;
}

export function FeedProfilePlaceholder({ name }: FeedProfilePlaceholderProps) {
  return (
    <div
      className="feed-profile-placeholder"
      role="img"
      aria-label={name ? `${name} has no profile photo yet` : 'No profile photo'}
    >
      <div className="feed-profile-placeholder__glow" aria-hidden />
      <div className="feed-profile-placeholder__ring" aria-hidden />
      <div className="feed-profile-placeholder__card">
        <span className="feed-profile-placeholder__icon" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="8" r="4.25" fill="currentColor" opacity="0.92" />
            <path
              d="M5.5 20.5c.6-3.4 3.1-5.5 6.5-5.5s5.9 2.1 6.5 5.5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </div>
    </div>
  );
}
