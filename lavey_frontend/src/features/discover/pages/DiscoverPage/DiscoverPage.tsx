import { useEffect, useRef, useState } from 'react';
import { DiscoverFilterSheet } from '@/components/discover/DiscoverFilterSheet';
import { DiscoverProfileSetupGate } from '@/components/discover/DiscoverProfileSetupGate';
import { ReceivedLikesSheet } from '@/components/feed/ReceivedLikesSheet';
import { TopBar } from '@/components/layout/TopBar';
import { PlatinumUpgradeSheet } from '@/components/subscription/PlatinumUpgradeSheet';
import { MatchProfileModal } from '@/components/messages/MatchProfileModal';
import { DiscoverFeedContainer } from '@/features/discover/containers/DiscoverFeedContainer';
import { FeedState } from '@/components/ui/FeedState';
import { PageTransitionSplash } from '@/components/ui/PageTransitionSplash/PageTransitionSplash';
import { messageService } from '@/services';
import {
  useDiscoverFeed,
  useDiscoverFilters,
  useDiscoverSetupGate,
  useFlameQuota,
  useMatchActions,
  useLiveUserLocation,
  useProfilesWhoLikedYou,
  useUserProfile,
} from '@/hooks';
import { userProfileService } from '@/services/users/userProfileService';
import { subscribeAlgorithmChange } from '@/features/admin/algorithm/algorithmConfig';
import type { Profile } from '@/types';
import { navigateAppTo, openChatWithProfile } from '@/utils/navigation/appNav';
import './DiscoverPage.css';

/**
 * Discover feature page — wires hooks (data) to presentational components (UI).
 */
