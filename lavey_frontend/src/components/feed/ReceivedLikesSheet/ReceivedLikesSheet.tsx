import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { MOCK_PROFILES } from '@/services/mocks/profile.mock';
import { MOCK_RECEIVED_LIKE_PROFILE_IDS } from '@/services/mocks/likes.mock';
import type { Profile } from '@/types';
import './ReceivedLikesSheet.css';

interface ReceivedLikesSheetProps {
  open: boolean;
  isPremium: boolean;
  likedProfileIds: Set<string>;
  onClose: () => void;
  onUpgrade: () => void;
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

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </svg>
  );
}

export function ReceivedLikesSheet({
  open,
  isPremium,
  likedProfileIds,
  onClose,
  onUpgrade,
  onLikeBack,
  onChat,
  onProfileClick,
}: ReceivedLikesSheetProps) {
  const likers = MOCK_RECEIVED_LIKE_PROFILE_IDS.map((id) =>
    MOCK_PROFILES.find((p) => p.id === id),
  ).filter((p): p is Profile => Boolean(p));

  const count = likers.length;
  const previewAvatars = likers.slice(0, 5);

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
        {!isPremium ? (
          <div className="received-likes-sheet__free">
            <div className="received-likes-sheet__hero">
              <span className="received-likes-sheet__hero-icon" aria-hidden>
                <HeartIcon />
              </span>
              <h3 className="received-likes-sheet__hero-title">
                {count} {count === 1 ? 'person likes' : 'people like'} you
              </h3>
              <p className="received-likes-sheet__hero-text">
                Upgrade to Platinum to see who liked you and like them back.
              </p>
            </div>

            <div className="received-likes-sheet__preview" aria-hidden>
              <div className="received-likes-sheet__avatar-stack">
                {previewAvatars.map((p, i) => (
                  <span
                    key={p.id}
                    className="received-likes-sheet__stack-item"
                    style={{ zIndex: previewAvatars.length - i }}
                  >
                    <img src={p.avatar} alt="" />
                  </span>
                ))}
                <span className="received-likes-sheet__stack-lock" aria-hidden>
                  <LockIcon />
                </span>
              </div>
              <p className="received-likes-sheet__preview-hint">
                {count} hidden {count === 1 ? 'profile' : 'profiles'} · tap upgrade to reveal
              </p>
            </div>

            <button type="button" className="received-likes-sheet__upgrade-btn" onClick={onUpgrade}>
              Upgrade to Platinum
            </button>
          </div>
        ) : (
          <>
            <p className="received-likes-sheet__premium-intro">
              People who liked you on For You
            </p>
            <ul className="received-likes-sheet__list">
              {likers.map((p) => {
                const alreadyLiked = likedProfileIds.has(p.id);
                return (
                  <li key={p.id}>
                    <div className="received-likes-sheet__row received-likes-sheet__row--revealed">
                      <button
                        type="button"
                        className="received-likes-sheet__row-main"
                        onClick={() => onProfileClick?.(p)}
                      >
                        <img src={p.avatar} alt="" className="received-likes-sheet__avatar" />
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
          </>
        )}
      </div>
    </ProfileSheet>
  );
}
