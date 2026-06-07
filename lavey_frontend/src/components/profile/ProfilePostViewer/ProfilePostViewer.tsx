import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppOverlay } from '@/components/ui/AppOverlay';
import { contentService } from '@/services/content/contentService';
import type { ProfilePost } from '@/types';
import { copyPostLink, downloadPostToDevice } from '@/utils/media/downloadPostMedia';
import { formatLikeCount } from '@/utils/profile/formatLikeCount';
import { PostLikersSheet } from '@/components/profile/PostLikersSheet';
import { PostOptionsMenu, type PostMenuAction } from './PostOptionsMenu';
import './ProfilePostViewer.css';

interface ProfilePostViewerProps {
  posts: ProfilePost[];
  activePostId: string | null;
  isOwner?: boolean;
  isPremium?: boolean;
  likedProfileIds?: Set<string>;
  onClose: () => void;
  onChangePost?: (postId: string) => void;
  onDeletePost?: (postId: string) => void | Promise<void>;
  onHidePost?: (postId: string) => void | Promise<void>;
  onLikeBack?: (profileId: string) => void;
  onChat?: (profileId: string) => void;
  onUpgrade?: () => void;
}

const DEFAULT_CLIP_SECONDS = 10;

interface PostViewerSlideProps {
  post: ProfilePost;
  isActive: boolean;
  slideRef: (el: HTMLElement | null) => void;
}

function PostViewerSlide({ post, isActive, slideRef }: PostViewerSlideProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);
  const maxDuration = post.type === 'video' ? (post.durationSec ?? DEFAULT_CLIP_SECONDS) : DEFAULT_CLIP_SECONDS;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || post.type !== 'video') return;

    if (isActive) {
      video.currentTime = 0;
      setProgress(0);
      video.play().catch(() => {});
    } else {
      video.pause();
      setProgress(0);
    }
  }, [isActive, post.type]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.currentTime >= maxDuration) {
      video.currentTime = 0;
      video.play().catch(() => {});
    }
    setProgress(Math.min(video.currentTime / maxDuration, 1));
  };

  return (
    <article className="profile-post-viewer__slide" ref={slideRef}>
      {post.type === 'video' ? (
        <>
          {isActive && (
            <div className="profile-post-viewer__progress-track" aria-hidden>
              <span
                className="profile-post-viewer__progress-fill"
                style={{ transform: `scaleX(${progress})` }}
              />
            </div>
          )}
          <video
            ref={videoRef}
            className="profile-post-viewer__media"
            src={post.src}
            poster={post.poster}
            muted
            playsInline
            loop={false}
            preload="metadata"
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => {
              const v = videoRef.current;
              if (v) {
                v.currentTime = 0;
                v.play().catch(() => {});
              }
            }}
          />
        </>
      ) : (
        <div
          className="profile-post-viewer__media profile-post-viewer__media--image"
          style={{ backgroundImage: `url(${post.src})` }}
        />
      )}

      <div className="profile-post-viewer__gradient profile-post-viewer__gradient--top" aria-hidden />
      <div className="profile-post-viewer__gradient profile-post-viewer__gradient--bottom" aria-hidden />
    </article>
  );
}

