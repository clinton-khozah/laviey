import type { ProfilePost } from './profile.types';

export interface ProfileInterestItem {
  key: string;
  label: string;
  emoji: string;
}

export interface UserProfileStats {
  /** Distinct people who liked or crushy'd you. */
  crushesReceived: number;
  matches: number;
  vibeScore: number;
  profileViews: number;
  /** Total USD received from meetup gifts */
  giftEarnings: number;
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  bio: string;
  interests: ProfileInterestItem[];
  isPremium: boolean;
  /** Photo / identity verified — shown on profile for trust */
  verified: boolean;
  stats: UserProfileStats;
  posts: ProfilePost[];
}
