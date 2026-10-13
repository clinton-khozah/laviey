import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type ViewToken,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { setAudioModeAsync } from "expo-audio";
import { ThemeSongAutoPlayer } from "../../components/common/ThemeSongAutoPlayer";
import { LaveyMusicMark } from "../../components/common/LaveyMusicMark";
import { ReceivedLikesSheet } from "./components/ReceivedLikesSheet";
import { useProfilesWhoLikedYou } from "../../hooks/useProfilesWhoLikedYou";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { chatApi, contentApi, discoverApi, profileApi, reportApi, settingsApi } from "../../api/services";
import { useLanguage } from "../../context/LanguageContext";
import { LoadingIndicator } from "../../components/common/LoadingIndicator";
import { useSignInLoader } from "../../components/auth/SignInHeartOverlay";
import { theme } from "../../constants/theme";
import { useAuth } from "../../hooks/useAuth";
import { useMatch } from "../../context/MatchContext";
import { useAppearance } from "../../context/AppearanceContext";
import { useDiscoverSetupGate } from "../../hooks/useDiscoverSetupGate";
import { useAppData } from "../../context/AppDataContext";
import { ProfileSetupGateScreen } from "../onboarding/ProfileSetupGateScreen";
import type { Profile, ProfilePost, UserProfile } from "../../types";
import { MatchAnimation } from "./components/MatchAnimation";
import { SwipeCard } from "./components/SwipeCard";
import { ForYouProfileCard } from "./components/ForYouProfileCard";
import { ProfileFeedModal } from "./components/ProfileFeedModal";
import { AnimatedReactionButton } from "./components/AnimatedReactionButton";
import {
  ProfileOptionsSheet,
  type ProfileOptionAction,
} from "./components/ProfileOptionsSheet";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { MainTabParamList } from "../../components/navigation/BottomTabNavigator";
import { FilterModal, type Filters } from "../discover/components/FilterModal";
import { PaidChatSheet } from "../discover/components/PaidChatSheet";
import { consumeFirstTimeHintsFlag } from "../../utils/discoverOnboardingPrefs";
import { DEFAULT_DISCOVER_FILTERS } from "../../utils/discoverFiltersFromOnboarding";
import {
  hasManualDiscoverFilters,
  markDiscoverFiltersManual,
  resolveDiscoverFilters,
  saveDiscoverFilters,
} from "../../utils/discoverFilterStorage";
import { consumePrefetchedForYouFeed, loadDiscoverFeedWithFallback } from "../../utils/discoverFeedLoader";
import { appDataCache } from "../../utils/appDataCache";
import { PlatinumModal } from "../../components/subscription/PlatinumModal";
import { markNotificationPrimerEligible } from "../../hooks/usePushRegistration";
import { useAccessMode } from "../../context/AccessModeContext";
import { useTranslatedStrings } from "../../hooks/useTranslatedStrings";
import { HOME_SCREEN_STRINGS } from "./homeScreen.strings";
const initialFilters: Filters = DEFAULT_DISCOVER_FILTERS;
type FeedEntry = { key: string; profile: Profile };

function createFeedEntries(profiles: Profile[], cycle: number): FeedEntry[] {
  const seen = new Set<string>();
  const entries: FeedEntry[] = [];
  profiles.forEach((profile, index) => {
    if (!profile.id || seen.has(profile.id)) return;
    seen.add(profile.id);
    entries.push({ key: `${cycle}-${index}-${profile.id}`, profile });
  });
  return entries;
}

function feedImageUris(entries: FeedEntry[]): string[] {
  const uris = new Set<string>();
  for (const entry of entries) {
    if (entry.profile.avatar) uris.add(entry.profile.avatar);
    for (const post of entry.profile.posts) {
      const still = post.type === "video" ? post.poster : post.src || post.poster;
      if (still) uris.add(still);
    }
  }
  return [...uris];
}

