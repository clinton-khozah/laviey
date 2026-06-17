import type { DiscoverGender } from './discoverFilter.types';

export type MediaType = 'video' | 'image';

export type FeedFilter = 'for-you' | 'nearby';

export type ProfileGender = DiscoverGender;

export interface ProfilePost {
  id: string;
  type: MediaType;
  src: string;
  poster?: string;
  durationSec?: number;
  caption?: string;
  /** Likes on this clip / photo */
  likeCount?: number;
  /** Whether the current user liked this post */
  likedByMe?: boolean;
  /** User ids who liked this post (on your own posts from API) */
  likerIds?: string[];
}

export interface Profile {
  id: string;
  name: string;
  age: number;
  bio: string;
  distance: string;
  /** City from onboarding location (e.g. Pretoria, New York). */
  locationName?: string;
  verified: boolean;
  vibeScore: number;
  interests: string[];
  /** Onboarding interest keys — used for vibe match scoring */
  interestKeys?: string[];
  /** Onboarding religion key — used for vibe match scoring */
  religion?: string;
  /** Profile country — used for vibe match scoring */
  country?: string;
  avatar: string;
  posts: ProfilePost[];
  /** Distance in km — used for discovery filters */
  distanceKm?: number;
  gender?: ProfileGender;
  /** They sent you a flame; you have not matched yet */
  likedYou?: boolean;
}
