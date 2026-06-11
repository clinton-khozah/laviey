import { usesBackendApi } from '@/config/env';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { getAppliedAlgorithm, sortProfilesByAlgorithm } from '@/features/admin/algorithm/algorithmConfig';
import { httpClient } from '@/services/api/httpClient';
import { MOCK_PROFILES } from '@/services/mocks/profile.mock';
import type { ApiResponse } from '@/types';
import type { DiscoverFilters, FeedFilter, Profile } from '@/types';
import {
  defaultNearbyDistanceTier,
  filterProfilesByDistanceCap,
  nextNearbyDistanceTier,
  resolveDistanceCapKm,
  sortProfilesByDistance,
} from '@/utils/discover/discoverDistanceTiers';
import { applyDiscoverDemographicFilters } from '@/utils/discover/applyDiscoverFilters';
import { applyVibeMatchToProfiles } from '@/utils/discover/vibeMatchScore';
import { sleep } from '@/utils/sleep';

interface DiscoverFeedApiPayload {
  profiles: Profile[];
  nextCursor: string | null;
  algorithm?: {
    id: string;
    name: string;
    code: string;
    description: string;
  } | null;
  distanceTierKm?: number | null;
  nextDistanceTierKm?: number | null;
  expandedDistance?: boolean;
  canExpandDistance?: boolean;
}

export interface DiscoverFeedRequest {
  filter?: FeedFilter;
  cursor?: string;
  distanceTierKm?: string;
  expandDistance?: boolean;
  maxDistanceKm?: number;
  ageMin?: number;
  ageMax?: number;
}

export interface DiscoverFeedResponse {
  profiles: Profile[];
  nextCursor: string | null;
  algorithm?: DiscoverFeedApiPayload['algorithm'];
  distanceTierKm: number | null;
  nextDistanceTierKm: number | null;
  expandedDistance: boolean;
  canExpandDistance: boolean;
}

function buildMockDiscoverFeed(request: DiscoverFeedRequest): DiscoverFeedResponse {
  const filter = request.filter ?? 'for-you';
  const maxDistanceKm = request.maxDistanceKm ?? 50;
  const expandedDistance = request.expandDistance === true;
  const distanceTierKm = expandedDistance
    ? null
    : filter === 'nearby'
      ? request.distanceTierKm
        ? Number(request.distanceTierKm)
        : defaultNearbyDistanceTier(maxDistanceKm)
      : null;

  const filters: DiscoverFilters = {
    maxDistanceKm,
    ageMin: request.ageMin ?? 18,
    ageMax: request.ageMax ?? 35,
    genders: [],
  };

  let profiles = [...MOCK_PROFILES];
  const applied = getAppliedAlgorithm();
  if (applied) {
    profiles = sortProfilesByAlgorithm(profiles, applied.id);
  }

  profiles = applyDiscoverDemographicFilters(profiles, filters);

  const maxKm = resolveDistanceCapKm({
    feedFilter: filter,
    distanceTierKm,
    expandedDistance,
    maxDistanceKm,
  });
  profiles = filterProfilesByDistanceCap(profiles, maxKm);
  if (filter === 'nearby') {
    profiles = sortProfilesByDistance(profiles);
  }

  const nextDistanceTierKm =
    !expandedDistance && filter === 'nearby'
      ? nextNearbyDistanceTier(distanceTierKm, maxDistanceKm)
      : null;

  const canExpandDistance =
    !expandedDistance && (filter === 'for-you' || nextDistanceTierKm === null);

  profiles = applyVibeMatchToProfiles(profiles);

  return {
    profiles,
    nextCursor: null,
    algorithm: null,
    distanceTierKm,
    nextDistanceTierKm,
    expandedDistance,
    canExpandDistance,
  };
}

/**
 * Profile & discover-feed API.
 * Set VITE_USE_MOCK_API=true only for offline UI demos.
 */
export const profileService = {
  async getDiscoverFeed(request: DiscoverFeedRequest = {}): Promise<DiscoverFeedResponse> {
    const filter = request.filter ?? 'for-you';

    if (!usesBackendApi()) {
      await sleep(350);
      return buildMockDiscoverFeed(request);
    }

    const response = await httpClient.get<ApiResponse<DiscoverFeedApiPayload>>(
      API_ENDPOINTS.profiles.discover,
      {
        params: {
          filter,
          cursor: request.cursor,
          limit: 18,
          distanceTierKm: request.distanceTierKm,
          expandDistance: request.expandDistance ? 'true' : undefined,
          maxDistanceKm: request.maxDistanceKm,
          ageMin: request.ageMin,
          ageMax: request.ageMax,
        },
      },
    );

    if (Array.isArray(response.data as unknown)) {
      const profiles = response.data as unknown as Profile[];
      return {
        profiles,
        nextCursor: null,
        algorithm: null,
        distanceTierKm: null,
        nextDistanceTierKm: null,
        expandedDistance: false,
        canExpandDistance: false,
      };
    }

    const payload = response.data;
    return {
      profiles: payload.profiles ?? [],
      nextCursor: payload.nextCursor ?? null,
      algorithm: payload.algorithm ?? null,
      distanceTierKm: payload.distanceTierKm ?? null,
      nextDistanceTierKm: payload.nextDistanceTierKm ?? null,
      expandedDistance: payload.expandedDistance ?? false,
      canExpandDistance: payload.canExpandDistance ?? false,
    };
  },

  async getProfileById(id: string): Promise<Profile> {
    if (!usesBackendApi()) {
      await sleep(200);
      const profile = MOCK_PROFILES.find((p) => p.id === id);
      if (!profile) throw new Error(`Profile ${id} not found`);
      return applyVibeMatchToProfiles([profile])[0]!;
    }

    const response = await httpClient.get<ApiResponse<Profile>>(
      API_ENDPOINTS.profiles.byId(id),
    );

    return response.data;
  },

  async getMeetupHostProfile(meetupId: string): Promise<Profile> {
    if (!usesBackendApi()) {
      await sleep(200);
      const profile = MOCK_PROFILES[0];
      if (!profile) throw new Error('Profile not found');
      return applyVibeMatchToProfiles([profile])[0]!;
    }

    const response = await httpClient.get<ApiResponse<Profile>>(
      API_ENDPOINTS.dates.hostProfile(meetupId),
    );

    return response.data;
  },

  /** Profiles that sent you a flame and are waiting for you to like back. */
  async getProfilesWhoLikedYou(): Promise<Profile[]> {
    if (!usesBackendApi()) {
      await sleep(200);
      return MOCK_PROFILES.filter((profile) => profile.likedYou);
    }

    const { profiles } = await this.getDiscoverFeed({
      filter: 'for-you',
      maxDistanceKm: 500,
      expandDistance: true,
      ageMin: 18,
      ageMax: 99,
    });

    return profiles.filter((profile) => profile.likedYou);
  },
};
