import { useCallback, useEffect, useMemo, useState } from "react";
import { hasCustomProfileAvatar, isDiscoverProfileReady } from "../utils/discoverProfileReady";
import { saveOnboardingDiscoverPrefs } from "../utils/discoverOnboardingPrefs";
import {
  hasFinishedDiscoverSetup,
  hasSeenDiscoverFeedPeek,
  hasSkippedDiscoverSetup,
  markDiscoverFeedPeek,
  markDiscoverSetupFinished,
  markDiscoverSetupSkipped,
} from "../utils/discoverSetupStorage";
import type { ProfilePost } from "../types";

/** Brief For You preview before the setup overlay (first visit only) — mirrors the web app. */
export const DISCOVER_SETUP_FEED_PEEK_MS = 2200;

export type DiscoverSetupGatePhase = "peek-feed" | "setup-modal" | "inactive";

export interface UseDiscoverSetupGateResult {
  isGateActive: boolean;
  gatePhase: DiscoverSetupGatePhase;
  hasAvatar: boolean;
  canContinue: boolean;
  skip(): void;
  continueToFeed(): void;
}

type SelfProfile = { id: string; avatarUrl?: string; posts?: ProfilePost[] } | null | undefined;

export function useDiscoverSetupGate(profile: SelfProfile): UseDiscoverSetupGateResult {
  const userId = profile?.id ?? "";
  const [flagsLoaded, setFlagsLoaded] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [finished, setFinished] = useState(false);
  const [peekDone, setPeekDone] = useState(false);

  useEffect(() => {
    if (!userId) {
      setFlagsLoaded(true);
      return;
    }
    let cancelled = false;
    setFlagsLoaded(false);
    void (async () => {
      const [s, f, p] = await Promise.all([
        hasSkippedDiscoverSetup(userId),
        hasFinishedDiscoverSetup(userId),
        hasSeenDiscoverFeedPeek(userId),
      ]);
      if (cancelled) return;
      setSkipped(s);
      setFinished(f);
      setPeekDone(p);
      setFlagsLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const hasAvatar = hasCustomProfileAvatar(profile?.avatarUrl);
  const ready = profile ? isDiscoverProfileReady(profile.avatarUrl, profile.posts) : false;

  const isGateActive = useMemo(
    () => flagsLoaded && !skipped && !finished && !ready,
    [flagsLoaded, skipped, finished, ready],
  );

  const gatePhase: DiscoverSetupGatePhase = useMemo(() => {
    if (!isGateActive) return "inactive";
    if (!peekDone) return "peek-feed";
    return "setup-modal";
  }, [isGateActive, peekDone]);

  useEffect(() => {
    if (!flagsLoaded || !ready || !userId || skipped || finished) return;
    setFinished(true);
    setPeekDone(true);
    void markDiscoverSetupFinished(userId);
    void markDiscoverFeedPeek(userId);
  }, [flagsLoaded, ready, userId, skipped, finished]);

  useEffect(() => {
    if (gatePhase !== "peek-feed" || !userId) return;
    const timer = setTimeout(() => {
      setPeekDone(true);
      void markDiscoverFeedPeek(userId);
    }, DISCOVER_SETUP_FEED_PEEK_MS);
    return () => clearTimeout(timer);
  }, [gatePhase, userId]);

  const skip = useCallback(() => {
    if (userId) {
      void markDiscoverSetupSkipped(userId);
      void markDiscoverFeedPeek(userId);
    }
    setSkipped(true);
    setPeekDone(true);
  }, [userId]);

  const continueToFeed = useCallback(() => {
    if (userId) {
      void markDiscoverSetupFinished(userId);
      void markDiscoverFeedPeek(userId);
      void saveOnboardingDiscoverPrefs();
    }
    setFinished(true);
    setPeekDone(true);
  }, [userId]);

  return { isGateActive, gatePhase, hasAvatar, canContinue: ready, skip, continueToFeed };
}
