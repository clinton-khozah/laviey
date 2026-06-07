import type { ReactNode } from 'react';

export interface SendFlameRequest {
  profileId: string;
}

export interface SendFlameResponse {
  matched: boolean;
  matchId?: string;
  profileName: string;
  profileAvatar: string;
  myAvatar?: string;
}

export interface LikePostResponse {
  liked: boolean;
  likeCount: number;
  matched: boolean;
  matchId?: string;
  ownerUserId: string;
  ownerName: string;
  ownerAvatar: string;
  myAvatar: string;
}

export interface PostLiker {
  userId: string;
  name: string;
  avatar: string;
  likedAt: string;
}

export interface ReceivedPostLike {
  userId: string;
  name: string;
  avatar: string;
  postId: string;
  postThumbnail: string;
  likedBack: boolean;
}

/** Shown in the mutual-match celebration popup */
export interface MatchToastProfile {
  profileId: string;
  name: string;
  avatar: string;
  myAvatar?: string;
  /** Custom line under the title (e.g. post-like match copy) */
  subtitle?: string | ReactNode;
}
