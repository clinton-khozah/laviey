import { useCallback, useEffect, useRef, useState } from 'react';
import { profileService } from '@/services';
import { syncAppliedAlgorithmFromFeed } from '@/features/admin/algorithm/algorithmConfig';
import type { DiscoverFilters, FeedFilter, Profile } from '@/types';
import type { DiscoverFeedAlgorithm, ForYouTasteInsight } from '@/types/discoverIntelligence';
import { FOR_YOU_TASTE_UPDATED_EVENT } from '@/types/discoverIntelligence';
import { applyDiscoverDemographicFilters } from '@/utils/discover/applyDiscoverFilters';
import {
  applyForYouGenderFilters,
  buildForYouApiFilters,
} from '@/utils/discover/forYouFeedFilters';
import { isProfileVerified } from '@/utils/profile/verificationStorage';
import {
  defaultNearbyDistanceTier,
  nextNearbyDistanceTier,
} from '@/utils/discover/discoverDistanceTiers';

interface UseDiscoverFeedResult {
  profiles: Profile[];
  feedPool: Profile[];
  isFeedRecycling: boolean;
  myLikedProfileIds: string[];
  feedAlgorithm: DiscoverFeedAlgorithm | null;
  tasteInsight: ForYouTasteInsight | null;
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
  const [feedPool, setFeedPool] = useState<Profile[]>([]);
  const [isFeedRecycling, setIsFeedRecycling] = useState(false);
  const [myLikedProfileIds, setMyLikedProfileIds] = useState<string[]>([]);
  const [feedAlgorithm, setFeedAlgorithm] = useState<DiscoverFeedAlgorithm | null>(null);
  const [tasteInsight, setTasteInsight] = useState<ForYouTasteInsight | null>(null);
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
    const onTasteUpdated = (event: Event) => {
      const custom = event as CustomEvent<ForYouTasteInsight>;
      if (custom.detail?.likeCount > 0) setTasteInsight(custom.detail);
    };

    window.addEventListener(FOR_YOU_TASTE_UPDATED_EVENT, onTasteUpdated);
    return () => window.removeEventListener(FOR_YOU_TASTE_UPDATED_EVENT, onTasteUpdated);
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
        const forYouRequest =
          activeFilter === 'for-you' ? buildForYouApiFilters(activeFilters) : null;

        const response = await profileService.getDiscoverFeed({
          filter: activeFilter,
          cursor: options.cursor ?? undefined,
          distanceTierKm: forYouRequest?.expandDistance
            ? 'any'
            : expanded
              ? 'any'
              : tier !== null
                ? String(tier)
                : undefined,
          expandDistance: forYouRequest?.expandDistance ?? expanded,
          maxDistanceKm: forYouRequest?.maxDistanceKm ?? activeFilters.maxDistanceKm,
          ageMin: forYouRequest?.ageMin ?? activeFilters.ageMin,
          ageMax: forYouRequest?.ageMax ?? activeFilters.ageMax,
          verifiedOnly: forYouRequest?.verifiedOnly ?? activeFilters.verifiedOnly,
          hasProfilePhoto:
            forYouRequest?.hasProfilePhoto ?? activeFilters.hasProfilePhoto,
          genders: forYouRequest?.genders ?? activeFilters.genders,
        });

        const demographic = enrichVerifiedStatus(
          response.isRecycling
            ? applyForYouGenderFilters(response.profiles, activeFilters)
            : activeFilter === 'for-you'
              ? applyForYouGenderFilters(response.profiles, activeFilters)
              : applyDiscoverDemographicFilters(response.profiles, activeFilters),
        );

        setProfiles((prev) =>
          options.replace ? demographic : mergeProfiles(prev, demographic),
        );
        setFeedPool((prev) => {
          if (options.replace) {
            return demographic;
          }
          if (activeFilter === 'for-you') {
            return applyForYouGenderFilters(mergeProfiles(prev, demographic), activeFilters);
          }
          return mergeProfiles(prev, demographic);
        });
        setIsFeedRecycling(response.isRecycling);
        setMyLikedProfileIds((prev) => [
          ...new Set([...prev, ...response.myLikedProfileIds]),
        ]);
        if (options.replace || activeFilter === 'for-you') {
          setFeedAlgorithm(response.algorithm);
          setTasteInsight(response.tasteInsight);
          syncAppliedAlgorithmFromFeed(response.algorithm);
        }
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
          setFeedPool([]);
          setIsFeedRecycling(false);
          setMyLikedProfileIds([]);
          setFeedAlgorithm(null);
          setTasteInsight(null);
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
    const startExpanded = activeFilter === 'for-you';
    setDistanceTierKm(tier);
    setExpandedDistance(startExpanded);
    setNextCursor(null);
    setCanExpandDistance(false);
    setIsFeedRecycling(false);
    setMyLikedProfileIds([]);
    setFeedAlgorithm(null);
    setTasteInsight(null);
    distanceTierRef.current = tier;
    expandedRef.current = startExpanded;
    setFeedPool([]);
    await loadFeed({ replace: true, distanceTier: tier, expanded: startExpanded });
  }, [loadFeed]);

  const refetch = useCallback(async () => {
    const activeFilter = filterRef.current;
    const tier =
      activeFilter === 'nearby'
        ? defaultNearbyDistanceTier(filtersRef.current.maxDistanceKm)
        : distanceTierRef.current;
    await loadFeed({
      replace: true,
      distanceTier: tier,
      expanded: expandedRef.current,
    });
  }, [loadFeed]);

  const setFilter = useCallback(
    (next: FeedFilter) => {
      setFilterState(next);
      const tier =
        next === 'nearby' ? defaultNearbyDistanceTier(filtersRef.current.maxDistanceKm) : null;
      const startExpanded = next === 'for-you';
      setDistanceTierKm(tier);
      setExpandedDistance(startExpanded);
      setNextCursor(null);
      filterRef.current = next;
      distanceTierRef.current = tier;
      expandedRef.current = startExpanded;
      void loadFeed({ replace: true, distanceTier: tier, expanded: startExpanded });
    },
    [loadFeed],
  );

  const genderFilterKey = filters.genders.join(',');

  useEffect(() => {
    void resetAndLoad();
  }, [filters.ageMin, filters.ageMax, filters.maxDistanceKm, filters.verifiedOnly, filters.hasProfilePhoto, genderFilterKey, resetAndLoad]);

  const onNearEndOfFeed = useCallback(() => {
    if (isFetchingRef.current) return;

    if (nextCursorRef.current) {
      void loadFeed({ cursor: nextCursorRef.current, replace: false });
      return;
    }

    if (filterRef.current === 'for-you' && !expandedRef.current && canExpandRef.current) {
      void loadFeed({ replace: false, expanded: true });
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

  useEffect(() => {
    if (filter !== 'for-you') return;
    if (isLoading || isLoadingMore || isFetchingRef.current) return;
    if (profiles.length >= 12 || !nextCursor) return;
    void loadFeed({ cursor: nextCursor, replace: false });
  }, [filter, profiles.length, nextCursor, isLoading, isLoadingMore, loadFeed]);

  return {
    profiles,
    feedPool,
    isFeedRecycling,
    myLikedProfileIds,
    feedAlgorithm,
    tasteInsight,
    isLoading,
    isLoadingMore,
    error,
    filter,
    setFilter,
    refetch,
    onNearEndOfFeed,
  };
}
