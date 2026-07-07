import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FeedItem } from "@/components/feed/FeedItem";
import { useDiscoverSwipeHint } from "@/hooks";
import type { Profile } from "@/types";
import type { VerticalFeedProps } from "./VerticalFeed.types";
import "./VerticalFeed.css";

const LOOP_CHUNK = 5;
const MAX_LOOP_BUFFER = 30;
const PREFETCH_VIEWPORTS = 2.5;

interface LoopEntry {
  profile: Profile;
  key: string;
}

function profileFingerprint(profiles: Profile[]): string {
  return profiles.map((profile) => profile.id).join("|");
}

function buildLoopChunk(
  profiles: Profile[],
  startIndex: number,
  prefix: string,
  generation: number,
): LoopEntry[] {
  if (profiles.length === 0) return [];
  const count = Math.min(LOOP_CHUNK, profiles.length);
  const chunk: LoopEntry[] = [];
  for (let i = 0; i < count; i += 1) {
    const profile = profiles[(startIndex + i) % profiles.length]!;
    chunk.push({
      profile,
      key: `${prefix}-${generation}-${profile.id}-${startIndex + i}`,
    });
  }
  return chunk;
}

export function VerticalFeed({
  profiles,
  likedIds,
  likedPostIds,
  iCrushSentIds,
  onFlame,
  onPostLike,
  onICrush,
  onProfileClick,
  onMoreOptions,
  isLocked = false,
  infiniteLoop = false,
  onNearEndOfFeed,
}: VerticalFeedProps) {
  const feedRef = useRef<HTMLElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const nearEndTriggeredRef = useRef(false);
  const autoScrollRef = useRef(false);
  const headGenerationRef = useRef(0);
  const tailGenerationRef = useRef(0);
  const profilesFingerprintRef = useRef("");
  const { showSwipeHint, dismissSwipeHint } = useDiscoverSwipeHint();
  const [loopHead, setLoopHead] = useState<LoopEntry[]>([]);
  const [loopTail, setLoopTail] = useState<LoopEntry[]>([]);

  const fingerprint = useMemo(() => profileFingerprint(profiles), [profiles]);

  useEffect(() => {
    if (profilesFingerprintRef.current === fingerprint) return;
    profilesFingerprintRef.current = fingerprint;
    headGenerationRef.current = 0;
    tailGenerationRef.current = 0;
    setLoopHead([]);
    if (infiniteLoop && profiles.length >= 2) {
      tailGenerationRef.current = 1;
      setLoopTail(buildLoopChunk(profiles, 0, "tail", 1));
    } else {
      setLoopTail([]);
    }
    nearEndTriggeredRef.current = false;
  }, [fingerprint, infiniteLoop, profiles]);

  const baseEntries = useMemo(
    () => profiles.map((profile) => ({ profile, key: profile.id })),
    [profiles],
  );

  const displayEntries = useMemo(
    () => [...loopHead, ...baseEntries, ...loopTail],
    [loopHead, baseEntries, loopTail],
  );

  const extendTail = useCallback(() => {
    if (!infiniteLoop || profiles.length < 2) return;
    tailGenerationRef.current += 1;
    const offset = loopTail.length;
    setLoopTail((prev) => {
      const next = [
        ...prev,
        ...buildLoopChunk(profiles, offset, "tail", tailGenerationRef.current),
      ];
      return next.length > MAX_LOOP_BUFFER
        ? next.slice(-MAX_LOOP_BUFFER)
        : next;
    });
  }, [infiniteLoop, profiles, loopTail.length]);

  const extendHead = useCallback(() => {
    const el = feedRef.current;
    if (!el || !infiniteLoop || profiles.length < 2) return;

    const scrollBefore = el.scrollHeight;
    headGenerationRef.current += 1;
    const count = Math.min(LOOP_CHUNK, profiles.length);
    const startIdx =
      (profiles.length -
        (loopHead.length % profiles.length) -
        1 +
        profiles.length) %
      profiles.length;

    const chunk: LoopEntry[] = [];
    for (let i = 0; i < count; i += 1) {
      const idx = (startIdx - i + profiles.length * 10) % profiles.length;
      const profile = profiles[idx]!;
      chunk.unshift({
        profile,
        key: `head-${headGenerationRef.current}-${profile.id}-${loopHead.length + i}`,
      });
    }

    setLoopHead((prev) => {
      const next = [...chunk, ...prev];
      return next.length > MAX_LOOP_BUFFER
        ? next.slice(0, MAX_LOOP_BUFFER)
        : next;
    });

    requestAnimationFrame(() => {
      el.scrollTop += el.scrollHeight - scrollBefore;
    });
  }, [infiniteLoop, profiles, loopHead.length]);

  useEffect(() => {
    const el = feedRef.current;
    if (!el || !showSwipeHint) return;

    const onScroll = () => {
      if (el.scrollTop > 48) dismissSwipeHint();
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [showSwipeHint, dismissSwipeHint]);

  useEffect(() => {
    nearEndTriggeredRef.current = false;
  }, [profiles.length, fingerprint]);

  useEffect(() => {
    const el = feedRef.current;
    if (!el || !onNearEndOfFeed || isLocked) return;

    const onScroll = () => {
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
      const prefetchDistance = el.clientHeight * PREFETCH_VIEWPORTS;
      if (remaining > prefetchDistance) {
        nearEndTriggeredRef.current = false;
        return;
      }
      if (nearEndTriggeredRef.current) return;
      nearEndTriggeredRef.current = true;
      onNearEndOfFeed();
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => el.removeEventListener("scroll", onScroll);
  }, [
    onNearEndOfFeed,
    isLocked,
    profiles.length,
    fingerprint,
    displayEntries.length,
  ]);

  useEffect(() => {
    if (!infiniteLoop || isLocked || profiles.length < 2) return;

    const root = feedRef.current;
    const top = topSentinelRef.current;
    const bottom = bottomSentinelRef.current;
    if (!root || !top || !bottom) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (entry.target === top) extendHead();
          if (entry.target === bottom) extendTail();
        }
      },
      {
        root,
        rootMargin: "120% 0px",
        threshold: 0.01,
      },
    );

    observer.observe(top);
    observer.observe(bottom);

    return () => observer.disconnect();
  }, [
    extendHead,
    extendTail,
    infiniteLoop,
    isLocked,
    profiles.length,
    fingerprint,
  ]);

  useEffect(() => {
    if (isLocked || !onNearEndOfFeed) return;
    if (profiles.length > 0 && profiles.length < 8) {
      onNearEndOfFeed();
    }
  }, [isLocked, onNearEndOfFeed, profiles.length, fingerprint]);

  useEffect(() => {
    const el = feedRef.current;
    if (!el || isLocked) return;

    let snapLock = false;
    let unlockTimer: number | null = null;
    let touchStartY: number | null = null;
    let touchStartX: number | null = null;
    let touchCurrentY: number | null = null;

    const feedItems = () =>
      Array.from(el.querySelectorAll<HTMLElement>(".feed-item"));

    const activeIndex = () => {
      const items = feedItems();
      if (items.length === 0) return 0;

      const scrollTop = el.scrollTop;
      let best = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (let i = 0; i < items.length; i += 1) {
        const distance = Math.abs(items[i]!.offsetTop - scrollTop);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      }

      return best;
    };

    const releaseSnapLock = () => {
      snapLock = false;
      autoScrollRef.current = false;
      if (unlockTimer !== null) {
        window.clearTimeout(unlockTimer);
        unlockTimer = null;
      }
    };

    const lockSnap = () => {
      snapLock = true;
      autoScrollRef.current = true;
      if (unlockTimer !== null) window.clearTimeout(unlockTimer);
      unlockTimer = window.setTimeout(releaseSnapLock, 420);
    };

    const scrollToIndex = (index: number) => {
      const items = feedItems();
      const target = items[index];
      if (!target || autoScrollRef.current) return;

      lockSnap();
      el.scrollTo({ top: target.offsetTop, behavior: "smooth" });
    };

    const advanceBy = (direction: 1 | -1) => {
      const items = feedItems();
      if (items.length <= 1) return;

      const current = activeIndex();
      const next = Math.max(0, Math.min(items.length - 1, current + direction));

      if (next === current) return;
      scrollToIndex(next);
    };

    const onWheel = (event: WheelEvent) => {
      if (snapLock) {
        event.preventDefault();
        return;
      }

      if (Math.abs(event.deltaY) < 8) return;

      const direction = event.deltaY > 0 ? 1 : -1;

      event.preventDefault();
      advanceBy(direction);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (snapLock || event.touches.length !== 1) {
        touchStartY = null;
        touchStartX = null;
        touchCurrentY = null;
        return;
      }

      const touch = event.touches[0]!;
      touchStartY = touch.clientY;
      touchStartX = touch.clientX;
      touchCurrentY = touch.clientY;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (touchStartY === null || touchStartX === null || event.touches.length !== 1) {
        return;
      }

      const touch = event.touches[0]!;
      touchCurrentY = touch.clientY;
      const deltaY = touch.clientY - touchStartY;
      const deltaX = touch.clientX - touchStartX;

      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 6) {
        event.preventDefault();
      }
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (touchStartY === null || touchCurrentY === null) return;

      const deltaY = touchCurrentY - touchStartY;
      touchStartY = null;
      touchStartX = null;
      touchCurrentY = null;

      if (snapLock || Math.abs(deltaY) < 42) return;

      event.preventDefault();
      advanceBy(deltaY < 0 ? 1 : -1);
    };

    const onTouchCancel = () => {
      touchStartY = null;
      touchStartX = null;
      touchCurrentY = null;
    };

    const onScrollEnd = () => releaseSnapLock();

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    el.addEventListener("touchcancel", onTouchCancel, { passive: true });
    el.addEventListener("scrollend", onScrollEnd);

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchCancel);
      el.removeEventListener("scrollend", onScrollEnd);
      releaseSnapLock();
    };
  }, [isLocked, displayEntries.length, fingerprint]);

  useEffect(() => {
    const el = feedRef.current;
    if (!el || !isLocked) return;

    const blockScroll = (event: Event) => {
      event.preventDefault();
    };

    el.addEventListener("wheel", blockScroll, { passive: false });
    el.addEventListener("touchmove", blockScroll, { passive: false });

    return () => {
      el.removeEventListener("wheel", blockScroll);
      el.removeEventListener("touchmove", blockScroll);
    };
  }, [isLocked]);

  const swipeHintIndex = loopHead.length;

  return (
    <section
      ref={feedRef}
      className={`vertical-feed ${isLocked ? "vertical-feed--locked" : ""}`}
      aria-label="Discover vibes"
    >
      {infiniteLoop && profiles.length >= 2 ? (
        <div
          ref={topSentinelRef}
          className="vertical-feed__sentinel"
          aria-hidden
        />
      ) : null}

      {displayEntries.map((entry, index) => (
        <FeedItem
          key={entry.key}
          profile={entry.profile}
          liked={likedIds.has(entry.profile.id)}
          likedPost={likedPostIds.has(entry.profile.posts[0]?.id ?? "")}
          iCrushSent={iCrushSentIds.has(entry.profile.id)}
          onLike={() => onFlame(entry.profile.id)}
          onPostLike={() => onPostLike(entry.profile)}
          onICrush={() => onICrush?.(entry.profile.id)}
          onProfileClick={() => onProfileClick(entry.profile)}
          onMoreOptions={() => onMoreOptions(entry.profile)}
          showSwipeHint={index === swipeHintIndex && showSwipeHint}
        />
      ))}

      {infiniteLoop && profiles.length >= 2 ? (
        <div
          ref={bottomSentinelRef}
          className="vertical-feed__sentinel"
          aria-hidden
        />
      ) : null}
    </section>
  );
}
