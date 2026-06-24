import { useEffect, useMemo, useRef, useState } from 'react';
import { DiscoverFilterSheet } from '@/components/discover/DiscoverFilterSheet';
import { ForYouIntelligenceBanner } from '@/components/discover/ForYouIntelligenceBanner';
import { DiscoverProfileSetupGate } from '@/components/discover/DiscoverProfileSetupGate';
import { ReceivedLikesSheet } from '@/components/feed/ReceivedLikesSheet';
import { TopBar } from '@/components/layout/TopBar';
import { PlatinumUpgradeSheet } from '@/components/subscription/PlatinumUpgradeSheet';
import { MatchProfileModal } from '@/components/messages/MatchProfileModal';
import { MessagesDiscoverPage } from '@/components/messages/MessagesDiscoverPage';
import { DiscoverFeedContainer } from '@/features/discover/containers/DiscoverFeedContainer';
import { FeedState } from '@/components/ui/FeedState';
import { PageTransitionSplash } from '@/components/ui/PageTransitionSplash/PageTransitionSplash';
import { messageService } from '@/services';
import {
  useAuth,
  useDiscoverFeed,
  useDiscoverFilters,
  useDiscoverSetupGate,
  useFlameQuota,
  useMatchActions,
  useLiveUserLocation,
  useMessagesFindSuggestions,
  useProfilesWhoLikedYou,
  useUserProfile,
} from '@/hooks';
import { userProfileService } from '@/services/users/userProfileService';
import { subscribeAlgorithmChange } from '@/features/admin/algorithm/algorithmConfig';
import type { Profile } from '@/types';
import { hasPremiumAccess } from '@/config/features';
import { navigateAppTo, openChatWithProfile } from '@/utils/navigation/appNav';
import { applyForYouFeedFilters } from '@/utils/discover/applyDiscoverFilters';
import { resolveForYouFeedProfiles } from '@/utils/discover/forYouFeedProfiles';
import './DiscoverPage.css';

/**
 * Discover feature page — wires hooks (data) to presentational components (UI).
 */
