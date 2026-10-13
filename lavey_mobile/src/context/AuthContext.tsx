import { createContext, useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { Alert, AppState } from 'react-native';
import { SessionExpiredModal } from '../components/auth/SessionExpiredModal';
import { googleSignInErrorMessage } from '../utils/api/networkError';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { authApi, onboardingApi } from '../api/services';
import { prefetchResolvedForYouFeed } from '../utils/discoverFeedLoader';
import { isUnauthorizedError } from '../api/apiError';
import { accessTokenExpiresSoon, refreshStoredSession } from '../api/sessionRefresh';
import { getGoogleIdToken, getGoogleIdTokenSilently } from '../config/googleAuth';
import { storage } from '../utils/storage';
import type { AuthSession, AuthUser } from '../types';
import { sessionEvents } from '../api/sessionEvents';

type AuthValue = {
  session: AuthSession | null;
  isRestoring: boolean;
  needsOnboardingQuiz: boolean;
  onboardingChecked: boolean;
  signInPrompt: boolean;
  completeOnboarding(): void;
  clearSignInPrompt(): void;
  loginWithGoogle(idToken: string): Promise<void>;
  login(email: string, password: string): Promise<void>;
  register(name: string, email: string, password: string): Promise<{ verificationEmail?: string }>;
  verifyOtp(email: string, code: string): Promise<void>;
  logout(): Promise<void>;
};

export const AuthContext = createContext<AuthValue | null>(null);

const ONBOARDING_STATUS_TIMEOUT_MS = 25_000;
const AUTH_SETTLE_MS = 12_000;

async function resolveNeedsOnboardingQuiz(userId?: string): Promise<boolean> {
  if (userId && (await storage.getOnboardingComplete(userId))) return false;
  try {
    const status = await Promise.race([
      onboardingApi.status(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('onboarding-status-timeout')), ONBOARDING_STATUS_TIMEOUT_MS),
      ),
    ]);
    if (status.completed && userId) await storage.setOnboardingComplete(userId);
    return !status.completed;
  } catch {
    // If the status check fails or times out, prefer showing onboarding over a dead-end loader.
    return true;
  }
}

