import { MatchToast } from '@/components/feed/MatchToast';
import { VerticalFeed } from '@/components/feed/VerticalFeed';
import { FeedState } from '@/components/ui/FeedState';
import { PageTransitionSplash } from '@/components/ui/PageTransitionSplash/PageTransitionSplash';
import type { MatchToastProfile, Profile } from '@/types';

export interface DiscoverFeedContainerProps {
  profiles: Profile[];
  isLoading: boolean;
  error: string | null;
  likedIds: Set<string>;
  likedPostIds: Set<string>;
  iCrushSentIds: Set<string>;
  matchToast: MatchToastProfile | null;
  onFlame: (profileId: string) => void;
  onICrush: (profileId: string) => void;
  onPostLike: (profile: Profile) => void;
  onRetry: () => void;
  onProfileClick: (profile: Profile) => void;
  onDismissMatchToast: () => void;
  onMatchGreeting: (text: string) => void;
  onNearEndOfFeed?: () => void;
  infiniteLoop?: boolean;
}

export function DiscoverFeedContainer({
  profiles,
  isLoading,
  error,
  likedIds,
  likedPostIds,
  iCrushSentIds,
  matchToast,
  onFlame,
  onICrush,
  onPostLike,
  onRetry,
  onProfileClick,
  onDismissMatchToast,
  onMatchGreeting,
  onNearEndOfFeed,
  infiniteLoop = false,
}: DiscoverFeedContainerProps) {
  if (isLoading && profiles.length === 0) {
    return <PageTransitionSplash />;
  }

  if (error) {
    return <FeedState message={error} onRetry={onRetry} />;
  }

  if (profiles.length === 0) {
    return <FeedState message="No profiles to show right now. Check back soon." onRetry={onRetry} />;
  }

  return (
    <>
      <VerticalFeed
        profiles={profiles}
        likedIds={likedIds}
        likedPostIds={likedPostIds}
        iCrushSentIds={iCrushSentIds}
        onFlame={onFlame}
        onICrush={onICrush}
        onPostLike={onPostLike}
        onProfileClick={onProfileClick}
        isLocked={Boolean(matchToast)}
        infiniteLoop={infiniteLoop}
        onNearEndOfFeed={onNearEndOfFeed}
      />
      <MatchToast
        match={matchToast}
        onClose={onDismissMatchToast}
        onSendGreeting={onMatchGreeting}
      />
    </>
  );
}
