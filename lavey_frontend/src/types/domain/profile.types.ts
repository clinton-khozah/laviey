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
  verified: boolean;
  vibeScore: number;
  interests: string[];
  avatar: string;
  posts: ProfilePost[];
  /** Distance in km — used for discovery filters */
  distanceKm?: number;
  gender?: ProfileGender;
  /** They sent you a flame; you have not matched yet */
  likedYou?: boolean;
}
