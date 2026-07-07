import { AppOverlay } from '@/components/ui/AppOverlay';
import { MatchToast } from '@/components/feed/MatchToast';
import { VerticalFeed } from '@/components/feed/VerticalFeed';
import { FeedState } from '@/components/ui/FeedState';
import { PageTransitionSplash } from '@/components/ui/PageTransitionSplash/PageTransitionSplash';
import type { MatchToastProfile, Profile } from '@/types';
import './MessagesDiscoverPage.css';

interface MessagesDiscoverPageProps {
  profiles: Profile[];
  likedIds: Set<string>;
  likedPostIds: Set<string>;
  iCrushSentIds: Set<string>;
  matchToast: MatchToastProfile | null;
  isLoading: boolean;
  error: string | null;
  onBack: () => void;
  onFlame: (profileId: string) => void;
  onICrush: (profileId: string) => void;
  onPostLike: (profile: Profile) => void;
  onProfileClick: (profile: Profile) => void;
  onDismissMatchToast: () => void;
  onMatchGreeting: (text: string) => void;
  onRetry: () => void;
  onFindClick?: () => void;
}

export function MessagesDiscoverPage({
  profiles,
  likedIds,
  likedPostIds,
  iCrushSentIds,
  matchToast,
  isLoading,
  error,
  onBack,
  onFlame,
  onICrush,
  onPostLike,
  onProfileClick,
  onDismissMatchToast,
  onMatchGreeting,
  onRetry,
  onFindClick,
}: MessagesDiscoverPageProps) {
  return (
    <AppOverlay>
      <div className="messages-discover-page">
        <div className="messages-discover-page__chrome">
          <div className="messages-discover-page__header-row">
            <button type="button" className="messages-discover-page__back" onClick={onBack} aria-label="Back">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div className="messages-discover-page__title-wrap">
              <h1 className="messages-discover-page__title">Discovery</h1>
            </div>
            {onFindClick ? (
              <button
                type="button"
                className="messages-discover-page__find"
                onClick={onFindClick}
                aria-label="Find people"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-4-4" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>

        <div className="messages-discover-page__feed">
          {isLoading && profiles.length === 0 ? <PageTransitionSplash /> : null}

          {error && !isLoading ? <FeedState message={error} onRetry={onRetry} /> : null}

          {!isLoading && !error && profiles.length === 0 ? (
            <FeedState
              message="No new people to discover right now. Check back soon."
              onRetry={onRetry}
            />
          ) : null}

          {!error && profiles.length > 0 ? (
            <VerticalFeed
              profiles={profiles}
              likedIds={likedIds}
              likedPostIds={likedPostIds}
              iCrushSentIds={iCrushSentIds}
              onFlame={onFlame}
              onICrush={onICrush}
              onPostLike={onPostLike}
              onProfileClick={onProfileClick}
              onMoreOptions={() => {}}
              isLocked={Boolean(matchToast)}
            />
          ) : null}
        </div>

        <MatchToast
          match={matchToast}
          onClose={onDismissMatchToast}
          onSendGreeting={onMatchGreeting}
        />
      </div>
    </AppOverlay>
  );
}
