import { useCallback, useState } from 'react';
import { matchService } from '@/services';
import { contentService } from '@/services/content/contentService';
import type { MatchToastProfile } from '@/types';
import { playMatchCelebrationSound, primeMatchAudio } from '@/utils/audio/playMatchCelebrationSound';

export interface UseMatchActionsResult {
  likedIds: Set<string>;
  likedPostIds: Set<string>;
  matchToast: MatchToastProfile | null;
  isSubmitting: boolean;
  sendFlame: (profileId: string) => Promise<void>;
  likePost: (postId: string, ownerProfileId: string) => Promise<{ likeCount: number } | null>;
  hasLiked: (profileId: string) => boolean;
  hasLikedPost: (postId: string) => boolean;
  dismissMatchToast: () => void;
}

export function useMatchActionsState(): UseMatchActionsResult {
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set());
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(() => new Set());
  const [matchToast, setMatchToast] = useState<MatchToastProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const dismissMatchToast = useCallback(() => setMatchToast(null), []);

  return {
    likedIds,
    likedPostIds,
    matchToast,
    isSubmitting,
    sendFlame,
    likePost,
    hasLiked,
    hasLikedPost,
    dismissMatchToast,
  };
}
