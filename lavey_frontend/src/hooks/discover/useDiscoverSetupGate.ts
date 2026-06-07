import { useCallback, useEffect, useMemo, useState } from 'react';
import { hasCustomProfileAvatar, isDiscoverProfileReady } from '@/utils/discover/discoverProfileReady';
import {
  hasFinishedDiscoverSetup,
  hasSeenDiscoverFeedPeek,
  hasSkippedDiscoverSetup,
  markDiscoverFeedPeek,
  markDiscoverSetupFinished,
  markDiscoverSetupSkipped,
} from '@/utils/discover/discoverSetupStorage';
import type { UserProfile } from '@/types';

/** Brief For You preview before the setup overlay (first visit only). */
export const DISCOVER_SETUP_FEED_PEEK_MS = 2200;

export type DiscoverSetupGatePhase = 'peek-feed' | 'setup-modal' | 'inactive';

export interface UseDiscoverSetupGateResult {
  isGateActive: boolean;
  gatePhase: DiscoverSetupGatePhase;
  hasAvatar: boolean;
  canContinue: boolean;
  skip: () => void;
  continueToFeed: () => void;
}

export function useDiscoverSetupGate(profile: UserProfile | null | undefined): UseDiscoverSetupGateResult {
  const userId = profile?.id ?? '';
  const [skippedOverride, setSkippedOverride] = useState(false);
  const [continuedOverride, setContinuedOverride] = useState(false);
  const [peekDone, setPeekDone] = useState(() =>
    userId ? hasSeenDiscoverFeedPeek(userId) : false,
  );

  const hasAvatar = hasCustomProfileAvatar(profile?.avatarUrl);
  const skipped =
    skippedOverride || (userId ? hasSkippedDiscoverSetup(userId) : false);
  const finished =
    continuedOverride || (userId ? hasFinishedDiscoverSetup(userId) : false);
  const ready = profile
    ? isDiscoverProfileReady(profile.avatarUrl, profile.posts)
    : false;
  const canContinue = ready;

  const isGateActive = useMemo(() => {
    if (skipped || finished) return false;
    if (ready) return false;
    return true;
  }, [skipped, finished, ready]);

  const gatePhase: DiscoverSetupGatePhase = useMemo(() => {
    if (!isGateActive) return 'inactive';
    if (!peekDone) return 'peek-feed';
    return 'setup-modal';
  }, [isGateActive, peekDone]);

  useEffect(() => {
    if (!ready || !userId || skipped || finished) return;
    markDiscoverSetupFinished(userId);
    markDiscoverFeedPeek(userId);
    setContinuedOverride(true);
    setPeekDone(true);
  }, [ready, userId, skipped, finished]);

  useEffect(() => {
    if (gatePhase !== 'peek-feed' || !userId) return;

    const timerId = window.setTimeout(() => {
      markDiscoverFeedPeek(userId);
      setPeekDone(true);
    }, DISCOVER_SETUP_FEED_PEEK_MS);

    return () => window.clearTimeout(timerId);
  }, [gatePhase, userId]);

  useEffect(() => {
    if (userId && hasSeenDiscoverFeedPeek(userId)) {
      setPeekDone(true);
    }
  }, [userId]);

  const skip = useCallback(() => {
    if (userId) {
      markDiscoverSetupSkipped(userId);
      markDiscoverFeedPeek(userId);
    }
    setSkippedOverride(true);
    setPeekDone(true);
  }, [userId]);

  const continueToFeed = useCallback(() => {
    if (userId) {
      markDiscoverSetupFinished(userId);
      markDiscoverFeedPeek(userId);
    }
    setContinuedOverride(true);
    setPeekDone(true);
  }, [userId]);

  return {
    isGateActive,
    gatePhase,
    hasAvatar,
    canContinue,
    skip,
    continueToFeed,
  };
}
