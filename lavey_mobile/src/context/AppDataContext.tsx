import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { discoverApi, profileApi, roomApi } from '../api/services';
import { useAuth } from '../hooks/useAuth';
import type { OnlineDate, Profile, UserProfile } from '../types';
import { appDataCache } from '../utils/appDataCache';

type AppDataValue = {
  profile: UserProfile | null;
  likers: Profile[];
  likedBackIds: Set<string>;
  likersLoading: boolean;
  dates: OnlineDate[];
  datesLoading: boolean;
  refreshProfile(silent?: boolean): Promise<UserProfile | null>;
  refreshLikers(silent?: boolean): Promise<void>;
  refreshDates(silent?: boolean): Promise<void>;
  setProfile(next: UserProfile | null): void;
  setDates(next: OnlineDate[] | ((current: OnlineDate[]) => OnlineDate[])): void;
};

const AppDataContext = createContext<AppDataValue | null>(null);

export function AppDataProvider({ children }: PropsWithChildren) {
  const { session, needsOnboardingQuiz } = useAuth();
  const userId = session?.user.id;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [likers, setLikers] = useState<Profile[]>([]);
  const [likedBackIds, setLikedBackIds] = useState<Set<string>>(new Set());
  const [likersLoading, setLikersLoading] = useState(false);
  const [dates, setDates] = useState<OnlineDate[]>([]);
  const [datesLoading, setDatesLoading] = useState(false);
  const hydratedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || needsOnboardingQuiz) {
      hydratedFor.current = null;
      setProfile(null);
      setLikers([]);
      setLikedBackIds(new Set());
      setDates([]);
      return;
    }
    if (hydratedFor.current === userId) return;
    hydratedFor.current = userId;
    void (async () => {
      const [cachedProfile, cachedLikers, cachedDates] = await Promise.all([
        appDataCache.getProfile(userId),
        appDataCache.getLikers(userId),
        appDataCache.getDates(userId),
      ]);
      if (cachedProfile) setProfile(cachedProfile);
      if (cachedLikers) {
        setLikers(cachedLikers.profiles);
        setLikedBackIds(new Set(cachedLikers.likedBackIds));
      }
      if (cachedDates?.length) setDates(cachedDates);
    })();
  }, [userId, needsOnboardingQuiz]);

  const refreshProfile = useCallback(
    async (silent = false) => {
      if (!userId) return null;
      try {
        const next = await profileApi.me();
        setProfile(next);
        void appDataCache.setProfile(userId, next);
        return next;
      } catch {
        return profile;
      }
    },
    [userId, profile],
  );

  const refreshLikers = useCallback(
    async (silent = false) => {
      if (!userId) return;
      if (!silent) setLikersLoading(true);
      try {
        const result = await discoverApi.list({
          filter: 'for-you',
          maxDistanceKm: 500,
          expandDistance: true,
          ageMin: 18,
          ageMax: 99,
        });
        const next = result.profiles.filter((p) => p.likedYou);
        const ids = result.myLikedProfileIds ?? [];
        setLikers(next);
        setLikedBackIds(new Set(ids));
        void appDataCache.setLikers(userId, next, ids);
      } catch {
        // Keep cached likers on failure.
      } finally {
        if (!silent) setLikersLoading(false);
      }
    },
    [userId],
  );

  const refreshDates = useCallback(
    async (silent = false) => {
      if (!userId) return;
      if (!silent && !dates.length) setDatesLoading(true);
      try {
        const next = await roomApi.list();
        setDates(next);
        void appDataCache.setDates(userId, next);
      } catch {
        // Keep cached dates on failure.
      } finally {
        if (!silent && !dates.length) setDatesLoading(false);
      }
    },
    [userId, dates.length],
  );

  useEffect(() => {
    if (!userId || needsOnboardingQuiz) return;
    void (async () => {
      try {
        const next = await profileApi.me();
        setProfile(next);
        void appDataCache.setProfile(userId, next);
      } catch {
        // Keep cached profile.
      }
      try {
        const result = await discoverApi.list({
          filter: 'for-you',
          maxDistanceKm: 500,
          expandDistance: true,
          ageMin: 18,
          ageMax: 99,
        });
        const nextLikers = result.profiles.filter((p) => p.likedYou);
        const ids = result.myLikedProfileIds ?? [];
        setLikers(nextLikers);
        setLikedBackIds(new Set(ids));
        void appDataCache.setLikers(userId, nextLikers, ids);
      } catch {
        // Keep cached likers.
      }
      try {
        const nextDates = await roomApi.list();
        setDates(nextDates);
        void appDataCache.setDates(userId, nextDates);
      } catch {
        // Keep cached dates.
      }
    })();
  }, [userId, needsOnboardingQuiz]);

  const setDatesState = useCallback((next: OnlineDate[] | ((current: OnlineDate[]) => OnlineDate[])) => {
    setDates((current) => {
      const resolved = typeof next === 'function' ? next(current) : next;
      if (userId) void appDataCache.setDates(userId, resolved);
      return resolved;
    });
  }, [userId]);

  const value = useMemo(
    () => ({
      profile,
      likers,
      likedBackIds,
      likersLoading,
      dates,
      datesLoading,
      refreshProfile,
      refreshLikers,
      refreshDates,
      setProfile,
      setDates: setDatesState,
    }),
    [
      profile,
      likers,
      likedBackIds,
      likersLoading,
      dates,
      datesLoading,
      refreshProfile,
      refreshLikers,
      refreshDates,
      setDatesState,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) throw new Error('useAppData must be used inside AppDataProvider');
  return value;
}