async function clearGoogleSession(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Not signed in with Google, or module not ready.
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isRestoring, setRestoring] = useState(true);
  const [signInPrompt, setSignInPrompt] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [sessionExpiredSigningIn, setSessionExpiredSigningIn] = useState(false);
  const [needsOnboardingQuiz, setNeedsOnboardingQuiz] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const authSettledUntilRef = useRef(0);
  const recoveryInFlightRef = useRef<Promise<void> | null>(null);
  const googleRecoveryFailedAtRef = useRef(0);
  const loggedOutRef = useRef(false);

  const markAuthSettled = useCallback(() => {
    authSettledUntilRef.current = Date.now() + AUTH_SETTLE_MS;
  }, []);

  const refreshOnboardingState = useCallback(async (userId: string) => {
    const cachedComplete = await storage.getOnboardingComplete(userId);
    if (cachedComplete) {
      setNeedsOnboardingQuiz(false);
      setOnboardingChecked(true);
      return;
    }

    const needsQuiz = await resolveNeedsOnboardingQuiz(userId);
    setNeedsOnboardingQuiz(needsQuiz);
    setOnboardingChecked(true);
  }, []);

  const persist = useCallback(async (next: AuthSession) => {
    if (loggedOutRef.current) return;
    markAuthSettled();
    await storage.setSession(next);
    if (loggedOutRef.current) {
      await storage.clearSession();
      return;
    }
    setSignInPrompt(false);
    setSessionExpired(false);
    prefetchResolvedForYouFeed(next.user.id);
    setSession(next);
    setRestoring(false);
    const cachedComplete = await storage.getOnboardingComplete(next.user.id);
    if (cachedComplete) {
      setNeedsOnboardingQuiz(false);
      setOnboardingChecked(true);
      void refreshOnboardingState(next.user.id);
      return;
    }
    setOnboardingChecked(false);
    await refreshOnboardingState(next.user.id);
  }, [markAuthSettled, refreshOnboardingState]);

  const trySilentGoogleRecovery = useCallback(async (): Promise<AuthSession | null> => {
    try {
      const idToken = await getGoogleIdTokenSilently();
      if (!idToken) return null;
      return await authApi.google(idToken);
    } catch {
      return null;
    }
  }, []);

  const invalidateSession = useCallback(
    async (opts?: { provider?: AuthUser['provider']; promptSignIn?: boolean; silent?: boolean }) => {
      if (recoveryInFlightRef.current) return recoveryInFlightRef.current;
      const recovery = (async () => {
        if (!opts?.silent) setRestoring(true);
        try {
          const renewed = await refreshStoredSession();
          const renewedTokenUsable = renewed.status !== 'invalid' && !accessTokenExpiresSoon(renewed.session.token, 0);
          if (renewedTokenUsable) {
            try {
              const user = await authApi.me();
              await persist({ ...renewed.session, user });
              return;
            } catch (error) {
              if (!isUnauthorizedError(error)) {
                await persist(renewed.session);
                return;
              }
            }
          }

          const provider = opts?.provider ?? (renewed.status === 'invalid' ? undefined : renewed.session.user.provider);
          if (provider === 'email') return;
          if (Date.now() - googleRecoveryFailedAtRef.current < 60_000) return;
          const recovered = await trySilentGoogleRecovery();
          if (recovered) {
            googleRecoveryFailedAtRef.current = 0;
            await persist(recovered);
            return;
          }
          googleRecoveryFailedAtRef.current = Date.now();
          setSessionExpired(true);
        } finally {
          if (!opts?.silent) setRestoring(false);
        }
      })();
      recoveryInFlightRef.current = recovery;
      try {
        await recovery;
      } finally {
        if (recoveryInFlightRef.current === recovery) recoveryInFlightRef.current = null;
      }
    },
    [persist, trySilentGoogleRecovery],
  );

  useEffect(
    () =>
      sessionEvents.subscribe((payload) => {
        if (Date.now() < authSettledUntilRef.current) return;
        void invalidateSession({ provider: payload?.provider, promptSignIn: false, silent: true });
      }),
    [invalidateSession],
  );

  const syncSessionFromStorage = useCallback(
    async (stored: AuthSession) => {
      const renewed = await refreshStoredSession();
      const renewedTokenUsable = renewed.status !== 'invalid' && !accessTokenExpiresSoon(renewed.session.token, 0);
      if (renewedTokenUsable) {
        try {
          const user = await authApi.me();
          await persist({ ...renewed.session, user });
        } catch (error) {
          if (Date.now() < authSettledUntilRef.current) return;
          if (isUnauthorizedError(error)) {
            await invalidateSession({ provider: stored.user.provider, promptSignIn: false, silent: true });
          } else {
            await persist(renewed.session);
          }
        }
        return;
      }

      await invalidateSession({ provider: stored.user.provider, promptSignIn: false, silent: true });
    },
    [invalidateSession],
  );

  useEffect(() => {
    void (async () => {
      try {
        const stored = await storage.getSession();
        if (!stored) {
          setOnboardingChecked(true);
          setRestoring(false);
          return;
        }

        markAuthSettled();
        prefetchResolvedForYouFeed(stored.user.id);
        setSession(stored);
        const cachedComplete = await storage.getOnboardingComplete(stored.user.id);
        if (cachedComplete) setNeedsOnboardingQuiz(false);
        setOnboardingChecked(true);
        setRestoring(false);
        void syncSessionFromStorage(stored);
      } catch {
        setOnboardingChecked(true);
        setRestoring(false);
      }
    })();
  }, [markAuthSettled, refreshOnboardingState, syncSessionFromStorage]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !session?.token) return;
      if (!accessTokenExpiresSoon(session.token) && session.refreshToken) return;
      void refreshStoredSession()
        .then(async (renewed) => {
          if (loggedOutRef.current) return;
          const stillExpired = renewed.status !== 'refreshed' && accessTokenExpiresSoon(session.token, 0);
          if (renewed.status === 'invalid' || stillExpired) {
            await invalidateSession({ provider: session.user.provider, promptSignIn: false, silent: true });
            return;
          }
          if (renewed.status === 'refreshed' && !loggedOutRef.current) setSession(renewed.session);
        })
        .catch(() => undefined);
    });
    return () => subscription.remove();
  }, [invalidateSession, session?.refreshToken, session?.token, session?.user.provider]);

  useEffect(() => {
    if (!session?.refreshToken || !session.token) return;
    const keepAlive = () => {
      if (!accessTokenExpiresSoon(session.token)) return;
      void refreshStoredSession()
        .then((renewed) => {
          if (loggedOutRef.current) return;
          if (renewed.status === 'invalid' || (renewed.status === 'kept' && accessTokenExpiresSoon(renewed.session.token, 0))) {
            void invalidateSession({ provider: session.user.provider, promptSignIn: false, silent: true });
            return;
          }
          if (renewed.status === 'refreshed') setSession(renewed.session);
        })
        .catch(() => undefined);
    };
    const timer = setInterval(keepAlive, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [invalidateSession, session?.refreshToken, session?.token, session?.user.provider]);

  const login = useCallback(
    async (email: string, password: string) => {
      loggedOutRef.current = false;
      return persist(await authApi.login(email, password));
    },
    [persist],
  );
  const loginWithGoogle = useCallback(async (idToken: string) => {
    loggedOutRef.current = false;
    markAuthSettled();
    const next = await authApi.google(idToken);
    await persist(next);
  }, [markAuthSettled, persist]);
  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const result = await authApi.register(name, email, password);
      if ('needsEmailVerification' in result) return { verificationEmail: result.email };
      loggedOutRef.current = false;
      await persist(result);
      return {};
    },
    [persist],
  );
  const verifyOtp = useCallback(
    async (email: string, code: string) => {
      loggedOutRef.current = false;
      return persist(await authApi.verifyOtp(email, code));
    },
    [persist],
  );
  const logout = useCallback(async () => {
    const userId = session?.user.id;
    loggedOutRef.current = true;
    setSession(null);
    setSignInPrompt(false);
    setSessionExpired(false);
    setNeedsOnboardingQuiz(false);
    setOnboardingChecked(true);
    setRestoring(false);
    await storage.clearSession();
    if (!loggedOutRef.current) return;
    if (userId) await storage.clearOnboardingComplete(userId);
    void clearGoogleSession();
    void authApi.logout().catch(() => undefined);
  }, [session?.user.id]);
  const clearSignInPrompt = useCallback(() => setSignInPrompt(false), []);
  const signInAfterSessionExpired = useCallback(async () => {
    setSessionExpiredSigningIn(true);
    try {
      const idToken = await getGoogleIdToken();
      if (!idToken) return;
      await loginWithGoogle(idToken);
    } catch (error) {
      Alert.alert('Could not sign in with Google', googleSignInErrorMessage(error));
    } finally {
      setSessionExpiredSigningIn(false);
    }
  }, [loginWithGoogle]);
  const completeOnboarding = useCallback(() => {
    prefetchResolvedForYouFeed(session?.user.id);
    setNeedsOnboardingQuiz(false);
    if (session?.user.id) void storage.setOnboardingComplete(session.user.id);
  }, [session?.user.id]);

  const value = useMemo(
    () => ({
      session,
      isRestoring,
      needsOnboardingQuiz,
      onboardingChecked,
      signInPrompt,
      completeOnboarding,
      clearSignInPrompt,
      loginWithGoogle,
      login,
      register,
      verifyOtp,
      logout,
    }),
    [
      session,
      isRestoring,
      needsOnboardingQuiz,
      onboardingChecked,
      signInPrompt,
      completeOnboarding,
      clearSignInPrompt,
      loginWithGoogle,
      login,
      register,
      verifyOtp,
      logout,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SessionExpiredModal
        visible={sessionExpired && Boolean(session)}
        signingIn={sessionExpiredSigningIn}
        onSignIn={() => void signInAfterSessionExpired()}
      />
    </AuthContext.Provider>
  );
}
