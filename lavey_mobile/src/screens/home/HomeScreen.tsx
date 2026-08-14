import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
  Modal,
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
import { Ionicons } from "@expo/vector-icons";
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
import { ReceivedLikesSheet } from "./components/ReceivedLikesSheet";
import { useProfilesWhoLikedYou } from "../../hooks/useProfilesWhoLikedYou";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { chatApi, contentApi, discoverApi, profileApi, reportApi, settingsApi, type UserSettings } from "../../api/services";
import { LoadingIndicator } from "../../components/common/LoadingIndicator";
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
import { CrushConfirmSheet } from "./components/CrushConfirmSheet";
import {
  ProfileOptionsSheet,
  type ProfileOptionAction,
} from "./components/ProfileOptionsSheet";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import type { MainTabParamList } from "../../components/navigation/BottomTabNavigator";
import { FilterModal, type Filters } from "../discover/components/FilterModal";
import { PaidChatSheet } from "../discover/components/PaidChatSheet";
import { consumeFirstTimeHintsFlag } from "../../utils/discoverOnboardingPrefs";
import { DEFAULT_DISCOVER_FILTERS } from "../../utils/discoverFiltersFromOnboarding";
import {
  markDiscoverFiltersManual,
  resolveDiscoverFilters,
  saveDiscoverFilters,
} from "../../utils/discoverFilterStorage";
import { loadDiscoverFeedWithFallback } from "../../utils/discoverFeedLoader";
import { appDataCache } from "../../utils/appDataCache";
import { PlatinumModal } from "../../components/subscription/PlatinumModal";
import { markNotificationPrimerEligible } from "../../hooks/usePushRegistration";
import { useAccessMode } from "../../context/AccessModeContext";
import { useTranslatedStrings } from "../../hooks/useTranslatedStrings";
import { HOME_SCREEN_STRINGS } from "./homeScreen.strings";
const initialFilters: Filters = DEFAULT_DISCOVER_FILTERS;
type FeedEntry = { key: string; profile: Profile };

function createFeedEntries(profiles: Profile[], cycle: number): FeedEntry[] {
  return profiles.map((profile) => ({ key: `${cycle}-${profile.id}`, profile }));
}
/** Fisherâ€“Yates shuffle (mutates copy). */
function shuffleProfiles(profiles: Profile[]): Profile[] {
  const next = [...profiles];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}