export function DiscoverPage() {
  const { filters, setFilters, resetFilters, hasActiveFilters } = useDiscoverFilters();
  const { profiles, isLoading, error, filter, setFilter, refetch, onNearEndOfFeed } =
    useDiscoverFeed('for-you', filters);
  const { quota, isLoading: isQuotaLoading } = useFlameQuota();
  const {
    profile: userProfile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchUserProfile,
  } = useUserProfile();
  const {
    isGateActive,
    gatePhase,
    canContinue,
    skip: skipDiscoverSetup,
    continueToFeed,
  } = useDiscoverSetupGate(userProfile);
  const { likedIds, likedPostIds, matchToast, sendFlame, likePost, isSubmitting, dismissMatchToast } =
    useMatchActions();
  const [profileModal, setProfileModal] = useState<Profile | null>(null);
  const [likesOpen, setLikesOpen] = useState(false);
  const [platinumOpen, setPlatinumOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { location, requestLocation } = useLiveUserLocation();
  const lastSyncedLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastSyncAtRef = useRef<number>(0);
  const { profiles: receivedLikers, count: likeCount } = useProfilesWhoLikedYou();
  const isPremium = userProfile?.isPremium ?? false;

  const modalLiked = profileModal ? likedIds.has(profileModal.id) : false;

  const handleFlameFromModal = () => {
    if (!profileModal || modalLiked) return;
    void sendFlame(profileModal.id);
  };

  const handlePostLike = (profile: Profile) => {
    const postId = profile.posts[0]?.id;
    if (!postId || likedPostIds.has(postId)) return;
    void likePost(postId, profile.id);
  };

  const sendMatchGreeting = (profileId: string, text: string) => {
    void (async () => {
      const conversationId = await messageService.findConversationByProfileId(profileId);
      if (conversationId) await messageService.sendMessage(conversationId, text);
    })();
  };

  const handleMatchGreeting = (text: string) => {
    if (!matchToast?.profileId) return;
    window.sessionStorage.setItem('lavey:pendingGreetingProfileId', matchToast.profileId);
    window.sessionStorage.setItem('lavey:pendingGreetingText', text);
    dismissMatchToast();
    navigateAppTo('messages');
  };

  useEffect(() => subscribeAlgorithmChange(() => void refetch()), [refetch]);

  useEffect(() => {
    if (!isGateActive) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refetchUserProfile();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [isGateActive, refetchUserProfile]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    if (!location) return;
    const now = Date.now();
    if (now - lastSyncAtRef.current < 15000) return;

    const last = lastSyncedLocationRef.current;
    const movedKm = last
      ? Math.sqrt(
          Math.pow(location.latitude - last.latitude, 2) +
            Math.pow(location.longitude - last.longitude, 2),
        ) * 111
      : Number.POSITIVE_INFINITY;

    if (movedKm < 0.15) return;

    lastSyncAtRef.current = now;
    lastSyncedLocationRef.current = {
      latitude: location.latitude,
      longitude: location.longitude,
    };

    void (async () => {
      try {
        await userProfileService.updateMyLocation(location);
        await refetch();
      } catch {
        // Discover feed should still remain usable if location sync fails.
      }
    })();
  }, [location, refetch]);

  const showFeedBackground = !isGateActive || gatePhase !== 'inactive';
  const showDiscoverChrome = showFeedBackground;
  const showSetupGate = isGateActive && gatePhase === 'setup-modal' && Boolean(userProfile);
  const showSetupLoading =
    isGateActive && gatePhase === 'setup-modal' && !userProfile && profileLoading;
  const showSetupError =
    isGateActive && gatePhase === 'setup-modal' && !userProfile && !profileLoading && Boolean(profileError);

  return (
    <div className="discover-page">
      {showSetupLoading ? <PageTransitionSplash /> : null}

      {showSetupError ? (
        <FeedState message={profileError!} onRetry={() => void refetchUserProfile()} />
      ) : null}

      {showSetupGate && userProfile ? (
        <DiscoverProfileSetupGate
          profile={userProfile}
          presentation="overlay"
          canContinue={canContinue}
          onAvatarUpdated={() => refetchUserProfile()}
          onMomentAdded={() => refetchUserProfile()}
          onSkip={skipDiscoverSetup}
          onContinue={continueToFeed}
        />
      ) : null}

      {showFeedBackground ? (
        <>
      {showDiscoverChrome ? (
        <TopBar
          filter={filter}
          onFilterChange={setFilter}
          quota={quota}
          isQuotaLoading={isQuotaLoading}
          likeCount={likeCount}
          onLikesClick={() => setLikesOpen(true)}
          onDiscoveryFiltersClick={() => setFiltersOpen(true)}
          hasActiveDiscoveryFilters={hasActiveFilters}
          isPremium={isPremium}
          onUpgrade={() => setPlatinumOpen(true)}
        />
      ) : null}
      <DiscoverFilterSheet
        open={filtersOpen}
        filters={filters}
        onClose={() => setFiltersOpen(false)}
        onApply={setFilters}
        onReset={resetFilters}
      />
      <DiscoverFeedContainer
        profiles={profiles}
        isLoading={isLoading}
        error={error}
        onNearEndOfFeed={onNearEndOfFeed}
        likedIds={likedIds}
        likedPostIds={likedPostIds}
        matchToast={matchToast}
        onFlame={sendFlame}
        onPostLike={handlePostLike}
        onRetry={() => void refetch()}
        onProfileClick={setProfileModal}
        onDismissMatchToast={dismissMatchToast}
        onMatchGreeting={handleMatchGreeting}
      />
      <ReceivedLikesSheet
        open={likesOpen}
        isPremium={isPremium}
        likers={receivedLikers}
        likedProfileIds={likedIds}
        onClose={() => setLikesOpen(false)}
        onUpgrade={() => {
          setLikesOpen(false);
          setPlatinumOpen(true);
        }}
        onLikeBack={(profileId) => void sendFlame(profileId)}
        onChat={(profileId) => {
          setLikesOpen(false);
          openChatWithProfile(profileId);
        }}
        onProfileClick={(p) => {
          setLikesOpen(false);
          setProfileModal(p);
        }}
      />

      <PlatinumUpgradeSheet
        open={platinumOpen}
        onClose={() => setPlatinumOpen(false)}
      />

      <MatchProfileModal
        open={profileModal !== null}
        mode="discover"
        profile={profileModal}
        liked={modalLiked}
        likedYou={profileModal?.likedYou ?? false}
        isLoading={false}
        isSubmittingFlame={isSubmitting}
        onClose={() => setProfileModal(null)}
        onFlame={handleFlameFromModal}
        onSendMessage={
          profileModal && modalLiked && profileModal.likedYou
            ? (text) => sendMatchGreeting(profileModal.id, text)
            : undefined
        }
      />
        </>
      ) : null}
    </div>
  );
}
