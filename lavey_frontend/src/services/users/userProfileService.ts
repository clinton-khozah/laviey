import { usesBackendApi } from '@/config/env';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { defaultAvatar } from '@/constants/defaultAvatar';
import { pickMockFeedImage } from '@/constants/mockMedia';
import { authService } from '@/services/auth/authService';
import { onboardingService } from '@/services/onboarding/onboardingService';
import { httpClient } from '@/services/api/httpClient';
import type { ApiResponse, ProfileInterestItem, UserProfile } from '@/types';
import { loadOnboardingQuizAnswers } from '@/utils/onboarding/onboardingQuizStorage';
import { getStoredProfileAvatar } from '@/utils/profile/profileAvatarStorage';
import { getGiftEarnings } from '@/utils/gift/giftEarningsStorage';
import { isProfileVerified } from '@/utils/profile/verificationStorage';
import { sleep } from '@/utils/sleep';

async function mockInterestsFromQuiz(): Promise<ProfileInterestItem[]> {
  const quiz = loadOnboardingQuizAnswers();
  const keys = quiz?.interests ?? ['music', 'food', 'travel'];
  const catalog = await onboardingService.listInterestOptions();
  const byKey = new Map(catalog.map((opt) => [opt.key, opt]));

  return keys.map((key) => {
    const opt = byKey.get(key);
    return {
      key,
      label: opt?.label ?? key,
      emoji: opt?.emoji ?? '✨',
    };
  });
}

function mockProfileFromSession(): UserProfile {
  const session = authService.getStoredSession();
  const user = session?.user;
  const userId = user?.id ?? 'me';

  return {
    id: userId,
    displayName: user?.displayName ?? 'You',
    email: user?.email ?? 'you@lavey.app',
    avatarUrl: getStoredProfileAvatar(userId) ?? user?.avatarUrl ?? defaultAvatar,
    bio: 'Building vibes one flame at a time. Coffee, collabs, and good energy only.',
    interests: [],
    isPremium: false,
    verified: isProfileVerified(userId),
    stats: {
      flamesSent: 47,
      matches: 12,
      vibeScore: 89,
      profileViews: 234,
      giftEarnings: getGiftEarnings(userId),
    },
    posts: [
      {
        id: 'me-1',
        type: 'video',
        src: 'https://videos.pexels.com/video-files/3195394/3195394-uhd_1440_2732_25fps.mp4',
        poster: pickMockFeedImage(0),
        durationSec: 10,
        likeCount: 248,
        caption: 'Golden hour vibes #Travel',
      },
      {
        id: 'me-2',
        type: 'video',
        src: 'https://videos.pexels.com/video-files/854084/854084-uhd_1440_2732_25fps.mp4',
        poster: pickMockFeedImage(1),
        durationSec: 10,
        likeCount: 412,
        caption: 'Coffee and good energy ☕',
      },
      {
        id: 'me-3',
        type: 'image',
        src: pickMockFeedImage(2),
        likeCount: 189,
        caption: 'Main character moment',
      },
    ],
  };
}

export interface UpdateUserProfileInput {
  displayName: string;
  bio: string;
  interestKeys: string[];
}

export interface UpdateUserLocationInput {
  latitude: number;
  longitude: number;
  country?: string;
  province?: string;
  suburb?: string;
}

export const userProfileService = {
  async getMyProfile(): Promise<UserProfile> {
    if (!usesBackendApi()) {
      await sleep(300);
      const profile = mockProfileFromSession();
      profile.interests = await mockInterestsFromQuiz();
      return profile;
    }
    const res = await httpClient.get<ApiResponse<UserProfile>>(API_ENDPOINTS.users.me);
    return res.data;
  },

  async updateMyProfile(input: UpdateUserProfileInput): Promise<UserProfile> {
    if (!usesBackendApi()) {
      await sleep(250);
      const current = mockProfileFromSession();
      current.interests = await mockInterestsFromQuiz();
      const catalog = await onboardingService.listInterestOptions();
      const byKey = new Map(catalog.map((opt) => [opt.key, opt]));
      const interests = input.interestKeys.map((key) => {
        const opt = byKey.get(key);
        return {
          key,
          label: opt?.label ?? key,
          emoji: opt?.emoji ?? '✨',
        };
      });

      return {
        ...current,
        displayName: input.displayName,
        bio: input.bio,
        interests,
      };
    }

    const res = await httpClient.patch<ApiResponse<UserProfile>>(API_ENDPOINTS.users.me, {
      body: {
        displayName: input.displayName,
        bio: input.bio,
        interestKeys: input.interestKeys,
      },
    });
    return res.data;
  },

  async updateMyLocation(input: UpdateUserLocationInput): Promise<void> {
    if (!usesBackendApi()) {
      await sleep(120);
      return;
    }

    await httpClient.patch<ApiResponse<{ ok: boolean }>>(API_ENDPOINTS.users.location, {
      body: input,
    });
  },
};
