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

export interface SendICrushResponse {
  matched: boolean;
  pending: boolean;
  alreadySent: boolean;
  mutualAccepted?: boolean;
  inviteId?: string;
  conversationId?: string;
  matchId?: string;
  profileName: string;
  profileAvatar: string;
  myAvatar?: string;
}

export interface RespondICrushResponse {
  matchId: string;
  conversationId: string;
  profileName: string;
  profileAvatar: string;
}

import type { ForYouTasteInsight } from '@/types/discoverIntelligence';

export interface LikePostResponse {
  liked: boolean;
  likeCount: number;
  matched: boolean;
  matchId?: string;
  ownerUserId: string;
  ownerName: string;
  ownerAvatar: string;
  myAvatar: string;
  tasteInsight?: ForYouTasteInsight;
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

/** Active match row for invite pickers and match lists */
export interface MatchListItem {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  matchedAt: string;
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
