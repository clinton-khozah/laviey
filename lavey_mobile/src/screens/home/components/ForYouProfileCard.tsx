import { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { ThemeSongDisc } from "../../../components/common/ThemeSongDisc";
import { theme } from "../../../constants/theme";
import type { Profile, ProfilePost } from "../../../types";
import { AnimatedReactionButton } from "./AnimatedReactionButton";

const MIN_COUNTABLE_DWELL_MS = 300;
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

function isOnlineNow(lastActiveAt?: string): boolean {
  if (!lastActiveAt) return false;
  const last = new Date(lastActiveAt).getTime();
  if (Number.isNaN(last)) return false;
  return Date.now() - last < ONLINE_WINDOW_MS;
}

export type ForYouProfileCardProps = {
  profile: Profile;
  height: number;
  isActive: boolean;
  profileLiked: boolean;
  likedPostIds: Set<string>;
  crushSent: boolean;
  clearDisplay: boolean;
  hideCrush?: boolean;
  hideProfileEntry?: boolean;
  formal?: boolean;
  topContentInset?: number;
  trackImpressions?: boolean;
  onExitClearDisplay(): void;
  onOpenThemeSong(): void;
  themeSongPlaying?: boolean;
  onLikeProfile(): void;
  onLikePost(post: ProfilePost): void;
  onCrushRequest(): void;
  onChat(): void;
  onMoreOptions(): void;
  onViewProfile(): void;
  onImpression(post: ProfilePost, dwellMs: number): void;
  t(english: string): string;
};

export function ForYouProfileCard({
  profile,
  height,
  isActive,
  profileLiked,
  likedPostIds,
  crushSent,
  clearDisplay,
  hideCrush = false,
  hideProfileEntry = false,
  formal = false,
  topContentInset = 0,
  trackImpressions = true,
  onExitClearDisplay,
  onOpenThemeSong,
  themeSongPlaying = false,
  onLikeProfile,
  onLikePost,
  onCrushRequest,
  onChat,
  onMoreOptions,
  onViewProfile,
  onImpression,
  t,
}: ForYouProfileCardProps) {
  const { width } = useWindowDimensions();
  const posts = profile.posts.filter((p) => Boolean(p.src));
  const hasPosts = posts.length > 0;
  const multiPhoto = posts.length > 1;
  const [photoIndex, setPhotoIndex] = useState(0);
  const photoIndexRef = useRef(0);
  const isActiveRef = useRef(isActive);
  const dwellStartRef = useRef<number | null>(null);

  const flushDwell = useCallback(() => {
    if (!trackImpressions || dwellStartRef.current === null) return;
    const dwellMs = Date.now() - dwellStartRef.current;
    dwellStartRef.current = null;
    const activePost = posts[photoIndexRef.current];
    if (activePost && dwellMs >= MIN_COUNTABLE_DWELL_MS) onImpression(activePost, dwellMs);
  }, [onImpression, posts, trackImpressions]);

  useEffect(() => {
    isActiveRef.current = isActive;
    if (!hasPosts || !trackImpressions) return;
    if (isActive) {
      dwellStartRef.current = Date.now();
    } else {
      flushDwell();
    }
  }, [isActive, hasPosts, flushDwell, trackImpressions]);

  useEffect(() => () => flushDwell(), [flushDwell]);

  const handlePhotoIndexChange = useCallback(
    (next: number) => {
      if (next === photoIndexRef.current) return;
      if (isActiveRef.current) flushDwell();
      photoIndexRef.current = next;
      setPhotoIndex(next);
      if (isActiveRef.current && trackImpressions) dwellStartRef.current = Date.now();
    },
    [flushDwell, trackImpressions],
  );

  const activePost = hasPosts ? posts[photoIndex] : undefined;
  const liked = hasPosts ? likedPostIds.has(activePost?.id ?? "") : profileLiked;
  const onLike = () => (hasPosts && activePost ? onLikePost(activePost) : onLikeProfile());

  const isFarAway = typeof profile.distanceKm === "number" && profile.distanceKm > 40;
  const distanceLabel = isFarAway ? "" : profile.distance;
  const locationLabel = profile.locationName || distanceLabel;
  const matchMeta = formal
    ? `${profile.vibeScore}% match`
    : `${distanceLabel ? `${distanceLabel}　` : ""}${profile.vibeScore}% vibe match`;
  const pillTop = 108 + topContentInset;
  const gradientColors = formal
    ? (["rgba(0,0,0,.12)", "transparent", "rgba(0,0,0,.62)"] as const)
    : (["rgba(0,0,0,.01)", "transparent", "rgba(0,0,0,.58)"] as const);

  return (
    <View style={[styles.page, { height }]}>
      {hasPosts ? (
        <PhotoPager
          posts={posts}
          width={width}
          height={height}
          hideCrush={hideCrush}
          onIndexChange={handlePhotoIndexChange}
          onLikePost={onLikePost}
          onCrushRequest={onCrushRequest}
          onLongPress={onMoreOptions}
        />
      ) : (
        <ReactionPhoto
          uri={profile.avatar}
          style={StyleSheet.absoluteFill}
          hideCrush={hideCrush}
          onDoubleTap={onLikeProfile}
          onTripleTap={onCrushRequest}
          onLongPress={onMoreOptions}
        />
      )}
      {!clearDisplay ? (
        <>
          <LinearGradient
            pointerEvents="none"
            colors={gradientColors}
            locations={[0, 0.56, 1]}
            style={StyleSheet.absoluteFill}
          />
          {locationLabel ? (
            <View
              pointerEvents="none"
              style={[styles.locationPill, formal && styles.locationPillFormal, { top: pillTop }]}
            >
              <Ionicons name="location" size={13} color="white" />
              <Text style={[styles.locationText, formal && styles.locationTextFormal]}>{locationLabel}</Text>
            </View>
          ) : null}
          {profile.isMatch ? (
            <View pointerEvents="none" style={[styles.matchPill, formal && styles.matchPillFormal, { top: pillTop }]}>
              <Ionicons name="heart" size={13} color="white" />
              <Text style={styles.matchPillText}>{t("You matched")}</Text>
            </View>
          ) : null}
          <View pointerEvents="none" style={styles.info}>
            <View style={styles.cardNameRow}>
              <Text style={[styles.name, formal && styles.nameFormal]}>
                {profile.name}, {profile.age}
              </Text>
              {profile.verified ? (
                <Ionicons
                  name="checkmark-circle"
                  size={19}
                  color={formal ? "#FFFFFF" : "#1877F2"}
                  style={styles.cardVerified}
                />
              ) : null}
              {(profile.isOnline ?? isOnlineNow(profile.lastActiveAt)) ? (
                <View style={styles.cardOnlineDot} />
              ) : null}
            </View>
            <Text style={[styles.meta, formal && styles.metaFormal]}>{matchMeta}</Text>
            <View style={styles.interests}>
              {profile.interests.slice(0, 3).map((i) => (
                <Text key={i} style={[styles.chip, formal && styles.chipFormal]}>
                  #{i.replace(/^#/, "")}
                </Text>
              ))}
            </View>
            {multiPhoto ? (
              <View style={styles.photoDots}>
                {posts.map((p, i) => (
                  <View key={p.id} style={[styles.photoDot, i === photoIndex && styles.photoDotActive]} />
                ))}
              </View>
            ) : null}
            {activePost?.caption ? (
              <Text style={[styles.postCaption, formal && styles.postCaptionFormal]} numberOfLines={2}>
                {activePost.caption}
              </Text>
            ) : null}
          </View>
          <View style={styles.rail}>
            {!hideProfileEntry ? (
              <Pressable onPress={onViewProfile}>
                <Image source={{ uri: profile.avatar }} style={styles.railAvatar} />
              </Pressable>
            ) : null}
            <AnimatedReactionButton kind="like" active={liked} onPress={onLike} disabled={liked} />
            <Text style={[styles.railLabel, formal && styles.railLabelFormal]}>
              {liked ? t("Liked") : t("Like")}
            </Text>
            {!hideCrush ? (
              <>
                <AnimatedReactionButton
                  kind="crushy"
                  active={crushSent}
                  onPress={onCrushRequest}
                  disabled={crushSent}
                />
                <Text style={styles.railLabel}>{crushSent ? t("Sent") : "crushy"}</Text>
              </>
            ) : null}
            <Pressable onPress={onChat} hitSlop={10}>
              <Ionicons name="chatbox-outline" size={27} color="white" />
            </Pressable>
            <Text style={[styles.railLabel, formal && styles.railLabelFormal]}>{t("Chat now")}</Text>
            <Pressable onPress={onMoreOptions} hitSlop={10}>
              <Ionicons name="ellipsis-vertical" size={20} color="white" />
            </Pressable>
            {profile.themeSong ? (
              <Pressable
                onPress={onOpenThemeSong}
                hitSlop={10}
                style={styles.discPressable}
                accessibilityRole="button"
                accessibilityLabel={`Show ${profile.themeSong.title} by ${profile.themeSong.artist}`}
              >
                <ThemeSongDisc albumArtUrl={profile.themeSong.albumArtUrl} spinning={themeSongPlaying} size={40} />
              </Pressable>
            ) : null}
          </View>
        </>
      ) : (
        <Pressable style={StyleSheet.absoluteFill} onPress={onExitClearDisplay} />
      )}
    </View>
  );
}

function ReactionPhoto({
  uri,
  style,
  hideCrush = false,
  onDoubleTap,
  onTripleTap,
  onLongPress,
}: {
  uri: string;
  style?: StyleProp<ViewStyle>;
  hideCrush?: boolean;
  onDoubleTap(): void;
  onTripleTap(): void;
  onLongPress?(): void;
}) {
  const burstScale = useSharedValue(0);
  const burstOpacity = useSharedValue(0);
  const [burstKind, setBurstKind] = useState<"like" | "crush" | null>(null);

  const playBurst = useCallback(
    (kind: "like" | "crush") => {
      setBurstKind(kind);
      burstScale.value = 0;
      burstOpacity.value = 1;
      burstScale.value = withSequence(
        withTiming(1.15, { duration: 180, easing: Easing.out(Easing.back(1.6)) }),
        withTiming(1, { duration: 110 }),
      );
      burstOpacity.value = withDelay(500, withTiming(0, { duration: 260 }));
    },
    [burstOpacity, burstScale],
  );

  const handleDoubleTap = useCallback(() => {
    playBurst("like");
    onDoubleTap();
  }, [onDoubleTap, playBurst]);

  const handleTripleTap = useCallback(() => {
    if (hideCrush) return;
    playBurst("crush");
    onTripleTap();
  }, [hideCrush, onTripleTap, playBurst]);

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(280)
    .onEnd(() => runOnJS(handleDoubleTap)());

  const tripleTap = Gesture.Tap()
    .numberOfTaps(3)
    .maxDuration(450)
    .onEnd(() => runOnJS(handleTripleTap)());

  if (!hideCrush) doubleTap.requireExternalGestureToFail(tripleTap);
  const taps = hideCrush ? doubleTap : Gesture.Exclusive(tripleTap, doubleTap);

  const longPress = Gesture.LongPress()
    .minDuration(420)
    .onStart(() => {
      if (onLongPress) runOnJS(onLongPress)();
    });
  const gesture = Gesture.Race(taps, longPress);

  const burstStyle = useAnimatedStyle(() => ({
    opacity: burstOpacity.value,
    transform: [{ scale: burstScale.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={style}>
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
        <Animated.View pointerEvents="none" style={[styles.burstWrap, burstStyle]}>
          {burstKind === "crush" ? (
            <Text style={styles.burstKiss}>💋</Text>
          ) : (
            <Ionicons name="heart" size={110} color="#FF3860" style={styles.burstHeart} />
          )}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

function PhotoPager({
  posts,
  width,
  height,
  hideCrush = false,
  onIndexChange,
  onLikePost,
  onCrushRequest,
  onLongPress,
}: {
  posts: ProfilePost[];
  width: number;
  height: number;
  hideCrush?: boolean;
  onIndexChange(index: number): void;
  onLikePost(post: ProfilePost): void;
  onCrushRequest(): void;
  onLongPress(): void;
}) {
  const translateX = useSharedValue(0);
  const indexSV = useSharedValue(0);
  const burstScale = useSharedValue(0);
  const burstOpacity = useSharedValue(0);
  const [burstKind, setBurstKind] = useState<"like" | "crush" | null>(null);

  const playBurst = useCallback(
    (kind: "like" | "crush") => {
      setBurstKind(kind);
      burstScale.value = 0;
      burstOpacity.value = 1;
      burstScale.value = withSequence(
        withTiming(1.15, { duration: 180, easing: Easing.out(Easing.back(1.6)) }),
        withTiming(1, { duration: 110 }),
      );
      burstOpacity.value = withDelay(500, withTiming(0, { duration: 260 }));
    },
    [burstOpacity, burstScale],
  );

  const handleDoubleTap = useCallback(
    (index: number) => {
      playBurst("like");
      const post = posts[index];
      if (post) onLikePost(post);
    },
    [posts, onLikePost, playBurst],
  );

  const handleTripleTap = useCallback(() => {
    if (hideCrush) return;
    playBurst("crush");
    onCrushRequest();
  }, [hideCrush, onCrushRequest, playBurst]);

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      translateX.value = -indexSV.value * width + e.translationX;
    })
    .onEnd((e) => {
      const threshold = width * 0.22;
      let next = indexSV.value;
      if ((e.translationX < -threshold || e.velocityX < -800) && next < posts.length - 1) next += 1;
      else if ((e.translationX > threshold || e.velocityX > 800) && next > 0) next -= 1;
      translateX.value = withTiming(-next * width, { duration: 220 });
      if (next !== indexSV.value) {
        indexSV.value = next;
        runOnJS(onIndexChange)(next);
      }
    });

  const longPress = Gesture.LongPress()
    .minDuration(420)
    .onStart(() => {
      runOnJS(onLongPress)();
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(280)
    .onEnd(() => runOnJS(handleDoubleTap)(indexSV.value));

  const tripleTap = Gesture.Tap()
    .numberOfTaps(3)
    .maxDuration(450)
    .onEnd(() => runOnJS(handleTripleTap)());

  if (!hideCrush) doubleTap.requireExternalGestureToFail(tripleTap);
  const taps = hideCrush ? doubleTap : Gesture.Exclusive(tripleTap, doubleTap);

  const composed = Gesture.Race(pan, longPress, taps);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  const burstStyle = useAnimatedStyle(() => ({
    opacity: burstOpacity.value,
    transform: [{ scale: burstScale.value }],
  }));

  return (
    <GestureDetector gesture={composed}>
      <View style={{ width, height, overflow: "hidden" }}>
        <Animated.View style={[{ flexDirection: "row", width: width * posts.length, height }, rowStyle]}>
          {posts.map((post) => (
            <Image
              key={post.id}
              source={{ uri: post.src }}
              style={{ width, height }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ))}
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.burstWrap, burstStyle]}>
          {burstKind === "crush" ? (
            <Text style={styles.burstKiss}>💋</Text>
          ) : (
            <Ionicons name="heart" size={110} color="#FF3860" style={styles.burstHeart} />
          )}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", overflow: "hidden", backgroundColor: "#111" },
  burstWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  burstHeart: {
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  burstKiss: { fontSize: 100, lineHeight: 118 },
  locationPill: {
    position: "absolute",
    left: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 17,
    backgroundColor: "rgba(28,28,31,.64)",
  },
  locationPillFormal: {
    backgroundColor: "rgba(20,20,24,.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.12)",
  },
  locationText: {
    color: "white",
    fontFamily: theme.typography.semibold,
    fontSize: 10,
  },
  locationTextFormal: {
    fontFamily: theme.typography.medium,
    letterSpacing: 0.3,
  },
  matchPill: {
    position: "absolute",
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 17,
    backgroundColor: "#FF3860",
  },
  matchPillFormal: {
    backgroundColor: "rgba(255,56,96,.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.16)",
  },
  matchPillText: {
    color: "white",
    fontFamily: theme.typography.semibold,
    fontSize: 10,
  },
  photoDots: { flexDirection: "row", gap: 4, marginTop: 10 },
  photoDot: {
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,.35)",
  },
  photoDotActive: { backgroundColor: "white" },
  cardNameRow: { flexDirection: "row", alignItems: "center" },
  name: { color: "white", fontFamily: theme.typography.bold, fontSize: 24 },
  nameFormal: { fontSize: 25, letterSpacing: -0.3 },
  cardVerified: { marginLeft: 6 },
  cardOnlineDot: {
    marginLeft: 8,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#25D375",
    borderWidth: 2,
    borderColor: "white",
  },
  meta: {
    color: "rgba(255,255,255,.9)",
    fontFamily: theme.typography.semibold,
    fontSize: 12,
    marginTop: 4,
  },
  metaFormal: {
    fontFamily: theme.typography.medium,
    color: "rgba(255,255,255,.78)",
    letterSpacing: 0.2,
  },
  interests: { flexDirection: "row", gap: 7, marginTop: 10 },
  chip: {
    color: "white",
    fontFamily: theme.typography.semibold,
    fontSize: 9,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(20,25,32,.76)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.22)",
  },
  chipFormal: {
    backgroundColor: "rgba(255,255,255,.1)",
    borderColor: "rgba(255,255,255,.18)",
  },
  postCaption: {
    color: "white",
    fontFamily: theme.typography.medium,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 9,
  },
  postCaptionFormal: {
    color: "rgba(255,255,255,.88)",
    lineHeight: 18,
  },
  info: { position: "absolute", left: 18, right: 60, bottom: 30 },
  rail: {
    position: "absolute",
    right: 8,
    bottom: 50,
    alignItems: "center",
    gap: 4,
  },
  railAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "white",
    marginBottom: 8,
  },
  railLabel: {
    color: "white",
    fontFamily: theme.typography.semibold,
    fontSize: 9,
    marginBottom: 10,
  },
  railLabelFormal: {
    fontFamily: theme.typography.medium,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    fontSize: 8.5,
    opacity: 0.92,
  },
  discPressable: { marginTop: 10, padding: 3, borderRadius: 24, backgroundColor: "rgba(0,0,0,.28)" },
});
