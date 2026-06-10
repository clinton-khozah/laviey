import { useCallback, useEffect, useRef, useState } from 'react';
import { profileService } from '@/services';
import type { DiscoverFilters, FeedFilter, Profile } from '@/types';
import { applyDiscoverDemographicFilters } from '@/utils/discover/applyDiscoverFilters';
import { isProfileVerified } from '@/utils/profile/verificationStorage';
import {
  defaultNearbyDistanceTier,
  nextNearbyDistanceTier,
} from '@/utils/discover/discoverDistanceTiers';

interface UseDiscoverFeedResult {
  profiles: Profile[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  filter: FeedFilter;
  setFilter: (filter: FeedFilter) => void;
  refetch: () => Promise<void>;
  onNearEndOfFeed: () => void;
}

function enrichVerifiedStatus(profiles: Profile[]): Profile[] {
  return profiles.map((profile) => ({
    ...profile,
    verified: profile.verified || isProfileVerified(profile.id),
  }));
}

function mergeProfiles(existing: Profile[], incoming: Profile[]): Profile[] {
  const seen = new Set(existing.map((profile) => profile.id));
  const merged = [...existing];
  for (const profile of incoming) {
    if (seen.has(profile.id)) continue;
    seen.add(profile.id);
    merged.push(profile);
  }
  return merged;
}

export function useDiscoverFeed(
  initialFilter: FeedFilter = 'for-you',
  filters: DiscoverFilters,
): UseDiscoverFeedResult {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilterState] = useState<FeedFilter>(initialFilter);
  const [distanceTierKm, setDistanceTierKm] = useState<number | null>(() =>
    initialFilter === 'nearby' ? defaultNearbyDistanceTier(filters.maxDistanceKm) : null,
  );
  const [expandedDistance, setExpandedDistance] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [canExpandDistance, setCanExpandDistance] = useState(false);

  const nextCursorRef = useRef<string | null>(null);
  const canExpandRef = useRef(false);
  const isFetchingRef = useRef(false);
  const filtersRef = useRef(filters);
  const filterRef = useRef(filter);
  const distanceTierRef = useRef(distanceTierKm);
  const expandedRef = useRef(expandedDistance);

  useEffect(() => {
    const onVerificationChanged = () => {
      setProfiles((prev) => enrichVerifiedStatus(prev));
    };

    window.addEventListener('lavey:verification-changed', onVerificationChanged);
    return () => window.removeEventListener('lavey:verification-changed', onVerificationChanged);
  }, []);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);

  useEffect(() => {
    distanceTierRef.current = distanceTierKm;
  }, [distanceTierKm]);

  useEffect(() => {
    expandedRef.current = expandedDistance;
  }, [expandedDistance]);

  useEffect(() => {
    nextCursorRef.current = nextCursor;
  }, [nextCursor]);

  useEffect(() => {
    canExpandRef.current = canExpandDistance;
  }, [canExpandDistance]);

  const loadFeed = useCallback(
    async (options: {
      cursor?: string | null;
      replace: boolean;
      distanceTier?: number | null;
      expanded?: boolean;
      autoExpandOnEmpty?: boolean;
    }) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      const activeFilter = filterRef.current;
      const activeFilters = filtersRef.current;
      const tier =
        options.distanceTier !== undefined ? options.distanceTier : distanceTierRef.current;
      const expanded =
        options.expanded !== undefined ? options.expanded : expandedRef.current;

      if (options.replace) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      try {
        const response = await profileService.getDiscoverFeed({
          filter: activeFilter,
          cursor: options.cursor ?? undefined,
          distanceTierKm: expanded ? 'any' : tier !== null ? String(tier) : undefined,
          expandDistance: expanded,
          maxDistanceKm: activeFilters.maxDistanceKm,
          ageMin: activeFilters.ageMin,
          ageMax: activeFilters.ageMax,
        });

        const demographic = enrichVerifiedStatus(
          applyDiscoverDemographicFilters(response.profiles, activeFilters),
        );

        setProfiles((prev) =>
          options.replace ? demographic : mergeProfiles(prev, demographic),
        );
        setNextCursor(response.nextCursor);
        setDistanceTierKm(response.distanceTierKm);
        setExpandedDistance(response.expandedDistance);
        setCanExpandDistance(response.canExpandDistance);

        const shouldAutoExpand =
          options.autoExpandOnEmpty !== false &&
          demographic.length === 0 &&
          response.canExpandDistance &&
          !options.cursor;

        if (shouldAutoExpand) {
          if (activeFilter === 'nearby' && response.nextDistanceTierKm !== null) {
            isFetchingRef.current = false;
            await loadFeed({
              replace: options.replace,
              distanceTier: response.nextDistanceTierKm,
              expanded: false,
              autoExpandOnEmpty: true,
            });
            return;
          }

          isFetchingRef.current = false;
          await loadFeed({
            replace: options.replace,
            expanded: true,
            autoExpandOnEmpty: false,
          });
          return;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load feed';
        setError(message);
        if (options.replace) {
          setProfiles([]);
          setNextCursor(null);
        }
      } finally {
        isFetchingRef.current = false;
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [],
  );

  const resetAndLoad = useCallback(async () => {
    const activeFilter = filterRef.current;
    const tier =
      activeFilter === 'nearby'
        ? defaultNearbyDistanceTier(filtersRef.current.maxDistanceKm)
        : null;
    setDistanceTierKm(tier);
    setExpandedDistance(false);
    setNextCursor(null);
    setCanExpandDistance(false);
    distanceTierRef.current = tier;
    expandedRef.current = false;
    await loadFeed({ replace: true, distanceTier: tier, expanded: false });
  }, [loadFeed]);

  const setFilter = useCallback(
    (next: FeedFilter) => {
      setFilterState(next);
      const tier =
        next === 'nearby' ? defaultNearbyDistanceTier(filtersRef.current.maxDistanceKm) : null;
      setDistanceTierKm(tier);
      setExpandedDistance(false);
      setNextCursor(null);
      filterRef.current = next;
      distanceTierRef.current = tier;
      expandedRef.current = false;
      void loadFeed({ replace: true, distanceTier: tier, expanded: false });
    },
    [loadFeed],
  );

  const genderFilterKey = filters.genders.join(',');

  useEffect(() => {
    void resetAndLoad();
  }, [filters.ageMin, filters.ageMax, filters.maxDistanceKm, genderFilterKey, resetAndLoad]);

  const refetch = useCallback(async () => {
    await resetAndLoad();
  }, [resetAndLoad]);

  const onNearEndOfFeed = useCallback(() => {
    if (isFetchingRef.current) return;

    if (nextCursorRef.current) {
      void loadFeed({ cursor: nextCursorRef.current, replace: false });
      return;
    }

    if (!canExpandRef.current) return;

    const activeFilter = filterRef.current;
    const maxDistanceKm = filtersRef.current.maxDistanceKm;

    if (activeFilter === 'nearby') {
      const nextTier = nextNearbyDistanceTier(distanceTierRef.current, maxDistanceKm);
      if (nextTier !== null && !expandedRef.current) {
        void loadFeed({ replace: false, distanceTier: nextTier, expanded: false });
        return;
      }
    }

    if (!expandedRef.current) {
      void loadFeed({ replace: false, expanded: true });
    }
  }, [loadFeed]);

  return {
    profiles,
    isLoading,
    isLoadingMore,
    error,
    filter,
    setFilter,
    refetch,
    onNearEndOfFeed,
  };
}
