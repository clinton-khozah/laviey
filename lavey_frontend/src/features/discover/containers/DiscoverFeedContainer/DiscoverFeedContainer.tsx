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
  matchToast: MatchToastProfile | null;
  onFlame: (profileId: string) => void;
  onPostLike: (profile: Profile) => void;
  onRetry: () => void;
  onProfileClick: (profile: Profile) => void;
  onDismissMatchToast: () => void;
  onMatchGreeting: (text: string) => void;
  onNearEndOfFeed?: () => void;
}

export function DiscoverFeedContainer({
  profiles,
  isLoading,
  error,
  likedIds,
  likedPostIds,
  matchToast,
  onFlame,
  onPostLike,
  onRetry,
  onProfileClick,
  onDismissMatchToast,
  onMatchGreeting,
  onNearEndOfFeed,
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
        onFlame={onFlame}
        onPostLike={onPostLike}
        onProfileClick={onProfileClick}
        isLocked={Boolean(matchToast)}
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
