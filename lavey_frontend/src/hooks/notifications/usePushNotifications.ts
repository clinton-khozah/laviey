import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/auth/useAuth";
import { usesBackendAuth } from "@/config/env";
import { onboardingService } from "@/services/onboarding/onboardingService";
import {
  pushNotificationService,
  type PushStatus,
} from "@/services/notifications/pushNotificationService";
import { loadOnboardingQuizAnswers } from "@/utils/onboarding/onboardingQuizStorage";

const DISMISS_KEY = "lavey:push-prompt-dismissed";
const PROMPT_DELAY_MS = 5 * 60 * 1000;
const NEW_USER_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function dismissStorageKey(userId: string | undefined): string {
  return userId ? `${DISMISS_KEY}:${userId}` : DISMISS_KEY;
}

function appTimeStorageKey(userId: string): string {
  return `lavey:push-prompt-app-time-ms:${userId}`;
}

function readDismissed(userId: string | undefined): boolean {
  try {
    if (userId && localStorage.getItem(dismissStorageKey(userId)) === "1")
      return true;
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function readAccumulatedAppTimeMs(userId: string): number {
  try {
    const raw = localStorage.getItem(appTimeStorageKey(userId));
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function writeAccumulatedAppTimeMs(userId: string, ms: number): void {
  try {
    localStorage.setItem(
      appTimeStorageKey(userId),
      String(Math.min(PROMPT_DELAY_MS, Math.max(0, ms))),
    );
  } catch {
    /* ignore */
  }
}

function isRecentlyOnboarded(completedAt: string | null): boolean {
  if (!completedAt) return false;
  const completedMs = new Date(completedAt).getTime();
  if (Number.isNaN(completedMs)) return false;
  return Date.now() - completedMs < NEW_USER_WINDOW_MS;
}

export function usePushNotifications(enabled: boolean) {
  const { user } = useAuth();
  const userId = user?.id;

  const [status, setStatus] = useState<PushStatus>({
    supported: false,
    permission: "unsupported",
    subscribed: false,
  });
  const [isEnabling, setIsEnabling] = useState(false);
  const [dismissed, setDismissed] = useState(() => readDismissed(userId));
  const [isNewUser, setIsNewUser] = useState(false);
  const [delayElapsed, setDelayElapsed] = useState(false);

  useEffect(() => {
    setDismissed(readDismissed(userId));
  }, [userId]);

  const refreshStatus = useCallback(async () => {
    const next = await pushNotificationService.getStatus();
    setStatus(next);
    return next;
  }, []);

  useEffect(() => {
    if (!enabled || !usesBackendAuth()) return;

    void refreshStatus().then((next) => {
      if (next.permission === "granted") {
        void pushNotificationService
          .syncSubscription()
          .then(() => refreshStatus());
      }
    });
  }, [enabled, refreshStatus]);

  useEffect(() => {
    if (!enabled || !userId) {
      setIsNewUser(false);
      return;
    }

    let cancelled = false;

    void onboardingService.getOnboardingStatus().then((onboarding) => {
      if (cancelled) return;

      let completedAt = onboarding.completedAt;
      if (!completedAt && onboarding.completed) {
        completedAt = loadOnboardingQuizAnswers()?.completedAt ?? null;
      }

      setIsNewUser(isRecentlyOnboarded(completedAt));
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, userId]);

  useEffect(() => {
    if (!enabled || !userId) {
      setDelayElapsed(false);
      return;
    }

    let accumulated = readAccumulatedAppTimeMs(userId);
    if (accumulated >= PROMPT_DELAY_MS) {
      setDelayElapsed(true);
      return;
    }

    const sessionStart = Date.now();

    const tick = () => {
      const total = accumulated + (Date.now() - sessionStart);
      if (total >= PROMPT_DELAY_MS) {
        setDelayElapsed(true);
        writeAccumulatedAppTimeMs(userId, PROMPT_DELAY_MS);
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);

    return () => {
      window.clearInterval(intervalId);
      writeAccumulatedAppTimeMs(
        userId,
        accumulated + (Date.now() - sessionStart),
      );
    };
  }, [enabled, userId]);

  const enableNotifications = useCallback(async () => {
    setIsEnabling(true);
    try {
      const ok = await pushNotificationService.enableNotifications();
      if (ok) {
        await pushNotificationService.sendTestNotification().catch(() => {});
      }
      await refreshStatus();
      return ok;
    } finally {
      setIsEnabling(false);
    }
  }, [refreshStatus]);

  const dismissPrompt = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(dismissStorageKey(userId), "1");
    } catch {
      /* ignore */
    }
  }, [userId]);

  const showPrompt =
    enabled &&
    Boolean(userId) &&
    isNewUser &&
    delayElapsed &&
    status.supported &&
    status.permission !== "granted" &&
    !dismissed;

  const needsResync =
    enabled &&
    status.supported &&
    status.permission === "granted" &&
    !status.subscribed;

  return {
    status,
    showPrompt,
    needsResync,
    isEnabling,
    enableNotifications,
    dismissPrompt,
    refreshStatus,
  };
}