function warmFirstCardImages(profiles: Profile[]): Promise<void> {
  const uris: string[] = [];
  for (const profile of profiles.slice(0, 2)) {
    if (profile.avatar) uris.push(profile.avatar);
    for (const post of profile.posts.slice(0, 4)) {
      const still = post.type === "video" ? post.poster : post.src || post.poster;
      if (still) uris.push(still);
    }
  }
  if (!uris.length) return Promise.resolve();
  return Promise.race([
    Image.prefetch(uris).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, 900)),
  ]);
}
export function HomeScreen({
  navigation,
  route,
}: BottomTabScreenProps<MainTabParamList, "Home">) {
  const { session } = useAuth();
  const { profile: cachedProfile, refreshProfile } = useAppData();
  const { allFree, ready: accessModeReady } = useAccessMode();
  const { mode } = useAppearance();
  const web = mode === "web";
  const { height } = useWindowDimensions();
  const [pageHeight, setPageHeight] = useState(0);
  const [selfProfile, setSelfProfile] = useState<{ id: string; avatarUrl?: string; posts?: ProfilePost[] } | null>(null);
  const [gateProfile, setGateProfile] = useState<UserProfile | null>(null);
  const [verificationPending, setVerificationPending] = useState(false);

  useEffect(() => {
    if (!cachedProfile) return;
    setSelfProfile({ id: cachedProfile.id, avatarUrl: cachedProfile.avatarUrl, posts: cachedProfile.posts });
    setGateProfile(cachedProfile);
    if (cachedProfile.verified) {
      setVerificationPending(false);
      return;
    }
    void profileApi.verificationStatus().then((result) => {
      setVerificationPending(result.status === "pending");
    }).catch(() => undefined);
  }, [cachedProfile]);
  const setupGate = useDiscoverSetupGate(selfProfile);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const feedCycle = useRef(0);
  const feedListRef = useRef<FlatList<FeedEntry>>(null);
  const stickFeedToTop = useRef(false);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const { active: signInLoaderActive, finish: finishSignInLoader } = useSignInLoader();
  const signInLoaderActiveRef = useRef(signInLoaderActive);
  signInLoaderActiveRef.current = signInLoaderActive;
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(initialFilters);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [filtersReady, setFiltersReady] = useState(false);
  const [filtersManual, setFiltersManual] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [coinsProfile, setCoinsProfile] = useState<Profile | null>(null);
  useEffect(() => {
    let cancelled = false;
    setFiltersReady(false);
    void (async () => {
      const userId = session?.user.id;
      const manual = userId ? await hasManualDiscoverFilters(userId) : false;
      const resolved = userId ? await resolveDiscoverFilters(userId) : { ...DEFAULT_DISCOVER_FILTERS };
      if (cancelled) return;
      const next = manual ? resolved : { ...resolved, hasProfilePhoto: false };
      setFiltersManual(manual);
      setFilters(next);
      setDraftFilters(next);
      setFiltersReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);
  const [firstTimeHints, setFirstTimeHints] = useState(false);
  useEffect(() => {
    // Show scroll/filter hints only once the profile setup sheet has closed â€” not during
    // the peek-feed or setup-modal phases.
    if (setupGate.gatePhase !== "inactive") return;
    void consumeFirstTimeHintsFlag().then(setFirstTimeHints);
  }, [setupGate.gatePhase]);
  const completeProfileSetup = useCallback(async () => {
    await refreshProfile(true);
    setupGate.continueToFeed();
    setFirstTimeHints(true);
    void consumeFirstTimeHintsFlag();
    void markNotificationPrimerEligible();
  }, [refreshProfile, setupGate.continueToFeed]);

  const openVerificationFromGate = useCallback(() => {
    const profile = gateProfile ?? cachedProfile;
    if (!profile) {
      void refreshProfile().then((next) => {
        if (next) navigation.getParent()?.navigate("VerifyIdentity", { profile: next });
      });
      return;
    }
    navigation.getParent()?.navigate("VerifyIdentity", { profile });
  }, [navigation, gateProfile, cachedProfile, refreshProfile]);
  const [platinumOpen, setPlatinumOpen] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [crushSentIds, setCrushSentIds] = useState<Set<string>>(new Set());
  const [optionsProfile, setOptionsProfile] = useState<Profile | null>(null);
  // Tracks which specific feed card (not just which profile) the options sheet was opened
  // from â€” the same profile can recycle into multiple feed slots, and "Clear display"
  // must only affect the exact card that was long-pressed, not every card for that person.
  const [optionsEntryKey, setOptionsEntryKey] = useState<string | null>(null);
  const [feedProfile, setFeedProfile] = useState<Profile | null>(null);
  const [clearDisplayKey, setClearDisplayKey] = useState<string | null>(null);
  const [likesSheetOpen, setLikesSheetOpen] = useState(false);
  const [returnToLikes, setReturnToLikes] = useState(false);
  const [feedIndex, setFeedIndex] = useState(0);
  useEffect(() => {
    if (!stickFeedToTop.current) return;
    stickFeedToTop.current = false;
    setFeedIndex(0);
    requestAnimationFrame(() => {
      feedListRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
  }, [feed]);
  useEffect(() => {
    if (route.params?.openLikes) {
      setLikesSheetOpen(true);
      navigation.setParams({ openLikes: undefined });
    }
    if (route.params?.openFilters) {
      setFiltersOpen(true);
      navigation.setParams({ openFilters: undefined });
    }
  }, [navigation, route.params?.openFilters, route.params?.openLikes]);
  const { profiles: likerProfiles, likedBackIds, loading: likersLoading, refetch: refetchLikers } = useProfilesWhoLikedYou();
  useFocusEffect(useCallback(() => {
    void refetchLikers(true);
  }, [refetchLikers]));
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [segment, setSegment] = useState<"forYou" | "nearby">("forYou");
  const { language } = useLanguage();
  const { t } = useTranslatedStrings(HOME_SCREEN_STRINGS, language);
  useFocusEffect(useCallback(() => setSegment("forYou"), []));
  const [tabLayouts, setTabLayouts] = useState<{
    forYou?: { x: number; width: number };
    nearby?: { x: number; width: number };
  }>({});
  const pillX = useSharedValue(0);
  const pillWidth = useSharedValue(0);
  const pillOpacity = useSharedValue(0);
  useEffect(() => {
    const target = tabLayouts[segment];
    if (!target) return;
    if (pillWidth.value === 0) {
      // First measurement â€” snap into place instead of sliding in from the corner.
      pillX.value = target.x;
      pillWidth.value = target.width;
      pillOpacity.value = withTiming(1, { duration: 140 });
    } else {
      pillX.value = withTiming(target.x, { duration: 240, easing: Easing.out(Easing.quad) });
      pillWidth.value = withTiming(target.width, { duration: 240, easing: Easing.out(Easing.quad) });
    }
  }, [segment, tabLayouts, pillOpacity, pillWidth, pillX]);
  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
    width: pillWidth.value,
    opacity: pillOpacity.value,
  }));
  const measureTab = useCallback(
    (key: "forYou" | "nearby") => (event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      setTabLayouts((prev) => ({ ...prev, [key]: { x, width } }));
    },
    [],
  );
  const { like, likePost, crush } = useMatch();
  const profilesRef = useRef<Profile[]>([]);
  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);
  const load = useCallback(async () => {
    if (!filtersReady) return;
    const isRefilter = profilesRef.current.length > 0;
    setLoading(true);
    if (isRefilter) {
      profilesRef.current = [];
      setProfiles([]);
      setFeed([]);
    }
    try {
      const warmed = consumePrefetchedForYouFeed(filters, filtersManual);
      const result = warmed ? await warmed : await loadDiscoverFeedWithFallback(filters, filtersManual);
      if (session?.user.id) {
        void appDataCache.setFeed(session.user.id, JSON.stringify(filters), result);
      }
      // Nothing new left (everyone's been liked/swiped) — keep the deck going
      // by looping back through profiles already seen instead of going empty.
      const nextProfiles = result.profiles;
      setProfiles(nextProfiles);
      feedCycle.current += 1;
      setFeed(createFeedEntries(nextProfiles, feedCycle.current));
      setIndex(0);
      setFeedIndex(0);
      setError(null);
      if (result.myLikedProfileIds?.length) {
        const alreadyLiked = result.myLikedProfileIds;
        setLikedIds((prev) => new Set([...prev, ...alreadyLiked]));
      }
      await warmFirstCardImages(nextProfiles);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load profiles.");
    } finally {
      setLoading(false);
      if (signInLoaderActiveRef.current) finishSignInLoader();
    }
  }, [filters, filtersManual, filtersReady, finishSignInLoader, session?.user.id]);
  const loadingMoreRef = useRef(false);
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || loading || !web || !filtersReady) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const result = await loadDiscoverFeedWithFallback(filters, filtersManual);
      feedCycle.current += 1;
      if (result.myLikedProfileIds?.length) {
        const alreadyLiked = result.myLikedProfileIds;
        setLikedIds((prev) => new Set([...prev, ...alreadyLiked]));
      }
      const nextEntries = createFeedEntries(result.profiles, feedCycle.current);
      if (!nextEntries.length) return;
      setFeed((current) => {
        const seen = new Set(current.map((entry) => entry.profile.id));
        const fresh = nextEntries.filter((entry) => !seen.has(entry.profile.id));
        return fresh.length ? [...current, ...fresh] : current;
      });
    } catch {
      // Keep the current feed usable; pull-to-refresh remains available.
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [filters, filtersManual, filtersReady, loading, web]);
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;
  useEffect(() => {
    if (!web || loading || loadingMore || feed.length === 0 || feedIndex > 0) return;
    const remaining = feed.length - feedIndex - 1;
    if (remaining <= 4) void loadMoreRef.current();
  }, [web, loading, loadingMore, feed.length, feedIndex]);
  useEffect(() => {
    if (!web || feed.length === 0) return;
    const uris = feedImageUris(feed.slice(feedIndex, feedIndex + 2));
    if (uris.length) void Image.prefetch(uris);
  }, [web, feed, feedIndex]);
  const feedPrefetchedRef = useRef(false);
  useEffect(() => {
    feedPrefetchedRef.current = false;
  }, [filters]);
  useEffect(() => {
    if (!web || loading || feed.length === 0 || feedPrefetchedRef.current) return;
    feedPrefetchedRef.current = true;
    void loadMoreRef.current();
  }, [web, loading, feed.length]);
  useEffect(() => {
    if (!filtersReady || !session?.user.id) return;
    let cancelled = false;
    void (async () => {
      const cached = await appDataCache.getFeed(session.user.id, JSON.stringify(filters));
      if (cancelled) return;
      if (cached?.profiles.length) {
        profilesRef.current = cached.profiles;
        setProfiles(cached.profiles);
        feedCycle.current += 1;
        setFeed(createFeedEntries(cached.profiles, feedCycle.current));
        setLoading(false);
        await warmFirstCardImages(cached.profiles);
        finishSignInLoader();
        if (cached.myLikedProfileIds?.length) {
          setLikedIds((prev) => new Set([...prev, ...cached.myLikedProfileIds!]));
        }
      }
      if (!cancelled) void load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load, filtersReady, session?.user.id, session?.token, filters, finishSignInLoader]);
  useEffect(() => {
    // Post likes aren't included in the discover feed response (that only covers profile
    // likes), so restore the red-heart state for posts liked in past sessions separately.
    contentApi
      .myLikedPostIds()
      .then((ids) => setLikedPostIds((prev) => new Set([...prev, ...ids])))
      .catch(() => {});
  }, []);
  useEffect(() => {
    const genderNarrowed = filters.genders.length > 0 && filters.genders.length < 3;
    if (loading || feed.length > 0 || filtersManual || genderNarrowed) return;
    const timer = setTimeout(() => void load(), 4000);
    return () => clearTimeout(timer);
  }, [loading, feed.length, load, filters.genders, filtersManual]);
  const likeProfile = useCallback(
    async (profile: Profile, options?: { showMatch?: boolean }) => {
      if (likedIds.has(profile.id)) return;
      setLikedIds((prev) => new Set(prev).add(profile.id));
      try {
        await like(profile, options);
      } catch (e) {
        setLikedIds((prev) => {
          const next = new Set(prev);
          next.delete(profile.id);
          return next;
        });
        Alert.alert(
          "Like not sent",
          e instanceof Error ? e.message : "Please try again.",
        );
      }
    },
    [like, likedIds],
  );
  const likePostAndTrack = useCallback(
    async (profile: Profile, post: ProfilePost) => {
      if (likedPostIds.has(post.id)) return;
      setLikedPostIds((prev) => new Set(prev).add(post.id));
      try {
        await likePost(profile, post);
      } catch (e) {
        setLikedPostIds((prev) => {
          const next = new Set(prev);
          next.delete(post.id);
          return next;
        });
        Alert.alert(
          "Like not sent",
          e instanceof Error ? e.message : "Please try again.",
        );
      }
    },
    [likePost, likedPostIds],
  );
  const crushProfile = useCallback(
    async (profile: Profile) => {
      if (crushSentIds.has(profile.id)) return;
      setCrushSentIds((prev) => new Set(prev).add(profile.id));
      try {
        await crush(profile);
      } catch (e) {
        setCrushSentIds((prev) => {
          const next = new Set(prev);
          next.delete(profile.id);
          return next;
        });
        Alert.alert("Crushy not sent", e instanceof Error ? e.message : "Please try again.");
      }
    },
    [crush, crushSentIds],
  );
  const showToast = useCallback((text: string) => {
    setActionToast(text);
    setTimeout(() => setActionToast(null), 2600);
  }, []);
  const handleOptionAction = useCallback(
    async (action: ProfileOptionAction, profile: Profile, reason?: string) => {
      if (action === "clear-display") {
        setClearDisplayKey(optionsEntryKey);
        return;
      }
      if (action === "view-profile") {
        setFeedProfile(profile);
        return;
      }
      try {
        if (action === "report") {
          await reportApi.submit({
            subjectUserId: profile.id,
            contentType: "profile_photo",
            reason: reason || "Other",
          });
        } else {
          await settingsApi.block(profile.id);
        }
        setProfiles((prev) => prev.filter((p) => p.id !== profile.id));
        setFeed((prev) => prev.filter((entry) => entry.profile.id !== profile.id));
        showToast(
          action === "report"
            ? `Report submitted for ${profile.name}`
            : `${profile.name} blocked`,
        );
      } catch (e) {
        Alert.alert(
          "Something went wrong",
          e instanceof Error ? e.message : "Please try again.",
        );
        throw e;
      }
    },
    [showToast, optionsEntryKey],
  );
  const swipe = useCallback(
    async (direction: "left" | "right") => {
      const profile = profiles[index];
      setIndex((v) => Math.min(v + 1, profiles.length));
      if (direction === "right" && profile) await likeProfile(profile);
      if (index >= profiles.length - 1) await load();
    },
    [profiles, index, likeProfile, load],
  );
  const messageMatch = useCallback(
    async (profile: Profile, greeting: string) => {
      const { conversationId } = await chatApi.conversationByProfile(profile.id);
      if (!conversationId) throw new Error("Your match chat is still being prepared. Please try again.");
      await chatApi.send(conversationId, greeting);
      navigation.getParent()?.navigate("ChatDetail", { conversationId });
    },
    [navigation],
  );
  const openChatWithProfile = useCallback(
    async (profile: Profile) => {
      try {
        const { conversationId } = await chatApi.conversationByProfile(profile.id);
        if (!conversationId) throw new Error("Your match chat is still being prepared. Please try again.");
        navigation.getParent()?.navigate("ChatDetail", { conversationId });
      } catch (e) {
        Alert.alert("Couldn't open chat", e instanceof Error ? e.message : "Please try again.");
      }
    },
    [navigation],
  );
  const [activeFeedKey, setActiveFeedKey] = useState<string | null>(null);
  const onFeedViewableChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (first && typeof first.key === "string") setActiveFeedKey(first.key);
    if (first && typeof first.index === "number") setFeedIndex(first.index);
  }).current;
  const recordImpression = useCallback((post: ProfilePost, dwellMs: number) => {
    void contentApi.recordView(post.id, dwellMs);
  }, []);
  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });
  }, []);
  const [themeSongPaused, setThemeSongPaused] = useState(true);
  const [themeSongProfile, setThemeSongProfile] = useState<Profile | null>(null);
  const openThemeSong = useCallback((profile: Profile) => {
    setThemeSongProfile(profile);
    setThemeSongPaused(true);
  }, []);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  useFocusEffect(useCallback(() => {
    setIsScreenFocused(true);
    return () => setIsScreenFocused(false);
  }, []));
  const playingThemeSong =
    isScreenFocused && themeSongProfile?.themeSong && !themeSongPaused
      ? themeSongProfile.themeSong
      : null;
  const firstCardKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!firstTimeHints || !activeFeedKey) return;
    if (firstCardKeyRef.current === null) {
      firstCardKeyRef.current = activeFeedKey;
      return;
    }
    if (activeFeedKey !== firstCardKeyRef.current) setFirstTimeHints(false);
  }, [activeFeedKey, firstTimeHints]);
  const filterPulse = useSharedValue(1);
  useEffect(() => {
    if (!firstTimeHints) return;
    filterPulse.value = withRepeat(
      withSequence(withTiming(1.35, { duration: 650, easing: Easing.out(Easing.ease) }), withTiming(1, { duration: 650, easing: Easing.in(Easing.ease) })),
      -1,
    );
  }, [firstTimeHints, filterPulse]);
  const filterPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: filterPulse.value }],
    opacity: 2 - filterPulse.value,
  }));
  const swipeBob = useSharedValue(0);
  useEffect(() => {
    if (!firstTimeHints) return;
    swipeBob.value = withRepeat(
      withSequence(
        withTiming(12, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, [firstTimeHints, swipeBob]);
  const swipeBobStyle = useAnimatedStyle(() => ({ transform: [{ translateY: swipeBob.value }] }));
  const cardHeight = pageHeight > 0 ? Math.round(pageHeight) : Math.round(Math.max(height, 1));
  if (web)
    return (
      <SafeAreaView style={styles.webRoot} edges={[]}>
        <View style={styles.feedFrame}>
        <FlatList
          ref={feedListRef}
          style={[styles.feedList, feed.length === 0 && styles.filterFeed]}
          data={pageHeight > 0 ? feed : []}
          onLayout={(event) => {
            const next = event.nativeEvent.layout.height;
            if (next > 0) setPageHeight((current) => (Math.abs(current - next) < 0.5 ? current : next));
          }}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <ForYouProfileCard
              profile={item.profile}
              height={cardHeight}
              isActive={item.key === activeFeedKey}
              t={t}
              profileLiked={likedIds.has(item.profile.id)}
              likedPostIds={likedPostIds}
              crushSent={crushSentIds.has(item.profile.id)}
              clearDisplay={item.key === clearDisplayKey}
              onExitClearDisplay={() => setClearDisplayKey(null)}
              onOpenThemeSong={() => openThemeSong(item.profile)}
              themeSongPlaying={!themeSongPaused && themeSongProfile?.id === item.profile.id}
              onLikeProfile={() => void likeProfile(item.profile)}
              onLikePost={(post) => void likePostAndTrack(item.profile, post)}
              onCrushRequest={() => void crushProfile(item.profile)}
              onChat={() => setCoinsProfile(item.profile)}
              onMoreOptions={() => {
                setOptionsProfile(item.profile);
                setOptionsEntryKey(item.key);
              }}
              onViewProfile={() => setFeedProfile(item.profile)}
              onImpression={recordImpression}
            />
          )}
          pagingEnabled={Platform.OS === "ios"}
          snapToInterval={cardHeight}
          snapToAlignment="start"
          disableIntervalMomentum
          decelerationRate="fast"
          bounces={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={feed.length === 0 ? styles.filterEmptyGrow : undefined}
          initialNumToRender={2}
          windowSize={5}
          maxToRenderPerBatch={2}
          removeClippedSubviews={false}
          getItemLayout={(_, itemIndex) => ({
            length: cardHeight,
            offset: cardHeight * itemIndex,
            index: itemIndex,
          })}
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.35}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          onViewableItemsChanged={onFeedViewableChanged}
          ListEmptyComponent={
            <View style={[styles.filterEmpty, { minHeight: cardHeight }]}>
              {loading || signInLoaderActive ? (
                signInLoaderActive ? null : <LoadingIndicator fullScreen compact />
              ) : (
                <Text style={styles.filterEmptyText}>No people match these filters.</Text>
              )}
            </View>
          }
        />
        </View>
        <View style={styles.webTop}>
          <View style={styles.webTopSide}>
            <Pressable
              onPress={() => {
                setDraftFilters(filters);
                setFiltersOpen(true);
                setFirstTimeHints(false);
              }}
            >
              {firstTimeHints ? <Animated.View style={[styles.filterPulseRing, filterPulseStyle]} pointerEvents="none" /> : null}
              <Round icon="options" />
            </Pressable>
            {accessModeReady && !allFree ? <Pressable
              style={({ pressed }) => [pressed && { opacity: 0.72 }]}
              onPress={() => setPlatinumOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Open Platinum plans"
              hitSlop={8}
            >
              <LinearGradient
                colors={["#FFF6DB", "#F3D27A", "#D4A017", "#B8860B"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.upgrade}
              >
                <MaterialCommunityIcons name="crown" size={13} color="#3F2A02" />
                <Text style={styles.upgradeText}>{t("UPGRADE")}</Text>
              </LinearGradient>
            </Pressable> : null}
          </View>
          <View style={styles.segmentWrap} pointerEvents="box-none">
            <View style={styles.segment}>
              <Animated.View style={[styles.segmentPill, pillStyle]} pointerEvents="none" />
              <Pressable
                style={styles.segmentTab}
                hitSlop={4}
                onLayout={measureTab("forYou")}
                onPress={() => setSegment("forYou")}
              >
                <Text style={segment === "forYou" ? styles.segmentTextActive : styles.segmentTextOff}>
                  {t("For You")}
                </Text>
              </Pressable>
              <Pressable
                style={styles.segmentTab}
                hitSlop={4}
                onLayout={measureTab("nearby")}
                onPress={() => {
                  setSegment("nearby");
                  setTimeout(() => navigation.getParent()?.navigate("Nearby"), 140);
                }}
              >
                <Text style={segment === "nearby" ? styles.segmentTextActive : styles.segmentTextOff}>
                  {t("Nearby")}
                </Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.webTopSide}>
            <Pressable onPress={() => setLikesSheetOpen(true)} style={styles.likesNav} accessibilityRole="button" accessibilityLabel={`likes ${likerProfiles.length}`}>
              <Round icon="heart" coral badge={likerProfiles.length} />
              <Text style={styles.likesNavLabel}>likes</Text>
            </Pressable>
            {/* Discovery location entry commented out
            <Pressable
              onPress={() => {
                setDraftFilters(filters);
                setFiltersOpen(true);
                setFirstTimeHints(false);
              }}
            >
              <Round icon="location-outline" />
            </Pressable>
            */}
          </View>
        </View>
        {firstTimeHints ? (
          <View style={styles.scrollHintWrap} pointerEvents="none">
            <Animated.View style={swipeBobStyle}>
              <Ionicons name="chevron-down" size={30} color="white" />
            </Animated.View>
            <Text style={styles.scrollHintText}>{t("Swipe up for the next profile")}</Text>
          </View>
        ) : null}
        <ThemeSongAutoPlayer track={playingThemeSong} />
        <Modal
          visible={Boolean(themeSongProfile?.themeSong)}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setThemeSongProfile(null);
            setThemeSongPaused(true);
          }}
        >
          <Pressable
            style={styles.songModalBackdrop}
            onPress={() => {
              setThemeSongProfile(null);
              setThemeSongPaused(true);
            }}
          >
            <Pressable style={styles.songModalCard} onPress={(event) => event.stopPropagation()}>
              <Pressable
                style={styles.songModalClose}
                hitSlop={10}
                onPress={() => {
                  setThemeSongProfile(null);
                  setThemeSongPaused(true);
                }}
              >
                <Ionicons name="close" size={22} color="white" />
              </Pressable>
              {themeSongProfile?.themeSong ? (
                <>
                  <View style={styles.musicBrandRow}>
                    <LaveyMusicMark size={22} />
                    <Text style={styles.musicBrand}>THEME SONG</Text>
                  </View>
                  <Image
                    source={themeSongProfile.themeSong.albumArtUrl ? { uri: themeSongProfile.themeSong.albumArtUrl } : undefined}
                    style={styles.songModalArtwork}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                  <Text style={styles.songModalEyebrow}>
                    {themeSongPaused
                      ? `Tap play to hear ${themeSongProfile.name}'s theme song`
                      : `Playing ${themeSongProfile.name}'s theme song`}
                  </Text>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={`Open ${themeSongProfile.themeSong.title}`}
                    onPress={() => void Linking.openURL(`https://open.spotify.com/track/${themeSongProfile.themeSong?.spotifyId}`)}
                  >
                    <Text style={styles.songModalTitle}>{themeSongProfile.themeSong.title}</Text>
                  </Pressable>
                  <Text style={styles.songModalArtist}>{themeSongProfile.themeSong.artist}</Text>
                  <View style={styles.songProgressTrack}>
                    <View style={[styles.songProgressFill, themeSongPaused && styles.songProgressPaused]} />
                  </View>
                  <View style={styles.songTimeRow}>
                    <Text style={styles.songTime}>0:00</Text>
                    <Text style={styles.songTime}>0:30</Text>
                  </View>
                  <View style={styles.songControls}>
                    <Ionicons name="shuffle" size={20} color="white" />
                    <Ionicons name="play-skip-back" size={25} color="white" />
                    <Pressable style={styles.songModalPlay} onPress={() => setThemeSongPaused((paused) => !paused)}>
                      <Ionicons name={themeSongPaused ? "play" : "pause"} size={30} color="#121212" />
                    </Pressable>
                    <Ionicons name="play-skip-forward" size={25} color="white" />
                    <Ionicons name="repeat" size={20} color="white" />
                  </View>
                  <Text style={styles.openSpotifyHint}>Tap the title to open this track</Text>
                </>
              ) : null}
            </Pressable>
          </Pressable>
        </Modal>
        <ReceivedLikesSheet
          visible={likesSheetOpen}
          profiles={likerProfiles}
          likedBackIds={new Set([...likedBackIds, ...likedIds])}
          loading={likersLoading}
          onClose={() => setLikesSheetOpen(false)}
          onLikeBack={async (profile) => {
            await likeProfile(profile, { showMatch: false });
            void refetchLikers(true);
          }}
          onSendStarter={async (profile, greeting) => {
            await messageMatch(profile, greeting);
            setLikesSheetOpen(false);
          }}
          onViewProfile={(profile) => {
            setReturnToLikes(true);
            setLikesSheetOpen(false);
            setFeedProfile(profile);
          }}
        />
        <MatchAnimation onSendGreeting={messageMatch} onOpenChat={openChatWithProfile} />
        <PaidChatSheet
          visible={Boolean(coinsProfile)}
          profileId={coinsProfile?.id ?? null}
          profileName={coinsProfile?.name ?? ""}
          profileAvatar={coinsProfile?.avatar}
          onClose={() => setCoinsProfile(null)}
          onUnlocked={(conversationId) => {
            setCoinsProfile(null);
            navigation.getParent()?.navigate("ChatDetail", { conversationId });
          }}
        />
        <FilterModal
          visible={filtersOpen}
          filters={draftFilters}
          onChange={setDraftFilters}
          onClose={() => setFiltersOpen(false)}
            onApply={() => {
            stickFeedToTop.current = true;
            setFeedIndex(0);
            feedListRef.current?.scrollToOffset({ offset: 0, animated: false });
            setFilters(draftFilters);
            setFiltersManual(true);
            setFiltersOpen(false);
            void saveDiscoverFilters(draftFilters, session?.user.id);
            void markDiscoverFiltersManual(session?.user.id);
          }}
        />
        {!allFree ? <PlatinumModal
          visible={platinumOpen}
          close={() => setPlatinumOpen(false)}
        /> : null}
        <ProfileOptionsSheet
          visible={Boolean(optionsProfile)}
          profile={optionsProfile}
          onClose={() => setOptionsProfile(null)}
          onAction={handleOptionAction}
        />
        <ProfileFeedModal
          profile={feedProfile}
          visible={Boolean(feedProfile)}
          profileLiked={feedProfile ? likedIds.has(feedProfile.id) : false}
          crushSent={feedProfile ? crushSentIds.has(feedProfile.id) : false}
          likedPostIds={likedPostIds}
          onClose={() => {
            setFeedProfile(null);
            if (returnToLikes) {
              setReturnToLikes(false);
              setLikesSheetOpen(true);
            }
          }}
          onLikeProfile={() => {
            if (feedProfile) void likeProfile(feedProfile);
          }}
          onLikePost={(post) => {
            if (feedProfile) void likePostAndTrack(feedProfile, post);
          }}
          onCrushRequest={() => {
            if (feedProfile) void crushProfile(feedProfile);
          }}
          onChat={() => {
            if (feedProfile) setCoinsProfile(feedProfile);
          }}
          onProfileRemoved={(profileId) => {
            setProfiles((prev) => prev.filter((p) => p.id !== profileId));
            setFeed((prev) => prev.filter((entry) => entry.profile.id !== profileId));
            setFeedProfile(null);
          }}
        />
        {actionToast ? (
          <View style={styles.toast} pointerEvents="none">
            <Text style={styles.toastText}>{actionToast}</Text>
          </View>
        ) : null}
        <Modal
          visible={setupGate.gatePhase === "setup-modal"}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => undefined}
        >
          <ProfileSetupGateScreen
            onDone={completeProfileSetup}
            verified={gateProfile?.verified ?? false}
            verificationPending={verificationPending}
            onVerify={openVerificationFromGate}
          />
        </Modal>
      </SafeAreaView>
    );
  const current = profiles[index];
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.logo}>Lavey</Text>
      </View>
      {loading ? (
        signInLoaderActive ? <View style={{ flex: 1, backgroundColor: "#FDE7F0" }} /> : <LoadingIndicator fullScreen />
      ) : current ? (
        <>
          <View style={styles.deck}>
            {profiles
              .slice(index, index + 2)
              .reverse()
              .map((p) => (
                <SwipeCard
                  key={p.id}
                  profile={p}
                  active={p.id === current.id}
                  onSwipe={swipe}
                />
              ))}
          </View>
          <View style={styles.actions}>
            <Pressable style={styles.action} onPress={() => swipe("left")}>
              <Ionicons name="close" size={34} color={theme.colors.coral} />
            </Pressable>
            <AnimatedReactionButton kind="like" large onPress={() => void swipe("right")} />
          </View>
        </>
      ) : (
        <LoadingIndicator />
      )}
      <MatchAnimation onSendGreeting={messageMatch} onOpenChat={openChatWithProfile} />
      <Modal
        visible={setupGate.gatePhase === "setup-modal"}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => undefined}
      >
        <ProfileSetupGateScreen
          onDone={completeProfileSetup}
          verified={gateProfile?.verified ?? false}
          verificationPending={verificationPending}
          onVerify={openVerificationFromGate}
        />
      </Modal>
    </SafeAreaView>
  );
}
function Round({
  icon,
  coral,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  coral?: boolean;
  badge?: number;
}) {
  return (
    <View style={styles.round}>
      <Ionicons name={icon} size={18} color={coral ? "#FF536E" : "#14141B"} />
      {typeof badge === "number" ? (
        <View style={styles.roundBadge}>
          <Text style={styles.roundBadgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  filterEmptyGrow: { flexGrow: 1 },
  filterEmpty: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: "#FDE7F0",
  },
  filterEmptyText: { color: "#7E244E", textAlign: "center", fontSize: 16 },
  webRoot: { flex: 1, backgroundColor: "#111" },
  feedFrame: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  feedList: { flex: 1, backgroundColor: "#111", overflow: "hidden" },
  filterFeed: { backgroundColor: "#FDE7F0" },
  webTop: {
    position: "absolute",
    zIndex: 20,
    top: 36,
    left: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  webTopSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  likesNav: { alignItems: "center", marginTop: 2 },
  likesNavLabel: {
    marginTop: 8,
    color: "#FFFFFF",
    fontFamily: theme.typography.semibold,
    fontSize: 10,
    lineHeight: 12,
    textShadowColor: "rgba(0,0,0,.55)",
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  filterPulseRing: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,.6)",
  },
  scrollHintWrap: {
    position: "absolute",
    bottom: 132,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 15,
    gap: 6,
  },
  scrollHintText: {
    fontFamily: theme.typography.semibold,
    fontSize: 13,
    color: "white",
    textShadowColor: "rgba(0,0,0,.55)",
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 1 },
  },
  songModalBackdrop: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,.62)",
  },
  songModalCard: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 26,
    borderRadius: 28,
    backgroundColor: "#181818",
  },
  songModalClose: { position: "absolute", top: 16, right: 16, zIndex: 1 },
  musicBrandRow: { flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-start", marginBottom: 20 },
  musicBrand: { color: "#FFFFFF", fontFamily: theme.typography.bold, fontSize: 11, letterSpacing: 1.2 },
  songModalArtwork: { width: "100%", aspectRatio: 1, borderRadius: 6, backgroundColor: "#282828" },
  songModalEyebrow: { alignSelf: "flex-start", marginTop: 20, color: "#B3B3B3", fontFamily: theme.typography.medium, fontSize: 11 },
  songModalTitle: { alignSelf: "flex-start", marginTop: 5, color: "white", fontFamily: theme.typography.bold, fontSize: 22 },
  songModalArtist: { alignSelf: "flex-start", marginTop: 2, color: "#B3B3B3", fontFamily: theme.typography.medium, fontSize: 14 },
  songProgressTrack: { width: "100%", height: 4, marginTop: 22, borderRadius: 2, overflow: "hidden", backgroundColor: "#535353" },
  songProgressFill: { width: "38%", height: "100%", borderRadius: 2, backgroundColor: "white" },
  songProgressPaused: { backgroundColor: "#B3B3B3" },
  songTimeRow: { width: "100%", marginTop: 5, flexDirection: "row", justifyContent: "space-between" },
  songTime: { color: "#B3B3B3", fontFamily: theme.typography.regular, fontSize: 10 },
  songControls: { width: "100%", marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  songModalPlay: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", backgroundColor: "white" },
  openSpotifyHint: { marginTop: 18, color: "#B3B3B3", fontFamily: theme.typography.medium, fontSize: 10 },
  segmentWrap: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  round: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,.93)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  roundBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF3860",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  roundBadgeText: { color: "white", fontFamily: theme.typography.bold, fontSize: 10, lineHeight: 12 },
  upgrade: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 17,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  upgradeText: {
    fontFamily: theme.typography.bold,
    fontSize: 9,
    color: "#3F2A02",
  },
  segment: {
    flexDirection: "row",
    backgroundColor: "rgba(235,235,235,.92)",
    borderRadius: 20,
    padding: 3,
  },
  segmentPill: {
    position: "absolute",
    top: 3,
    bottom: 3,
    left: 0,
    backgroundColor: "white",
    borderRadius: 16,
  },
  segmentTab: {
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  segmentTextActive: {
    fontFamily: theme.typography.semibold,
    fontSize: 9,
    color: "#14141B",
  },
  segmentTextOff: {
    fontFamily: theme.typography.medium,
    fontSize: 9,
    color: "#888",
  },
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
  },
  header: { height: 70, justifyContent: "center" },
  logo: { fontFamily: theme.typography.bold, fontSize: 28 },
  deck: { flex: 1 },
  actions: {
    height: 92,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  action: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  like: { backgroundColor: theme.colors.teal },
  toast: {
    position: "absolute",
    bottom: 28,
    left: 20,
    right: 20,
    alignItems: "center",
    backgroundColor: "rgba(24,24,28,.92)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  toastText: {
    color: "white",
    fontFamily: theme.typography.semibold,
    fontSize: 12.5,
    textAlign: "center",
  },
});