export function HomeScreen({
  navigation,
}: BottomTabScreenProps<MainTabParamList, "Home">) {
  const { session } = useAuth();
  const { profile: cachedProfile, refreshProfile } = useAppData();
  const { allFree, ready: accessModeReady } = useAccessMode();
  const { mode } = useAppearance();
  const web = mode === "web";
  const { height } = useWindowDimensions();
  const tabBarHeight = useBottomTabBarHeight();
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
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(initialFilters);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [filtersReady, setFiltersReady] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [coinsProfile, setCoinsProfile] = useState<Profile | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const resolved = await resolveDiscoverFilters(session?.user.id);
      if (cancelled) return;
      setFilters(resolved);
      setDraftFilters(resolved);
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
  const completeProfileSetup = useCallback(() => {
    setupGate.continueToFeed();
    setFirstTimeHints(true);
    void consumeFirstTimeHintsFlag();
    void markNotificationPrimerEligible();
  }, [setupGate.continueToFeed]);

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
  const [crushConfirmProfile, setCrushConfirmProfile] = useState<Profile | null>(null);
  const [crushSending, setCrushSending] = useState(false);
  const [optionsProfile, setOptionsProfile] = useState<Profile | null>(null);
  // Tracks which specific feed card (not just which profile) the options sheet was opened
  // from â€” the same profile can recycle into multiple feed slots, and "Clear display"
  // must only affect the exact card that was long-pressed, not every card for that person.
  const [optionsEntryKey, setOptionsEntryKey] = useState<string | null>(null);
  const [feedProfile, setFeedProfile] = useState<Profile | null>(null);
  const [clearDisplayKey, setClearDisplayKey] = useState<string | null>(null);
  const [likesSheetOpen, setLikesSheetOpen] = useState(false);
  const { profiles: likerProfiles, likedBackIds, count: likesBadgeCount, loading: likersLoading, refetch: refetchLikers } = useProfilesWhoLikedYou();
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [segment, setSegment] = useState<"forYou" | "nearby">("forYou");
  const [language, setLanguage] = useState<UserSettings["language"]>("en");
  const { t } = useTranslatedStrings(HOME_SCREEN_STRINGS, language);
  useFocusEffect(useCallback(() => setSegment("forYou"), []));
  useFocusEffect(useCallback(() => {
    void settingsApi.get().then((value) => {
      setLanguage(value.language);
    }).catch(() => undefined);
  }, []));
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
    if (isRefilter) setFiltering(true);
    else if (!profilesRef.current.length) setLoading(true);
    try {
      const result = await loadDiscoverFeedWithFallback(filters);
      if (session?.user.id) {
        void appDataCache.setFeed(session.user.id, JSON.stringify(filters), result);
      }
      // Nothing new left (everyone's been liked/swiped) — keep the deck going
      // by looping back through profiles already seen instead of going empty.
      const nextProfiles =
        result.profiles.length > 0
          ? result.profiles
          : shuffleProfiles(profilesRef.current);
      setProfiles(nextProfiles);
      feedCycle.current += 1;
      setFeed(createFeedEntries(nextProfiles, feedCycle.current));
      setIndex(0);
      setError(null);
      if (result.myLikedProfileIds?.length) {
        const alreadyLiked = result.myLikedProfileIds;
        setLikedIds((prev) => new Set([...prev, ...alreadyLiked]));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load profiles.");
    } finally {
      setLoading(false);
      setFiltering(false);
    }
  }, [filters, filtersReady, session?.user.id]);
  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !web || !filtersReady) return;
    setLoadingMore(true);
    try {
      const result = await loadDiscoverFeedWithFallback(filters);
      feedCycle.current += 1;
      if (result.myLikedProfileIds?.length) {
        const alreadyLiked = result.myLikedProfileIds;
        setLikedIds((prev) => new Set([...prev, ...alreadyLiked]));
      }
      const nextEntries = createFeedEntries(result.profiles, feedCycle.current);
      setFeed((current) => {
        if (nextEntries.length) return [...current, ...nextEntries];
        return [
          ...current,
          ...current.map((entry, index) => ({
            ...entry,
            key: `${feedCycle.current}-replay-${index}-${entry.profile.id}`,
          })),
        ];
      });
    } catch {
      // Keep the current feed usable; pull-to-refresh remains available.
    } finally {
      setLoadingMore(false);
    }
  }, [filters, filtersReady, loading, loadingMore, web]);
  useEffect(() => {
    if (!filtersReady || !session?.user.id) return;
    let cancelled = false;
    void (async () => {
      const cached = await appDataCache.getFeed(session.user.id, JSON.stringify(filters));
      if (cancelled) return;
      if (cached?.profiles.length) {
        setProfiles(cached.profiles);
        feedCycle.current += 1;
        setFeed(createFeedEntries(cached.profiles, feedCycle.current));
        setLoading(false);
        if (cached.myLikedProfileIds?.length) {
          setLikedIds((prev) => new Set([...prev, ...cached.myLikedProfileIds!]));
        }
      }
      if (!cancelled) void load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load, filtersReady, session?.user.id, filters]);
  useEffect(() => {
    // Post likes aren't included in the discover feed response (that only covers profile
    // likes), so restore the red-heart state for posts liked in past sessions separately.
    contentApi
      .myLikedPostIds()
      .then((ids) => setLikedPostIds((prev) => new Set([...prev, ...ids])))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (loading || feed.length > 0) return;
    const timer = setTimeout(() => void load(), 4000);
    return () => clearTimeout(timer);
  }, [loading, feed.length, load]);
  const likeProfile = useCallback(
    async (profile: Profile) => {
      if (likedIds.has(profile.id)) return;
      setLikedIds((prev) => new Set(prev).add(profile.id));
      try {
        await like(profile);
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
      try {
        await crush(profile);
        // Matches trigger MatchAnimation via MatchContext; a one-sided crush
        // gets no popup, just the "Sent" state on the button (matches web).
        setCrushSentIds((prev) => new Set(prev).add(profile.id));
      } catch (e) {
        Alert.alert("Crushy not sent", e instanceof Error ? e.message : "Please try again.");
      }
    },
    [crush],
  );
  const showToast = useCallback((text: string) => {
    setActionToast(text);
    setTimeout(() => setActionToast(null), 2600);
  }, []);
  const requestCrush = useCallback((profile: Profile) => {
    if (crushSentIds.has(profile.id)) return;
    setCrushConfirmProfile(profile);
  }, [crushSentIds]);
  const confirmCrush = useCallback(async () => {
    if (!crushConfirmProfile) return;
    const profile = crushConfirmProfile;
    setCrushSending(true);
    try {
      await crushProfile(profile);
    } finally {
      setCrushSending(false);
      setCrushConfirmProfile(null);
    }
  }, [crushConfirmProfile, crushProfile]);
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
  if (web)
    return (
      <SafeAreaView style={styles.webRoot} edges={[]}>
        <FlatList
          data={feed}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <ForYouProfileCard
              profile={item.profile}
              height={height - tabBarHeight}
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
              onCrushRequest={() => requestCrush(item.profile)}
              onChat={() => setCoinsProfile(item.profile)}
              onMoreOptions={() => {
                setOptionsProfile(item.profile);
                setOptionsEntryKey(item.key);
              }}
              onViewProfile={() => setFeedProfile(item.profile)}
              onImpression={recordImpression}
            />
          )}
          pagingEnabled
          snapToInterval={height - tabBarHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          showsVerticalScrollIndicator={false}
          initialNumToRender={2}
          windowSize={3}
          maxToRenderPerBatch={2}
          removeClippedSubviews
          getItemLayout={(_, itemIndex) => ({
            length: height - tabBarHeight,
            offset: (height - tabBarHeight) * itemIndex,
            index: itemIndex,
          })}
          refreshing={false}
          onRefresh={load}
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={1.2}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          onViewableItemsChanged={onFeedViewableChanged}
          ListEmptyComponent={
            <View style={{ height: height - tabBarHeight }}>
              <LoadingIndicator label={t("Finding your best vibesâ€¦")} />
            </View>
          }
        />
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
                <Text style={styles.upgradeText}>â™› {t("UPGRADE")}</Text>
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
            <Pressable onPress={() => setLikesSheetOpen(true)}>
              <Round icon="heart" coral badge={likesBadgeCount} />
            </Pressable>
            <Pressable
              onPress={() =>
                navigation.getParent()?.navigate("DiscoveryProfiles")
              }
            >
              <Round icon="location-outline" />
            </Pressable>
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
        {filtering ? (
          <View style={styles.filterOverlay} pointerEvents="none">
            <LoadingIndicator compact />
            <Text style={styles.filterOverlayText}>{t("Updating your feed…")}</Text>
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
                  <View style={styles.spotifyBrandRow}>
                    <Ionicons name="musical-notes" size={18} color="#1ED760" />
                    <Text style={styles.spotifyBrand}>SPOTIFY PREVIEW</Text>
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
                    accessibilityLabel={`Open ${themeSongProfile.themeSong.title} in Spotify`}
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
                    <Ionicons name="shuffle" size={20} color="#1ED760" />
                    <Ionicons name="play-skip-back" size={25} color="white" />
                    <Pressable style={styles.songModalPlay} onPress={() => setThemeSongPaused((paused) => !paused)}>
                      <Ionicons name={themeSongPaused ? "play" : "pause"} size={30} color="#121212" />
                    </Pressable>
                    <Ionicons name="play-skip-forward" size={25} color="white" />
                    <Ionicons name="repeat" size={20} color="#1ED760" />
                  </View>
                  <Text style={styles.openSpotifyHint}>Tap the title to open this track on Spotify</Text>
                </>
              ) : null}
            </Pressable>
          </Pressable>
        </Modal>
        <ReceivedLikesSheet
          visible={likesSheetOpen}
          profiles={likerProfiles}
          likedBackIds={likedBackIds}
          loading={likersLoading}
          onClose={() => setLikesSheetOpen(false)}
          onLikeBack={async (profile) => {
            await likeProfile(profile);
            void refetchLikers();
          }}
          onOpenChat={(profile) => {
            setLikesSheetOpen(false);
            void openChatWithProfile(profile);
          }}
          onViewProfile={(profile) => {
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
            setFilters(draftFilters);
            setFiltersOpen(false);
            void saveDiscoverFilters(draftFilters, session?.user.id);
            void markDiscoverFiltersManual(session?.user.id);
          }}
        />
        {!allFree ? <PlatinumModal
          visible={platinumOpen}
          close={() => setPlatinumOpen(false)}
        /> : null}
        <CrushConfirmSheet
          visible={Boolean(crushConfirmProfile)}
          profileName={crushConfirmProfile?.name ?? ""}
          sending={crushSending}
          onCancel={() => (crushSending ? null : setCrushConfirmProfile(null))}
          onConfirm={() => void confirmCrush()}
        />
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
          onClose={() => setFeedProfile(null)}
          onLikeProfile={() => {
            if (feedProfile) void likeProfile(feedProfile);
          }}
          onLikePost={(post) => {
            if (feedProfile) void likePostAndTrack(feedProfile, post);
          }}
          onCrushRequest={() => {
            if (feedProfile) requestCrush(feedProfile);
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
        <LoadingIndicator />
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
      {badge ? (
        <View style={styles.roundBadge}>
          <Text style={styles.roundBadgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  webRoot: { flex: 1, backgroundColor: "#111" },
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
  spotifyBrandRow: { flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-start", marginBottom: 20 },
  spotifyBrand: { color: "#1ED760", fontFamily: theme.typography.bold, fontSize: 11, letterSpacing: 1.2 },
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
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,.93)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  roundBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF3860",
    borderWidth: 1.5,
    borderColor: "white",
  },
  roundBadgeText: { color: "white", fontFamily: theme.typography.bold, fontSize: 9 },
  upgrade: {
    borderRadius: 17,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  upgradeText: {
    fontFamily: theme.typography.bold,
    fontSize: 8,
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
  filterOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    zIndex: 40,
  },
  filterOverlayText: {
    fontFamily: theme.typography.medium,
    fontSize: 13,
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
