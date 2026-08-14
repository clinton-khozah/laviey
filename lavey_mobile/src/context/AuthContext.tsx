import { createContext, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { authApi, onboardingApi } from '../api/services';
import { isUnauthorizedError } from '../api/apiError';
import { refreshStoredSession } from '../api/sessionRefresh';
import { getGoogleIdTokenSilently } from '../config/googleAuth';
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

async function resolveNeedsOnboardingQuiz(userId?: string): Promise<boolean> {
  if (userId && (await storage.getOnboardingComplete(userId))) return false;
  try {
    const status = await onboardingApi.status();
    if (status.completed && userId) await storage.setOnboardingComplete(userId);
    return !status.completed;
  } catch {
    return false;
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
  const [needsOnboardingQuiz, setNeedsOnboardingQuiz] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  const persist = useCallback(async (next: AuthSession) => {
    await storage.setSession(next);
    setSignInPrompt(false);
    setSession(next);
    const needsQuiz = await resolveNeedsOnboardingQuiz(next.user.id);
    setNeedsOnboardingQuiz(needsQuiz);
    setOnboardingChecked(true);
    setRestoring(false);
  }, []);

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
      if (!opts?.silent) setRestoring(true);
      try {
        const renewed = await refreshStoredSession();
        if (renewed) {
          try {
            const user = await authApi.me();
            await persist({ ...renewed, user });
            return;
          } catch (error) {
            if (!isUnauthorizedError(error)) {
              await persist(renewed);
              return;
            }
          }
        }

        const recovered = await trySilentGoogleRecovery();
        if (recovered) {
          await persist(recovered);
          return;
        }
      } finally {
        if (!opts?.silent) setRestoring(false);
      }

      await storage.clearSession();
      setSession(null);
      setNeedsOnboardingQuiz(false);
      setOnboardingChecked(true);
      setRestoring(false);
      setSignInPrompt(Boolean(opts?.promptSignIn));
    },
    [persist, trySilentGoogleRecovery],
  );

  useEffect(
    () =>
      sessionEvents.subscribe((payload) => {
        void invalidateSession({ provider: payload?.provider, promptSignIn: false, silent: true });
      }),
    [invalidateSession],
  );

  const syncSessionFromStorage = useCallback(
    async (stored: AuthSession) => {
      const renewed = await refreshStoredSession();
      if (renewed) {
        setSession(renewed);
        void authApi
          .me()
          .then((user) => setSession({ ...renewed, user }))
          .catch((error) => {
            if (isUnauthorizedError(error)) {
              void invalidateSession({ provider: stored.user.provider, promptSignIn: false, silent: true });
            }
          });
        const onboardingDone = await storage.getOnboardingComplete(stored.user.id);
        if (!onboardingDone) {
          setNeedsOnboardingQuiz(await resolveNeedsOnboardingQuiz(stored.user.id));
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

        setSession(stored);
        const onboardingDone = await storage.getOnboardingComplete(stored.user.id);
        setNeedsOnboardingQuiz(!onboardingDone);
        setOnboardingChecked(onboardingDone);
        setRestoring(false);

        void syncSessionFromStorage(stored);
      } catch {
        setOnboardingChecked(true);
        setRestoring(false);
      }
    })();
  }, [syncSessionFromStorage]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !session?.refreshToken) return;
      void refreshStoredSession()
        .then(async (renewed) => {
          if (renewed === null) {
            await invalidateSession({ provider: session.user.provider, promptSignIn: false, silent: true });
            return;
          }
          if (renewed) setSession(renewed);
        })
        .catch(() => undefined);
    });
    return () => subscription.remove();
  }, [invalidateSession, session?.refreshToken, session?.user.provider]);

  const login = useCallback(
    async (email: string, password: string) => persist(await authApi.login(email, password)),
    [persist],
  );
  const loginWithGoogle = useCallback(
    async (idToken: string) => persist(await authApi.google(idToken)),
    [persist],
  );
  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const result = await authApi.register(name, email, password);
      if ('needsEmailVerification' in result) return { verificationEmail: result.email };
      await persist(result);
      return {};
    },
    [persist],
  );
  const verifyOtp = useCallback(
    async (email: string, code: string) => persist(await authApi.verifyOtp(email, code)),
    [persist],
  );
  const logout = useCallback(async () => {
    const userId = session?.user.id;
    try {
      await authApi.logout();
    } finally {
      await clearGoogleSession();
      await storage.clearSession();
      if (userId) await storage.clearOnboardingComplete(userId);
      setSession(null);
      setSignInPrompt(false);
      setNeedsOnboardingQuiz(false);
      setOnboardingChecked(true);
      setRestoring(false);
    }
  }, [session?.user.id]);
  const clearSignInPrompt = useCallback(() => setSignInPrompt(false), []);
  const completeOnboarding = useCallback(() => {
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
