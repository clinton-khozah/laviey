import type { AlgorithmId } from '@/features/admin/components/AdminAlgorithmOverseer/adminAlgorithmOverseer.data';

export type TasteConfidence = 'default' | 'learning' | 'personalized';

export interface ForYouTasteInsight {
  headline: string;
  subtitle: string;
  signals: string[];
  likeCount: number;
  confidence: TasteConfidence;
  algorithmSlug: string | null;
}

export interface DiscoverFeedAlgorithm {
  id: string;
  slug: AlgorithmId;
  name: string;
  code: string;
  description: string;
  feedBanner: string;
}

export const FOR_YOU_TASTE_UPDATED_EVENT = 'lavey:for-you-taste-updated';

/** Banner only appears once the member has at least one post like to learn from. */
export function shouldShowForYouIntelligenceBanner(
  tasteInsight: ForYouTasteInsight | null | undefined,
): boolean {
  return Boolean(tasteInsight && tasteInsight.likeCount > 0);
}
