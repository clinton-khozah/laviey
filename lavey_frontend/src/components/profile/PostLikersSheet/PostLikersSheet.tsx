import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppOverlay } from '@/components/ui/AppOverlay';
import { contentService } from '@/services/content/contentService';
import type { PostLiker } from '@/types';
import './PostLikersSheet.css';

interface PostLikersSheetProps {
  open: boolean;
  postId: string | null;
  likeCount: number;
  isPremium: boolean;
  likedProfileIds: Set<string>;
  onClose: () => void;
  onUpgrade?: () => void;
  onLikeBack?: (profileId: string) => void;
  onChat?: (profileId: string) => void;
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

export function PostLikersSheet({
  open,
  postId,
  likeCount,
  isPremium,
  likedProfileIds,
  onClose,
  onUpgrade,
  onLikeBack,
  onChat,
}: PostLikersSheetProps) {
  const [likers, setLikers] = useState<PostLiker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !postId) {
      setLikers([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const rows = await contentService.getPostLikers(postId);
        if (!cancelled) setLikers(rows);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load likes');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, postId]);

  const handleAction = (liker: PostLiker) => {
    if (likedProfileIds.has(liker.userId)) {
      onChat?.(liker.userId);
      onClose();
      return;
    }
    onLikeBack?.(liker.userId);
  };

  return (
    <AppOverlay>
      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              className="post-likers-sheet__backdrop"
              aria-label="Close"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.div
              className="post-likers-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="post-likers-title"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            >
              <div className="post-likers-sheet__handle" aria-hidden />
              <header className="post-likers-sheet__header">
                <h2 id="post-likers-title" className="post-likers-sheet__title">
                  {likeCount} {likeCount === 1 ? 'like' : 'likes'}
                </h2>
                <button type="button" className="post-likers-sheet__close" onClick={onClose}>
                  ×
                </button>
              </header>

              {!isPremium ? (
                <div className="post-likers-sheet__free">
                  <p className="post-likers-sheet__free-text">
                    {likeCount} {likeCount === 1 ? 'person likes' : 'people like'} your post. Upgrade to
                    Platinum to see who and like them back.
                  </p>
                  {onUpgrade ? (
                    <button type="button" className="post-likers-sheet__upgrade-btn" onClick={onUpgrade}>
                      Upgrade to Platinum
                    </button>
                  ) : null}
                </div>
              ) : (
                <>
                  {loading && <p className="post-likers-sheet__status">Loading…</p>}
                  {error && <p className="post-likers-sheet__status post-likers-sheet__status--error">{error}</p>}

                  {!loading && !error && likers.length === 0 && (
                    <p className="post-likers-sheet__status">No likes yet — share your post on For You.</p>
                  )}

                  {!loading && !error && likers.length > 0 && (
                    <p className="post-likers-sheet__intro">People who liked this post</p>
                  )}

                  <ul className="post-likers-sheet__list">
                    {isPremium &&
                      likers.map((liker) => {
                        const alreadyLiked = likedProfileIds.has(liker.userId);
                        return (
                          <li key={liker.userId} className="post-likers-sheet__row">
                            <img src={liker.avatar} alt="" className="post-likers-sheet__avatar" />
                            <div className="post-likers-sheet__info">
                              <span className="post-likers-sheet__name">{liker.name}</span>
                              <span className="post-likers-sheet__hint">
                                {alreadyLiked ? 'You matched — say hi' : 'Liked your post'}
                              </span>
                            </div>
                            <button
                              type="button"
                              className={`post-likers-sheet__action ${
                                alreadyLiked
                                  ? 'post-likers-sheet__action--chat'
                                  : 'post-likers-sheet__action--like'
                              }`}
                              onClick={() => handleAction(liker)}
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
                          </li>
                        );
                      })}
                  </ul>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppOverlay>
  );
}
