import { FeedProfilePersonIcon } from '@/components/feed/FeedProfilePlaceholder/FeedProfilePersonIcon';
import './FeedProfileAvatar.css';

interface FeedProfileAvatarProps {
  name: string;
  src?: string;
  className?: string;
  size?: 'sm' | 'list' | 'hero';
}

export function FeedProfileAvatar({
  name,
  src,
  className = '',
  size = 'list',
}: FeedProfileAvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`feed-profile-avatar feed-profile-avatar--${size} ${className}`.trim()}
      />
    );
  }

  return (
    <span
      className={`feed-profile-avatar feed-profile-avatar--${size} ${className}`.trim()}
      aria-hidden
      title={name}
    >
      <span className="feed-profile-avatar__icon">
        <FeedProfilePersonIcon />
      </span>
    </span>
  );
}
