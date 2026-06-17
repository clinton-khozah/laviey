import { useEffect, useRef } from 'react';
import { FeedItem } from '@/components/feed/FeedItem';
import { useDiscoverSwipeHint } from '@/hooks';
import type { VerticalFeedProps } from './VerticalFeed.types';
import './VerticalFeed.css';

export function VerticalFeed({
  profiles,
  likedIds,
  likedPostIds,
  iCrushSentIds,
  onFlame,
  onPostLike,
  onICrush,
  onProfileClick,
  isLocked = false,
  onNearEndOfFeed,
}: VerticalFeedProps) {
  const feedRef = useRef<HTMLElement>(null);
  const nearEndTriggeredRef = useRef(false);
  const { showSwipeHint, dismissSwipeHint } = useDiscoverSwipeHint();

  useEffect(() => {
    const el = feedRef.current;
    if (!el || !showSwipeHint) return;

    const onScroll = () => {
      if (el.scrollTop > 48) dismissSwipeHint();
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [showSwipeHint, dismissSwipeHint]);

  useEffect(() => {
    nearEndTriggeredRef.current = false;
  }, [profiles.length]);

  useEffect(() => {
    const el = feedRef.current;
    if (!el || !onNearEndOfFeed || isLocked) return;

    const onScroll = () => {
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (remaining > el.clientHeight * 0.35) {
        nearEndTriggeredRef.current = false;
        return;
      }
      if (nearEndTriggeredRef.current) return;
      nearEndTriggeredRef.current = true;
      onNearEndOfFeed();
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [onNearEndOfFeed, isLocked, profiles.length]);

  useEffect(() => {
    const el = feedRef.current;
    if (!el || !isLocked) return;

    const blockScroll = (event: Event) => {
      event.preventDefault();
    };

    el.addEventListener('wheel', blockScroll, { passive: false });
    el.addEventListener('touchmove', blockScroll, { passive: false });

    return () => {
      el.removeEventListener('wheel', blockScroll);
      el.removeEventListener('touchmove', blockScroll);
    };
  }, [isLocked]);

  return (
    <section
      ref={feedRef}
      className={`vertical-feed ${isLocked ? 'vertical-feed--locked' : ''}`}
      aria-label="Discover vibes"
    >
      {profiles.map((profile, index) => (
        <FeedItem
          key={profile.id}
          profile={profile}
          liked={likedIds.has(profile.id)}
          likedPost={likedPostIds.has(profile.posts[0]?.id ?? '')}
          iCrushSent={iCrushSentIds.has(profile.id)}
          onLike={() => onFlame(profile.id)}
          onPostLike={() => onPostLike(profile)}
          onICrush={() => onICrush?.(profile.id)}
          onProfileClick={() => onProfileClick(profile)}
          showSwipeHint={index === 0 && showSwipeHint}
        />
      ))}
    </section>
  );
}