export function ProfilePostViewer({
  posts,
  activePostId,
  isOwner = false,
  isPremium = false,
  likedProfileIds = new Set(),
  onClose,
  onChangePost,
  onDeletePost,
  onHidePost,
  onLikeBack,
  onChat,
  onUpgrade,
}: ProfilePostViewerProps) {
  const feedRef = useRef<HTMLDivElement>(null);
  const slideNodesRef = useRef<Map<string, HTMLElement>>(new Map());
  const scrollSyncRef = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);
  const [likersPostId, setLikersPostId] = useState<string | null>(null);

  const activeIndex = activePostId ? posts.findIndex((p) => p.id === activePostId) : -1;
  const post = activeIndex >= 0 ? posts[activeIndex] : null;
  const open = post !== null;

  const registerSlideRef = (postId: string) => (el: HTMLElement | null) => {
    if (el) slideNodesRef.current.set(postId, el);
    else slideNodesRef.current.delete(postId);
  };

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const node = slideNodesRef.current.get(posts[activeIndex].id);
    if (!node || !feedRef.current) return;

    scrollSyncRef.current = true;
    node.scrollIntoView({ behavior: 'instant', block: 'start' });
    requestAnimationFrame(() => {
      scrollSyncRef.current = false;
    });
  }, [open, activePostId, activeIndex, posts]);

  useEffect(() => {
    const el = feedRef.current;
    if (!el || !open) return;

    const onScroll = () => {
      if (scrollSyncRef.current) return;
      const index = Math.round(el.scrollTop / el.clientHeight);
      const nextId = posts[index]?.id;
      if (nextId && nextId !== activePostId) onChangePost?.(nextId);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [open, posts, activePostId, onChangePost]);

  useEffect(() => {
    if (!open) {
      setMenuOpen(false);
      setDeleteConfirmOpen(false);
      setActionStatus(null);
      setActionError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteConfirmOpen) {
          setDeleteConfirmOpen(false);
          return;
        }
        if (menuOpen) {
          setMenuOpen(false);
          return;
        }
        onClose();
        return;
      }
      if (menuOpen || deleteConfirmOpen) return;
      if (e.key === 'ArrowUp' && activeIndex > 0) {
        onChangePost?.(posts[activeIndex - 1].id);
      }
      if (e.key === 'ArrowDown' && activeIndex >= 0 && activeIndex < posts.length - 1) {
        onChangePost?.(posts[activeIndex + 1].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, activeIndex, posts, onClose, onChangePost, menuOpen, deleteConfirmOpen]);

  const confirmDeletePost = async () => {
    if (!post || isActionPending) return;

    setActionError(null);
    setIsActionPending(true);
    try {
      await onDeletePost?.(post.id);
      setDeleteConfirmOpen(false);
      onClose();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete post');
      setDeleteConfirmOpen(false);
    } finally {
      setIsActionPending(false);
    }
  };

  const handleMenuAction = async (action: PostMenuAction) => {
    if (!post || isActionPending) return;

    if (action === 'delete') {
      setMenuOpen(false);
      setDeleteConfirmOpen(true);
      return;
    }

    setActionError(null);
    setActionStatus(null);

    try {
      setIsActionPending(true);

      switch (action) {
        case 'save':
          await downloadPostToDevice(post);
          setActionStatus('Saved to your device');
          break;
        case 'copyLink':
          await copyPostLink(post);
          setActionStatus('Link copied');
          break;
        case 'hide':
          setMenuOpen(false);
          await contentService.updatePostVisibility(post.id, false);
          await onHidePost?.(post.id);
          onClose();
          break;
        case 'onlyMe':
          setMenuOpen(false);
          await contentService.updatePostVisibility(post.id, false);
          await onHidePost?.(post.id);
          onClose();
          break;
        default:
          break;
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsActionPending(false);
    }
  };

  return (
    <AppOverlay>
      <AnimatePresence>
        {open && post && (
          <motion.div
            className="profile-post-viewer"
            role="dialog"
            aria-modal
            aria-label={post.type === 'video' ? 'Video post' : 'Photo'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div ref={feedRef} className="profile-post-viewer__feed" aria-label="Your posts">
              {posts.map((item) => (
                <PostViewerSlide
                  key={item.id}
                  post={item}
                  isActive={item.id === activePostId}
                  slideRef={registerSlideRef(item.id)}
                />
              ))}
            </div>

            <div className="profile-post-viewer__chrome">
              <div className="profile-post-viewer__top-bar">
                <button
                  type="button"
                  className="profile-post-viewer__icon-btn profile-post-viewer__icon-btn--close"
                  onClick={onClose}
                  aria-label="Close"
                >
                  ×
                </button>
                <div className="profile-post-viewer__menu-anchor">
                  <button
                    type="button"
                    className={`profile-post-viewer__icon-btn ${menuOpen ? 'profile-post-viewer__icon-btn--active' : ''}`}
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-label="Post options"
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                    disabled={isActionPending}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <circle cx="12" cy="5" r="1.75" />
                      <circle cx="12" cy="12" r="1.75" />
                      <circle cx="12" cy="19" r="1.75" />
                    </svg>
                  </button>
                  <PostOptionsMenu
                    open={menuOpen}
                    postType={post.type}
                    onClose={() => setMenuOpen(false)}
                    onAction={(action) => handleMenuAction(action)}
                  />
                </div>
              </div>

              <div className="profile-post-viewer__footer">
                <span className="profile-post-viewer__counter">
                  {activeIndex + 1} / {posts.length}
                </span>
                {isOwner ? (
                  <button
                    type="button"
                    className="profile-post-viewer__likes profile-post-viewer__likes--btn"
                    onClick={() => setLikersPostId(post.id)}
                    aria-label={`${post.likeCount ?? 0} likes — view who liked`}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="profile-post-viewer__likes-icon">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    {formatLikeCount(post.likeCount ?? 0)}
                  </button>
                ) : (
                  <span className="profile-post-viewer__likes">
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="profile-post-viewer__likes-icon">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    {formatLikeCount(post.likeCount ?? 0)}
                  </span>
                )}
              </div>

              {(actionStatus || actionError) && (
                <p
                  className={`profile-post-viewer__toast ${actionError ? 'profile-post-viewer__toast--error' : ''}`}
                  role="status"
                >
                  {actionError ?? actionStatus}
                </p>
              )}
            </div>

            <AnimatePresence>
              {deleteConfirmOpen && (
                <motion.div
                  className="profile-post-viewer__confirm"
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby="post-delete-title"
                  aria-describedby="post-delete-desc"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="profile-post-viewer__confirm-card">
                    <h3 id="post-delete-title" className="profile-post-viewer__confirm-title">
                      Delete this post?
                    </h3>
                    <p id="post-delete-desc" className="profile-post-viewer__confirm-copy">
                      This will permanently remove it from your profile. This can&apos;t be undone.
                    </p>
                    <div className="profile-post-viewer__confirm-actions">
                      <button
                        type="button"
                        className="profile-post-viewer__confirm-btn profile-post-viewer__confirm-btn--cancel"
                        disabled={isActionPending}
                        onClick={() => setDeleteConfirmOpen(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="profile-post-viewer__confirm-btn profile-post-viewer__confirm-btn--delete"
                        disabled={isActionPending}
                        onClick={() => void confirmDeletePost()}
                      >
                        {isActionPending ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <PostLikersSheet
        open={likersPostId !== null}
        postId={likersPostId}
        likeCount={posts.find((p) => p.id === likersPostId)?.likeCount ?? 0}
        isPremium={isPremium}
        likedProfileIds={likedProfileIds}
        onClose={() => setLikersPostId(null)}
        onUpgrade={onUpgrade}
        onLikeBack={onLikeBack}
        onChat={onChat}
      />
    </AppOverlay>
  );
}
