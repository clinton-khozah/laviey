import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppOverlay } from '@/components/ui/AppOverlay';
import { getProfilePhotoUrls } from '@/utils/profilePhotos';
import type { MatchProfileModalProps } from './MatchProfileModal.types';
import './MatchProfileModal.css';

const HEART_PATH =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

function CrushHeartIcon({ active = false }: { active?: boolean }) {
  return (
    <span
      className={`match-profile-modal__crush-heart ${active ? 'match-profile-modal__crush-heart--active' : ''}`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="match-profile-modal__crush-heart-back">
        <path d={HEART_PATH} />
      </svg>
      <svg viewBox="0 0 24 24" className="match-profile-modal__crush-heart-front">
        <path d={HEART_PATH} />
      </svg>
    </span>
  );
}

function getModalLikeLabel(
  liked: boolean,
  likedYou: boolean,
  isSubmitting: boolean,
): string {
  if (liked && likedYou) return 'Matched!';
  if (isSubmitting) return 'Sending…';
  if (liked) return 'Sent';
  return 'Send Like';
}

export function MatchProfileModal({
  open,
  mode,
  profile,
  conversation = null,
  liked = false,
  likedYou = false,
  isLoading,
  isSubmittingFlame = false,
  onClose,
  onMessage,
  onSendMessage,
  onFlame,
}: MatchProfileModalProps) {
  const photos = profile ? getProfilePhotoUrls(profile) : [];
  const [photoIndex, setPhotoIndex] = useState(0);
  const isDiscover = mode === 'discover';
  const showLikedYouHint = likedYou && !liked;
  const isMutual = liked && likedYou;
  const likeLabel = getModalLikeLabel(liked, likedYou, isSubmittingFlame);
  const firstName = profile?.name?.trim().split(' ')[0] || 'there';
  const relationStatusLabel = isMutual
    ? 'Matched'
    : liked
      ? 'Like sent'
      : likedYou
        ? 'Likes you'
        : 'New';

  const aiHiText = `Hi ${firstName} 💖`;
  const aiOptions = [
    aiHiText,
    `How's your day going, ${firstName}? 💕`,
    `Your profile caught my eye 😍`,
    `Want to chat sometime? 💗`,
  ];

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (open) setPhotoIndex(0);
  }, [open, profile?.id]);

  const goPhoto = (dir: -1 | 1) => {
    if (photos.length <= 1) return;
    setPhotoIndex((i) => (i + dir + photos.length) % photos.length);
  };

  const canRender = !isLoading && profile && (isDiscover || conversation);

  return (
    <AppOverlay>
      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              className="match-profile-modal__backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              aria-label="Close profile"
            />
            <motion.div
              className="match-profile-modal"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="match-profile-title"
            >
              <button
                type="button"
                className="match-profile-modal__close"
                onClick={onClose}
                aria-label="Close"
              >
                ×
              </button>

              {canRender && (
                <>
                  <div className="match-profile-modal__gallery">
                    <div
                      className="match-profile-modal__photos"
                      style={{ transform: `translateX(-${photoIndex * 100}%)` }}
                    >
                      {photos.map((src) => (
                        <img
                          key={src}
                          src={src}
                          alt=""
                          className="match-profile-modal__photo"
                        />
                      ))}
                    </div>

                    <div className="match-profile-modal__gallery-fade" />

                    {photos.length > 1 && (
                      <>
                        <div className="match-profile-modal__dots">
                          {photos.map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              className={`match-profile-modal__dot ${i === photoIndex ? 'match-profile-modal__dot--active' : ''}`}
                              onClick={() => setPhotoIndex(i)}
                              aria-label={`Photo ${i + 1} of ${photos.length}`}
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          className="match-profile-modal__tap match-profile-modal__tap--prev"
                          onClick={() => goPhoto(-1)}
                          aria-label="Previous photo"
                        />
                        <button
                          type="button"
                          className="match-profile-modal__tap match-profile-modal__tap--next"
                          onClick={() => goPhoto(1)}
                          aria-label="Next photo"
                        />
                      </>
                    )}

                    <div className="match-profile-modal__gallery-meta">
                      <h2 id="match-profile-title" className="match-profile-modal__name">
                        {profile.name}, {profile.age}
                        {profile.verified && (
                          <span className="match-profile-modal__verified" title="Verified">
                            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          </span>
                        )}
                      </h2>
                      <p className="match-profile-modal__distance">{profile.distance}</p>
                    </div>
                  </div>

                  <div className="match-profile-modal__body">
                    <div className="match-profile-modal__chips">
                      <span className="match-profile-modal__chip match-profile-modal__chip--like">
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="match-profile-modal__chip-heart">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                        {profile.vibeScore}% match
                      </span>
                      <span className="match-profile-modal__chip match-profile-modal__chip--status">
                        Status: {relationStatusLabel}
                      </span>
                      {showLikedYouHint && (
                        <span className="match-profile-modal__chip match-profile-modal__chip--liked-you">
                          Liked you
                        </span>
                      )}
                      {conversation?.isOnline && (
                        <span className="match-profile-modal__chip match-profile-modal__chip--online">
                          Online now
                        </span>
                      )}
                      {!isDiscover && conversation && (
                        <span className="match-profile-modal__chip">
                          Matched {conversation.matchedAt}
                        </span>
                      )}
                      {isDiscover && isMutual && (
                        <span className="match-profile-modal__chip match-profile-modal__chip--online">
                          Matched!
                        </span>
                      )}
                    </div>

                    {showLikedYouHint && (
                      <div className="match-profile-modal__liked-you-banner">
                        <p>
                          {profile.name} liked you. Send a like back to match and message.
                        </p>
                      </div>
                    )}

                    {onSendMessage && (conversation || isMutual) && (
                      <div className="match-profile-modal__ai-greeting">
                        <div className="match-profile-modal__ai-title">
                          <span className="match-profile-modal__ai-spark" aria-hidden>
                            *
                          </span>
                          AI message
                        </div>
                        <div className="match-profile-modal__ai-message">Say hi to {firstName}</div>
                        <div className="match-profile-modal__ai-sub">
                          Tap a greeting below to send it in Chat.
                        </div>
                        <div className="match-profile-modal__ai-suggestions">
                          {aiOptions.map((text) => (
                            <button
                              key={text}
                              type="button"
                              className="match-profile-modal__ai-suggestion"
                              onClick={() => onSendMessage(text)}
                            >
                              {text}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {profile.posts.length > 0 && (
                      <section className="match-profile-modal__section match-profile-modal__section--vibes">
                        <h3 className="match-profile-modal__section-title">Posts</h3>
                        <div className="match-profile-modal__post-grid">
                          {profile.posts.map((post) => {
                            const thumb =
                              post.type === 'image' ? post.src : (post.poster ?? post.src);
                            return (
                              <div
                                key={post.id}
                                className="match-profile-modal__post-thumb"
                                style={{ backgroundImage: `url(${thumb})` }}
                              >
                                {post.type === 'video' && (
                                  <span className="match-profile-modal__post-play" aria-hidden>
                                    ▶
                                  </span>
                                )}
                                {post.likeCount != null && post.likeCount > 0 && (
                                  <span className="match-profile-modal__post-likes" aria-hidden>
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                    </svg>
                                    {post.likeCount}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    )}

                    <section className="match-profile-modal__section">
                      <h3 className="match-profile-modal__section-title">About</h3>
                      <p className="match-profile-modal__bio">{profile.bio}</p>
                    </section>

                    <section className="match-profile-modal__section match-profile-modal__section--interests">
                      <h3 className="match-profile-modal__section-title">Interests</h3>
                      <div className="match-profile-modal__pills">
                        {profile.interests.map((tag) => (
                          <span key={tag} className="match-profile-modal__pill match-profile-modal__pill--tag">
                            #{tag}
                          </span>
                        ))}
                        {isDiscover ? (
                          <button
                            type="button"
                            className={`match-profile-modal__pill match-profile-modal__pill--crush ${liked || isMutual ? 'match-profile-modal__pill--crush-active' : ''}`}
                            onClick={onFlame}
                            disabled={liked || isSubmittingFlame}
                          >
                            <CrushHeartIcon active={liked || isMutual} />
                            <span>{likeLabel}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="match-profile-modal__pill match-profile-modal__pill--message"
                            onClick={() => {
                              if (onSendMessage) onSendMessage(aiHiText);
                              else onMessage?.();
                            }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                            </svg>
                            Say hi
                          </button>
                        )}
                      </div>
                    </section>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppOverlay>
  );
}
