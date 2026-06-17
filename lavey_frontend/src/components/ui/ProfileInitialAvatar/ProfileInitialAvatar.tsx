import { profileNameInitial } from '@/utils/profile/feedMedia';
import './ProfileInitialAvatar.css';

interface ProfileInitialAvatarProps {
  name: string;
  src?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'feed';
}

export function ProfileInitialAvatar({
  name,
  src,
  className = '',
  size = 'md',
}: ProfileInitialAvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`profile-initial-avatar profile-initial-avatar--${size} ${className}`.trim()}
      />
    );
  }

  return (
    <span
      className={`profile-initial-avatar profile-initial-avatar--${size} ${className}`.trim()}
      aria-hidden
    >
      {profileNameInitial(name)}
    </span>
  );
}