export function DiscoverPage() {
  const { needsOnboardingQuiz } = useAuth();
  const { filters, setFilters, resetFilters, hasActiveFilters } = useDiscoverFilters();
  const { profiles, feedPool, isFeedRecycling, myLikedProfileIds, isLoading, error, filter, setFilter, refetch, onNearEndOfFeed, feedAlgorithm, tasteInsight } =
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
  const { likedIds, likedPostIds, iCrushSentIds, matchToast, sendFlame, sendICrush, likePost, isSubmitting, dismissMatchToast } =
    useMatchActions();
  const [profileModal, setProfileModal] = useState<Profile | null>(null);
  const [likesOpen, setLikesOpen] = useState(false);
  const [platinumOpen, setPlatinumOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersUpdatedPulse, setFiltersUpdatedPulse] = useState(false);
  const filtersPulseTimerRef = useRef<number | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [findProfile, setFindProfile] = useState<Profile | null>(null);
  const { location, requestLocation } = useLiveUserLocation();
  const lastSyncedLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastSyncedPlaceRef = useRef('');
  const lastSyncAtRef = useRef<number>(0);
  const { profiles: receivedLikers, count: likeCount } = useProfilesWhoLikedYou();
  const isPremium = hasPremiumAccess(userProfile?.isPremium);

  const pulseFilterIcon = () => {
    setFiltersUpdatedPulse(true);
    if (filtersPulseTimerRef.current !== null) {
      window.clearTimeout(filtersPulseTimerRef.current);
    }
    filtersPulseTimerRef.current = window.setTimeout(() => {
      setFiltersUpdatedPulse(false);
      filtersPulseTimerRef.current = null;
    }, 2200);
  };

  useEffect(() => {
    return () => {
      if (filtersPulseTimerRef.current !== null) {
        window.clearTimeout(filtersPulseTimerRef.current);
      }
    };
  }, []);

  const forYouPool = useMemo(() => {
    const pool = feedPool.length > 0 ? feedPool : profiles;
    if (filter !== 'for-you') return pool;
    return applyForYouFeedFilters(pool, filters);
  }, [feedPool, profiles, filter, filters]);

  const mergedLikedIds = useMemo(() => {
    const merged = new Set([...likedIds, ...myLikedProfileIds]);
    if (filter === 'for-you' && isFeedRecycling) {
      for (const profile of forYouPool) merged.add(profile.id);
    }
    return merged;
  }, [likedIds, myLikedProfileIds, filter, isFeedRecycling, forYouPool]);

  const forYouDisplayProfiles = useMemo(() => {
    if (filter !== 'for-you') return profiles;
    const { profiles: resolved } = resolveForYouFeedProfiles(forYouPool, mergedLikedIds);
    return resolved.length > 0 ? resolved : forYouPool;
  }, [filter, forYouPool, profiles, mergedLikedIds]);

  const {
    profiles: findProfiles,
    isLoading: findLoading,
    error: findError,
    refetch: refetchFind,
  } = useMessagesFindSuggestions(findOpen, filters);

  const modalLiked = profileModal ? likedIds.has(profileModal.id) : false;
  const findModalLiked = findProfile ? likedIds.has(findProfile.id) : false;

  const handleFlameFromModal = () => {
    if (!profileModal || modalLiked) return;
    void sendFlame(profileModal.id);
  };

  const handlePostLike = (profile: Profile) => {
    const postId = profile.posts[0]?.id;
    if (!postId || likedPostIds.has(postId)) return;
    void likePost(postId, profile.id);
  };

  const handleICrush = (profileId: string) => {
    void sendICrush(profileId);
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
    setFindOpen(false);
    navigateAppTo('messages');
  };

  const handleFindPostLike = (profile: Profile) => {
    const postId = profile.posts[0]?.id;
    if (!postId || likedPostIds.has(postId)) return;
    void likePost(postId, profile.id);
  };

  const handleFindFlameFromModal = () => {
    if (!findProfile || findModalLiked) return;
    void sendFlame(findProfile.id);
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

    const placeKey = [location.city, location.suburb, location.province, location.country]
      .map((part) => part.trim())
      .join('|');
    const hasResolvedPlace = Boolean(location.city.trim() || location.suburb.trim());
    const now = Date.now();
    if (now - lastSyncAtRef.current < 15000 && !hasResolvedPlace) return;

    const last = lastSyncedLocationRef.current;
    const movedKm = last
      ? Math.sqrt(
          Math.pow(location.latitude - last.latitude, 2) +
            Math.pow(location.longitude - last.longitude, 2),
        ) * 111
      : Number.POSITIVE_INFINITY;

    const placeChanged = hasResolvedPlace && placeKey !== lastSyncedPlaceRef.current;
    if (movedKm < 0.15 && !placeChanged) return;

    lastSyncAtRef.current = now;
    lastSyncedLocationRef.current = {
      latitude: location.latitude,
      longitude: location.longitude,
    };
    if (placeChanged) {
      lastSyncedPlaceRef.current = placeKey;
    }

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

  if (needsOnboardingQuiz) {
    return null;
  }

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
      {showDiscoverChrome && !findOpen ? (
        <TopBar
          filter={filter}
          onFilterChange={setFilter}
          quota={quota}
          isQuotaLoading={isQuotaLoading}
          likeCount={likeCount}
          onLikesClick={() => setLikesOpen(true)}
          onDiscoveryFiltersClick={() => setFiltersOpen(true)}
          hasActiveDiscoveryFilters={hasActiveFilters}
          filtersUpdatedPulse={filtersUpdatedPulse}
          isPremium={isPremium}
          onUpgrade={() => setPlatinumOpen(true)}
          onFindClick={() => setFindOpen(true)}
        />
      ) : null}
      {showDiscoverChrome && !findOpen && filter === 'for-you' ? (
        <ForYouIntelligenceBanner
          algorithm={feedAlgorithm}
          tasteInsight={tasteInsight}
          visible={!isLoading || forYouDisplayProfiles.length > 0}
        />
      ) : null}
      <DiscoverFilterSheet
        open={filtersOpen}
        filters={filters}
        onClose={() => setFiltersOpen(false)}
        onApply={(next) => {
          setFilters(next);
          pulseFilterIcon();
        }}
        onReset={() => {
          resetFilters();
          pulseFilterIcon();
        }}
      />
      <DiscoverFeedContainer
        profiles={forYouDisplayProfiles}
        isLoading={isLoading}
        error={error}
        onNearEndOfFeed={onNearEndOfFeed}
        infiniteLoop={filter === 'for-you'}
        likedIds={mergedLikedIds}
        likedPostIds={likedPostIds}
        iCrushSentIds={iCrushSentIds}
        matchToast={matchToast}
        onFlame={sendFlame}
        onICrush={handleICrush}
        onPostLike={handlePostLike}
        onRetry={() => void refetch()}
        onProfileClick={setProfileModal}
        onDismissMatchToast={dismissMatchToast}
        onMatchGreeting={handleMatchGreeting}
      />
      <ReceivedLikesSheet
        open={likesOpen}
        likers={receivedLikers}
        likedProfileIds={likedIds}
        onClose={() => setLikesOpen(false)}
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

      {findOpen ? (
        <MessagesDiscoverPage
          profiles={findProfiles}
          likedIds={likedIds}
          likedPostIds={likedPostIds}
          iCrushSentIds={iCrushSentIds}
          matchToast={matchToast}
          isLoading={findLoading}
          error={findError}
          onBack={() => setFindOpen(false)}
          onFlame={sendFlame}
          onICrush={handleICrush}
          onPostLike={handleFindPostLike}
          onProfileClick={setFindProfile}
          onDismissMatchToast={dismissMatchToast}
          onMatchGreeting={handleMatchGreeting}
          onRetry={() => void refetchFind()}
        />
      ) : null}

      <MatchProfileModal
        open={findProfile !== null}
        mode="discover"
        profile={findProfile}
        liked={findModalLiked}
        likedYou={findProfile?.likedYou ?? false}
        isLoading={false}
        isSubmittingFlame={isSubmitting}
        onClose={() => setFindProfile(null)}
        onFlame={handleFindFlameFromModal}
        onSendMessage={
          findProfile && findModalLiked && findProfile.likedYou
            ? (text) => sendMatchGreeting(findProfile.id, text)
            : undefined
        }
      />
        </>
      ) : null}
    </div>
  );
}
