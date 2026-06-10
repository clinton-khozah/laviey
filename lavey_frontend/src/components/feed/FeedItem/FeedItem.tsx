import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ActionRail } from '@/components/feed/ActionRail';
import { ProfileOverlay } from '@/components/feed/ProfileOverlay';
import { useDoubleTap, useInView } from '@/hooks';
import type { FeedItemProps } from './FeedItem.types';
import './FeedItem.css';

const DEFAULT_CLIP_SECONDS = 10;

export function FeedItem({
  profile,
  liked,
  likedPost: _likedPost,
  onLike,
  onPostLike: _onPostLike,
  onCollab,
  onProfileClick,
  showSwipeHint = false,
}: FeedItemProps) {
  const post =
    profile.posts?.[0] ??
    ({
      id: `fallback-${profile.id}`,
      type: 'image',
      src: profile.avatar,
      poster: profile.avatar,
    } as const);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { ref, inView } = useInView(0.72);
  const [progress, setProgress] = useState(0);
  const [heartBurst, setHeartBurst] = useState(false);
  const maxDuration = post.type === 'video' ? (post.durationSec ?? DEFAULT_CLIP_SECONDS) : DEFAULT_CLIP_SECONDS;

  const triggerHeart = () => {
    setHeartBurst(true);
    if (!liked) onLike();
    setTimeout(() => setHeartBurst(false), 900);
  };

  const { onPointerUp } = useDoubleTap(triggerHeart);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || post.type !== 'video') return;

    if (inView) {
      video.currentTime = 0;
      video.play().catch(() => {});
    } else {
      video.pause();
      setProgress(0);
    }
  }, [inView, post.type]);

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
    <article className="feed-item" ref={ref} onPointerUp={onPointerUp}>
      {post.type === 'video' ? (
        <>
          <div className="feed-item__progress-track">
            <motion.div
              className="feed-item__progress-fill"
              style={{ scaleX: progress }}
            />
          </div>
          <video
            ref={videoRef}
            className="feed-item__media"
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
          className="feed-item__media feed-item__media--image"
          style={{ backgroundImage: `url(${post.src})` }}
        />
      )}

      <div className="feed-item__gradient feed-item__gradient--top" />
      <div className="feed-item__gradient feed-item__gradient--bottom" />

      <AnimatePresence>
        {heartBurst && (
          <motion.div
            className="feed-item__heart-burst"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            exit={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      <ProfileOverlay profile={profile} />
      <ActionRail
        profile={profile}
        liked={liked}
        onLike={onLike}
        onCollab={onCollab}
        onProfileClick={onProfileClick}
      />

      <AnimatePresence>
        {showSwipeHint && (
          <motion.div
            className="feed-item__swipe-hint"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 0.85, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35 }}
            aria-hidden
          >
            <motion.span
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            </motion.span>
            <span>Swipe up</span>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}
