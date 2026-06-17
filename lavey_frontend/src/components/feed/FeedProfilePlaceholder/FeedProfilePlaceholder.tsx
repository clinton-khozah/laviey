import { FeedProfilePersonIcon } from './FeedProfilePersonIcon';
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
          <FeedProfilePersonIcon />
        </span>
      </div>
    </div>
  );
}
