import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usesBackendAuth } from "@/config/env";
import { authService, onboardingService } from "@/services";
import { ApiError } from "@/services/api/apiError";
import type {
  AuthSession,
  EmailSignInRequest,
  EmailSignUpRequest,
  OnboardingQuizAnswers,
} from "@/types";
import { clearUserProfileCache } from "@/hooks/profile/useUserProfile";
import {
  saveOnboardingQuizAnswers,
  loadOnboardingQuizAnswers,
  clearOnboardingQuizAnswers,
} from "@/utils/onboarding/onboardingQuizStorage";
import { clearPendingOnboardingQuiz, consumePendingOnboardingQuiz } from "@/utils/onboarding/pendingOnboardingQuiz";
import { discoverFiltersFromOnboarding } from "@/utils/discover/discoverFiltersFromOnboarding";
import { clearDiscoverFiltersManual, saveDiscoverFilters } from "@/utils/discover/discoverFilterStorage";
import { resetDiscoverSetupState } from "@/utils/discover/discoverSetupStorage";

const VERIFICATION_RESEND_COOLDOWN_SEC = 15;

export interface AuthContextValue {
  user: AuthSession["user"] | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  needsOnboardingQuiz: boolean;
  pendingVerificationEmail: string | null;
  error: string | null;
  verificationStatus: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (payload: EmailSignInRequest) => Promise<void>;
  signUpWithEmail: (payload: EmailSignUpRequest) => Promise<void>;
  verifyEmailWithCode: (code: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  resendVerificationForEmail: (email: string) => Promise<void>;
  resendCooldownSec: number;
  clearPendingVerification: () => void;
  signOut: () => Promise<void>;
  completeOnboardingQuiz: (answers: OnboardingQuizAnswers) => Promise<void>;
  establishSessionAfterOAuth: (session: AuthSession) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function resolveNeedsOnboardingQuiz(userId?: string): Promise<boolean> {
  if (!usesBackendAuth()) {
    return !loadOnboardingQuizAnswers(userId);
  }

  const pendingOAuthQuiz = consumePendingOnboardingQuiz();

  try {
    const status = await onboardingService.getOnboardingStatus();
    if (status.completed) {
      clearPendingOnboardingQuiz();
      return false;
    }
    // Server says incomplete — ignore stale browser cache (other accounts / old tests).
    clearOnboardingQuizAnswers();
    return true;
  } catch {
    clearOnboardingQuizAnswers();
    return pendingOAuthQuiz || true;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsOnboardingQuiz, setNeedsOnboardingQuiz] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(
    null,
  );
  const [resendCooldownSec, setResendCooldownSec] = useState(0);

  useEffect(() => {
    if (resendCooldownSec <= 0) return;
    const timerId = window.setInterval(() => {
      setResendCooldownSec((seconds) => (seconds <= 1 ? 0 : seconds - 1));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [resendCooldownSec]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const onOAuthCallback = window.location.pathname === "/auth/callback";

      try {
        const restored = await authService.restoreSession();
        if (!cancelled && !onOAuthCallback && restored) {
          setSession(restored);

          const needsQuiz = await resolveNeedsOnboardingQuiz(restored.user.id);
          if (!cancelled) {
            setNeedsOnboardingQuiz(needsQuiz);
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const syncOnboardingAfterAuth = useCallback(async (userId: string) => {
    setNeedsOnboardingQuiz(await resolveNeedsOnboardingQuiz(userId));
  }, []);

  const sendVerificationEmail = useCallback(async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;

    setPendingVerificationEmail(normalizedEmail);
    setError(null);
    setIsSubmitting(true);
    try {
      await authService.resendVerificationEmail(normalizedEmail);
      setResendCooldownSec(VERIFICATION_RESEND_COOLDOWN_SEC);
      setVerificationStatus("Verification code sent. Check your inbox.");
    } catch (err) {
      if (ApiError.isApiError(err) && err.code === "EMAIL_RATE_LIMIT") {
        setResendCooldownSec(VERIFICATION_RESEND_COOLDOWN_SEC);
        setVerificationStatus(
          "Enter the code from your latest email if you have one.",
        );
        setError(err.message);
        return;
      }
      setError(err instanceof Error ? err.message : "Could not resend code.");
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const completeSession = useCallback(
    async (next: AuthSession) => {
      setSession(next);
      setPendingVerificationEmail(null);
      setVerificationStatus(null);
      await syncOnboardingAfterAuth(next.user.id);
    },
    [syncOnboardingAfterAuth],
  );

  const runAuth = useCallback(
    async (
      action: () => Promise<AuthSession>,
      onSuccess?: (session: AuthSession) => void,
    ) => {
      setError(null);
      setIsSubmitting(true);
      try {
        const next = await action();
        setSession(next);
        onSuccess?.(next);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Sign in failed. Try again.";
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const establishSessionAfterOAuth = useCallback(async (next: AuthSession) => {
    setIsLoading(true);
    setSession(next);
    setPendingVerificationEmail(null);
    setVerificationStatus(null);
    const needsQuiz = await resolveNeedsOnboardingQuiz(next.user.id);
    setNeedsOnboardingQuiz(needsQuiz);
    setIsLoading(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      isAuthenticated: Boolean(session),
      isLoading,
      isSubmitting,
      needsOnboardingQuiz,
      pendingVerificationEmail,
      error,
      verificationStatus,
      resendCooldownSec,
      signInWithGoogle: async () => {
        setError(null);
        setIsSubmitting(true);
        try {
          const next = await authService.signInWithGoogle();
          await completeSession(next);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Sign in failed. Try again.";
          setError(message);
        } finally {
          setIsSubmitting(false);
        }
      },
      signInWithEmail: async (payload) => {
        setError(null);
        setVerificationStatus(null);
        setIsSubmitting(true);
        try {
          const next = await authService.signInWithEmail(payload);
          await completeSession(next);
        } catch (err) {
          if (
            ApiError.isApiError(err) &&
            err.code === "EMAIL_CONFIRMATION_REQUIRED"
          ) {
            setPendingVerificationEmail(payload.email.trim().toLowerCase());
            setError(null);
            setVerificationStatus(
              "Enter the verification code we sent to your email.",
            );
            return;
          }
          setError(
            err instanceof Error ? err.message : "Sign in failed. Try again.",
          );
        } finally {
          setIsSubmitting(false);
        }
      },
      signUpWithEmail: async (payload) => {
        setError(null);
        setVerificationStatus(null);
        setIsSubmitting(true);
        try {
          const result = await authService.signUpWithEmail(payload);
          if (
            "needsEmailVerification" in result &&
            result.needsEmailVerification
          ) {
            setPendingVerificationEmail(result.email);
            setResendCooldownSec(VERIFICATION_RESEND_COOLDOWN_SEC);
            setVerificationStatus("Verification code sent. Check your inbox.");
            return;
          }
          await completeSession(result as AuthSession);
        } catch (err) {
          if (ApiError.isApiError(err) && err.code === "EMAIL_RATE_LIMIT") {
            setPendingVerificationEmail(payload.email.trim().toLowerCase());
            setResendCooldownSec(VERIFICATION_RESEND_COOLDOWN_SEC);
            setVerificationStatus(
              "Enter the code from your latest email if you have one.",
            );
            setError(err.message);
            return;
          }
          setError(
            err instanceof Error
              ? err.message
              : "Could not create account. Try again.",
          );
        } finally {
          setIsSubmitting(false);
        }
      },
      verifyEmailWithCode: async (code) => {
        if (!pendingVerificationEmail) return;
        setError(null);
        setIsSubmitting(true);
        try {
          const next = await authService.verifyEmailWithCode(
            pendingVerificationEmail,
            code,
          );
          await completeSession(next);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Invalid verification code.",
          );
        } finally {
          setIsSubmitting(false);
        }
      },
      resendVerificationEmail: async () => {
        if (!pendingVerificationEmail || resendCooldownSec > 0) return;
        await sendVerificationEmail(pendingVerificationEmail);
      },
      resendVerificationForEmail: async (email: string) => {
        if (resendCooldownSec > 0) return;
        await sendVerificationEmail(email);
      },
      clearPendingVerification: () => {
        setPendingVerificationEmail(null);
        setVerificationStatus(null);
        setResendCooldownSec(0);
        setError(null);
      },
      signOut: async () => {
        setIsSubmitting(true);
        clearPendingOnboardingQuiz();
        clearOnboardingQuizAnswers();
        clearUserProfileCache();
        await authService.signOut();
        setSession(null);
        setNeedsOnboardingQuiz(false);
        setPendingVerificationEmail(null);
        setVerificationStatus(null);
        setIsSubmitting(false);
      },
      completeOnboardingQuiz: async (answers) => {
        const userId = session?.user.id;
        if (usesBackendAuth()) {
          await onboardingService.submitOnboarding(answers);
          if (userId) {
            saveOnboardingQuizAnswers(answers, userId);
          }
        } else {
          saveOnboardingQuizAnswers(answers, userId);
        }

        const discoverFilters = discoverFiltersFromOnboarding(answers);
        clearDiscoverFiltersManual(userId);
        saveDiscoverFilters(discoverFilters, userId);
        if (userId) {
          resetDiscoverSetupState(userId);
        }

        clearPendingOnboardingQuiz();
        clearUserProfileCache();
        setNeedsOnboardingQuiz(false);
        window.sessionStorage.setItem("lavey:navigateToFeed", "1");
        window.dispatchEvent(
          new CustomEvent("lavey:onboarding-completed", { detail: { filters: discoverFilters } }),
        );
        window.dispatchEvent(
          new CustomEvent("lavey:navigate", { detail: { nav: "feed" } }),
        );
      },
      establishSessionAfterOAuth,
      clearError: () => setError(null),
    }),
    [
      session,
      isLoading,
      isSubmitting,
      needsOnboardingQuiz,
      pendingVerificationEmail,
      error,
      verificationStatus,
      resendCooldownSec,
      runAuth,
      completeSession,
      sendVerificationEmail,
      establishSessionAfterOAuth,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
