import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { ProfileInitialAvatar } from '@/components/ui/ProfileInitialAvatar';
import type { Profile } from '@/types';
import { hasFeedDisplayMedia } from '@/utils/profile/feedMedia';
import './ReceivedLikesSheet.css';

interface ReceivedLikesSheetProps {
  open: boolean;
  likers: Profile[];
  likedProfileIds: Set<string>;
  onClose: () => void;
  onLikeBack: (profileId: string) => void;
  onChat: (profileId: string) => void;
  onProfileClick?: (profile: Profile) => void;
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

export function ReceivedLikesSheet({
  open,
  likers,
  likedProfileIds,
  onClose,
  onLikeBack,
  onChat,
  onProfileClick,
}: ReceivedLikesSheetProps) {
  const count = likers.length;

  const handleRowAction = (profile: Profile) => {
    if (likedProfileIds.has(profile.id)) {
      onChat(profile.id);
      onClose();
      return;
    }
    onLikeBack(profile.id);
  };

  return (
    <ProfileSheet open={open} title={`${count} ${count === 1 ? 'like' : 'likes'}`} onClose={onClose} hideHandle>
      <div className="received-likes-sheet">
        <p className="received-likes-sheet__premium-intro">
          People who liked you on For You
        </p>
        {count === 0 ? (
          <p className="received-likes-sheet__empty">No likes yet — keep swiping on For You.</p>
        ) : (
          <ul className="received-likes-sheet__list">
            {likers.map((p) => {
              const alreadyLiked = likedProfileIds.has(p.id);
              const avatarSrc = hasFeedDisplayMedia(p.avatar) ? p.avatar : undefined;
              return (
                <li key={p.id}>
                  <div className="received-likes-sheet__row received-likes-sheet__row--revealed">
                    <button
                      type="button"
                      className="received-likes-sheet__row-main"
                      onClick={() => onProfileClick?.(p)}
                    >
                      <ProfileInitialAvatar
                        name={p.name}
                        src={avatarSrc}
                        className="received-likes-sheet__avatar"
                        size="md"
                      />
                      <div className="received-likes-sheet__info">
                        <span className="received-likes-sheet__name">
                          {p.name}, {p.age}
                        </span>
                        <span className="received-likes-sheet__meta">
                          <HeartIcon />
                          {alreadyLiked ? 'Matched' : `${p.vibeScore}% vibe`}
                        </span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`received-likes-sheet__action ${
                        alreadyLiked
                          ? 'received-likes-sheet__action--chat'
                          : 'received-likes-sheet__action--like'
                      }`}
                      onClick={() => handleRowAction(p)}
                    >
                      {alreadyLiked ? (
                        'Chat'
                      ) : (
                        <>
                          <HeartIcon />
                          Like back
                        </>
                      )}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ProfileSheet>
  );
}
