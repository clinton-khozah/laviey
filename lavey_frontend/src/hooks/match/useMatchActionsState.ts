import { useCallback, useEffect, useState } from 'react';
import { matchService } from '@/services';
import { contentService } from '@/services/content/contentService';
import type { MatchToastProfile } from '@/types';
import { playMatchCelebrationSound, primeMatchAudio } from '@/utils/audio/playMatchCelebrationSound';

const LIKED_PROFILE_IDS_KEY = 'lavey:liked-profile-ids';

function loadPersistedLikedIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(LIKED_PROFILE_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function persistLikedIds(ids: Set<string>): void {
  sessionStorage.setItem(LIKED_PROFILE_IDS_KEY, JSON.stringify([...ids]));
}

export interface UseMatchActionsResult {
  likedIds: Set<string>;
  likedPostIds: Set<string>;
  iCrushSentIds: Set<string>;
  matchToast: MatchToastProfile | null;
  isSubmitting: boolean;
  sendFlame: (profileId: string) => Promise<void>;
  sendICrush: (profileId: string) => Promise<{
    matched: boolean;
    conversationId?: string;
    alreadySent: boolean;
  }>;
  likePost: (postId: string, ownerProfileId: string) => Promise<{ likeCount: number } | null>;
  hasLiked: (profileId: string) => boolean;
  hasLikedPost: (postId: string) => boolean;
  hasSentICrush: (profileId: string) => boolean;
  dismissMatchToast: () => void;
}

export function useMatchActionsState(): UseMatchActionsResult {
  const [likedIds, setLikedIds] = useState<Set<string>>(() => loadPersistedLikedIds());
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(() => new Set());
  const [iCrushSentIds, setICrushSentIds] = useState<Set<string>>(() => new Set());
  const [matchToast, setMatchToast] = useState<MatchToastProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    persistLikedIds(likedIds);
  }, [likedIds]);

  const sendFlame = useCallback(
    async (profileId: string) => {
      if (likedIds.has(profileId) || isSubmitting) return;

      primeMatchAudio();
      setIsSubmitting(true);

      try {
        const result = await matchService.sendFlame(profileId);

        setLikedIds((prev) => {
          const next = new Set(prev);
          next.add(profileId);
          return next;
        });

        if (result.matched) {
          playMatchCelebrationSound();
          setMatchToast({
            profileId,
            name: result.profileName,
            avatar: result.profileAvatar,
            myAvatar: result.myAvatar,
          });
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [likedIds, isSubmitting],
  );

  const sendICrush = useCallback(
    async (profileId: string) => {
      if (iCrushSentIds.has(profileId) || isSubmitting) {
        return { matched: false, alreadySent: true };
      }

      primeMatchAudio();
      setIsSubmitting(true);

      try {
        const result = await matchService.sendICrush(profileId);

        if (result.matched || result.pending || result.alreadySent) {
          setICrushSentIds((prev) => {
            const next = new Set(prev);
            next.add(profileId);
            return next;
          });
        }

        if (!result.alreadySent) {
          setLikedIds((prev) => {
            const next = new Set(prev);
            next.add(profileId);
            return next;
          });
        }

        if (result.matched) {
          playMatchCelebrationSound();
          setMatchToast({
            profileId,
            name: result.profileName,
            avatar: result.profileAvatar,
            myAvatar: result.myAvatar,
            subtitle: result.mutualAccepted
              ? 'You both sent a crushy — it is a match!'
              : undefined,
          });
        }

        return {
          matched: result.matched,
          conversationId: result.conversationId,
          alreadySent: result.alreadySent,
        };
      } finally {
        setIsSubmitting(false);
      }
    },
    [iCrushSentIds, isSubmitting],
  );

  const likePost = useCallback(
    async (postId: string, ownerProfileId: string) => {
      if (likedPostIds.has(postId) || isSubmitting) return null;

      primeMatchAudio();
      setIsSubmitting(true);

      try {
        const result = await contentService.likePost(postId);

        setLikedPostIds((prev) => {
          const next = new Set(prev);
          next.add(postId);
          return next;
        });

        if (result.matched) {
          playMatchCelebrationSound();
          setMatchToast({
            profileId: ownerProfileId,
            name: result.ownerName,
            avatar: result.ownerAvatar,
            myAvatar: result.myAvatar,
            subtitle: `You and ${result.ownerName.split(' ')[0] ?? result.ownerName} liked each other's posts`,
          });
        }

        return { likeCount: result.likeCount };
      } finally {
        setIsSubmitting(false);
      }
    },
    [likedPostIds, isSubmitting],
  );

  const hasLiked = useCallback((profileId: string) => likedIds.has(profileId), [likedIds]);
  const hasLikedPost = useCallback((postId: string) => likedPostIds.has(postId), [likedPostIds]);
  const hasSentICrush = useCallback(
    (profileId: string) => iCrushSentIds.has(profileId),
    [iCrushSentIds],
  );

  const dismissMatchToast = useCallback(() => setMatchToast(null), []);

  return {
    likedIds,
    likedPostIds,
    iCrushSentIds,
    matchToast,
    isSubmitting,
    sendFlame,
    sendICrush,
    likePost,
    hasLiked,
    hasLikedPost,
    hasSentICrush,
    dismissMatchToast,
  };
}
