import { useEffect, useMemo, useRef, useState, type PointerEvent, type TouchEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppOverlay } from '@/components/ui/AppOverlay';
import { FeedProfileAvatar } from '@/components/feed/FeedProfileAvatar';
import { LogoLoader } from '@/components/ui/LogoLoader';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { useMatchGreetings } from '@/hooks/match/useMatchGreetings';
import { profileService } from '@/services';
import { notifyNotificationInboxChanged } from '@/utils/notifications/profileViewNotifications';
import { getProfilePhotoUrls } from '@/utils/profilePhotos';
import { getDisplayableProfileDistance } from '@/utils/discover/discoverDistanceTiers';
import { getProfileIdentityChips } from '@/utils/profile/profileIdentityLabels';
import { MatchProfilePhotoViewer } from './MatchProfilePhotoViewer';
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

const SWIPE_THRESHOLD_PX = 40;

function usePhotoSwipe(
  photoCount: number,
  onSwipe: (direction: -1 | 1) => void,
): {
  onTouchStart: (event: TouchEvent) => void;
  onTouchEnd: (event: TouchEvent) => void;
  onPointerDown: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
} {
  const startXRef = useRef<number | null>(null);

  const handleStart = (clientX: number) => {
    startXRef.current = clientX;
  };

  const handleEnd = (clientX: number) => {
    if (startXRef.current === null || photoCount <= 1) return;
    const delta = clientX - startXRef.current;
    startXRef.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    onSwipe(delta < 0 ? 1 : -1);
  };

  return {
    onTouchStart: (event) => handleStart(event.touches[0]?.clientX ?? 0),
    onTouchEnd: (event) => handleEnd(event.changedTouches[0]?.clientX ?? 0),
    onPointerDown: (event) => {
      if (event.pointerType === 'touch') return;
      handleStart(event.clientX);
    },
    onPointerUp: (event) => {
      if (event.pointerType === 'touch') return;
      handleEnd(event.clientX);
    },
  };
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
  const [fullscreenPhotoIndex, setFullscreenPhotoIndex] = useState<number | null>(null);
  const isDiscover = mode === 'discover';
  const showLikedYouHint = likedYou && !liked;
  const isMutual = liked && likedYou;
  const likeLabel = getModalLikeLabel(liked, likedYou, isSubmittingFlame);
  const firstName = profile?.name?.trim().split(' ')[0] || 'there';
  const showGreetings = Boolean(onSendMessage && (conversation || isMutual));
  const greetingContext = useMemo(
    () => ({
      bio: profile?.bio,
      interests: profile?.interests,
    }),
    [profile?.bio, profile?.interests],
  );
  const greetingSuggestions = useMatchGreetings(
    profile?.name ?? '',
    open && showGreetings,
    greetingContext,
  );
  const distanceLabel = profile ? getDisplayableProfileDistance(profile) : null;
  const identityChips = useMemo(
    () => (profile ? getProfileIdentityChips(profile) : []),
    [profile],
  );
  const relationStatusLabel = isMutual
    ? 'Matched'
    : liked
      ? 'Like sent'
      : likedYou
        ? 'Likes you'
        : 'New';

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (open) setPhotoIndex(0);
    if (!open) setFullscreenPhotoIndex(null);
  }, [open, profile?.id]);

  useEffect(() => {
    if (!open || !profile || !isDiscover) return;

    void profileService
      .recordProfileView(profile.id)
      .then(() => notifyNotificationInboxChanged())
      .catch(() => {});
  }, [open, profile?.id, isDiscover]);

  const goPhoto = (direction: -1 | 1) => {
    if (photos.length <= 1) return;
    setPhotoIndex((current) => (current + direction + photos.length) % photos.length);
  };

  const gallerySwipe = usePhotoSwipe(photos.length, goPhoto);

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

              {isLoading && (
                <div className="match-profile-modal__loading" aria-busy="true">
                  <LogoLoader label="Loading profile" />
                </div>
              )}

              {canRender && (
                <>
                  <div
                    className={`match-profile-modal__gallery ${photos.length === 0 ? 'match-profile-modal__gallery--placeholder' : ''}`}
                    {...(photos.length > 0 ? gallerySwipe : {})}
                  >
                    {photos.length === 0 ? (
                      <FeedProfileAvatar name={profile.name} size="hero" />
                    ) : (
                      <>
                        <div
                          className="match-profile-modal__photos"
                          style={{ transform: `translateX(-${photoIndex * 100}%)` }}
                        >
                          {photos.map((src) => (
                            <div key={src} className="match-profile-modal__photo-slot">
                              <img src={src} alt="" className="match-profile-modal__photo" />
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          className="match-profile-modal__expand"
                          onClick={() => setFullscreenPhotoIndex(photoIndex)}
                          aria-label="View photo full screen"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3" />
                          </svg>
                        </button>

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
                      </>
                    )}
                  </div>

                  <div className="match-profile-modal__body">
                    <div className="match-profile-modal__header-meta">
                      <h2 id="match-profile-title" className="match-profile-modal__name">
                        {profile.name}
                        {profile.age > 0 ? `, ${profile.age}` : ''}
                        {profile.verified && (
                          <VerifiedBadge size="md" className="match-profile-modal__verified" />
                        )}
                      </h2>
                      {distanceLabel ? (
                        <p className="match-profile-modal__distance">{distanceLabel}</p>
                      ) : null}
                    </div>

                    <div className="match-profile-modal__chips">
                      {identityChips.map((chip) => (
                        <span
                          key={chip.key}
                          className="match-profile-modal__chip match-profile-modal__chip--identity"
                        >
                          {chip.label}
                        </span>
                      ))}
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

                    {showGreetings && (
                      <div className="match-profile-modal__greetings">
                        <p className="match-profile-modal__greeting-hint">
                          Say hi to {firstName} · tap to send
                        </p>
                        <div className="match-profile-modal__greeting-suggestions">
                          {greetingSuggestions.map((text, index) => (
                            <button
                              key={`${index}-${text}`}
                              type="button"
                              className="match-profile-modal__greeting-suggestion"
                              onClick={() => onSendMessage?.(text)}
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
                              const greeting = greetingSuggestions[0] ?? `Hi ${firstName} 💖`;
                              if (onSendMessage) onSendMessage(greeting);
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

            {fullscreenPhotoIndex !== null && photos.length > 0 ? (
              <MatchProfilePhotoViewer
                photos={photos}
                index={fullscreenPhotoIndex}
                onClose={() => setFullscreenPhotoIndex(null)}
                onIndexChange={(nextIndex) => {
                  setFullscreenPhotoIndex(nextIndex);
                  setPhotoIndex(nextIndex);
                }}
              />
            ) : null}
          </>
        )}
      </AnimatePresence>
    </AppOverlay>
  );
}
