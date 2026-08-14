import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { discoverApi, profileApi } from "../../api/services";
import { theme } from "../../constants/theme";
import type { Profile } from "../../types";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import { ProfileFeedModal } from "../home/components/ProfileFeedModal";

const NEARBY_RADIUS_KM = 15;
const SEARCH_RESULT_LIMIT = 10;
const MIN_SEARCH_MS = 2200;
const MAX_RADAR_SLOTS = 10;
const RING_COLORS = ["#FF536E", "#FF7A8A", "#A855F7"] as const;
/** Fraction of maxRadius each results-tier ring sits at — nearest people land on the innermost line. */
const TIER_RADIUS_FRACTIONS = [0.42, 0.68, 0.95] as const;
/** Irrational angle step (the golden angle) so points never stack up on one side of the circle. */
const GOLDEN_ANGLE_DEG = 137.50776;
/** Minimum allowed center-to-center distance between two avatar bubbles (bubble diameter + a gap). */
const MIN_AVATAR_GAP = 58;
/** Minimum distance from the very center — keeps avatars clear of the user's own photo. */
const CENTER_CLEARANCE = 70;
const LOGO_WATERMARK = require("../../../assets/logo-tight.png");

function Ring({ delay, size }: { delay: number; size: number }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }), -1, false),
    );
  }, [delay, t]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - t.value),
    transform: [{ scale: 0.35 + t.value * 1.15 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        { width: size, height: size, borderRadius: size / 2, borderColor: RING_COLORS[delay % RING_COLORS.length] ?? RING_COLORS[0] },
        style,
      ]}
    />
  );
}

function CenterPulse({ avatarUrl }: { avatarUrl?: string }) {
  const glow = useSharedValue(0.85);

  useEffect(() => {
    glow.value = withRepeat(withSequence(withTiming(1.08, { duration: 900 }), withTiming(0.85, { duration: 900 })), -1, true);
  }, [glow]);

  const glowStyle = useAnimatedStyle(() => ({ transform: [{ scale: glow.value }] }));

  return (
    <View style={styles.centerWrap}>
      <Animated.View style={[styles.centerGlow, glowStyle]} />
      <View style={styles.centerAvatarRing}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.centerAvatar} contentFit="cover" />
        ) : (
          <View style={[styles.centerAvatar, styles.centerAvatarFallback]}>
            <Ionicons name="person" size={26} color={theme.colors.textMuted} />
          </View>
        )}
      </View>
    </View>
  );
}

/** Splits `total` across tiers proportional to each ring's circumference, so the small inner
 * ring gets fewer people (keeping them spread out) and the roomy outer ring gets more. */
function tierSizesFor(total: number) {
  const weights = TIER_RADIUS_FRACTIONS;
  const sumWeights = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w / sumWeights) * total);
  const sizes = raw.map(Math.floor);
  let remainder = total - sizes.reduce((a, b) => a + b, 0);
  const byLeftoverFrac = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < remainder; k++) sizes[byLeftoverFrac[k].i] += 1;
  return sizes;
}

type RadarPoint = { left: number; top: number; tier: number };

/**
 * Lays out `count` people on three concentric rings by rank — index 0 (nearest, since
 * callers pass profiles pre-sorted by distance) starts on the innermost ring, later
 * ranks step out to the middle and outer rings. Then runs a short relaxation pass that
 * pushes apart any pair closer than MIN_AVATAR_GAP, so avatars never overlap regardless
 * of how many land in a tier — the tiers are a starting bias, not a hard grid.
 */
function layoutRadarPoints(count: number, maxRadius: number): RadarPoint[] {
  if (count === 0) return [];
  const sizes = tierSizesFor(count);
  const points: RadarPoint[] = [];
  let globalIndex = 0;
  sizes.forEach((size, tier) => {
    const radius = maxRadius * TIER_RADIUS_FRACTIONS[tier];
    for (let i = 0; i < size; i++) {
      // Golden-angle stepping across the *global* index (not reset per tier) spreads
      // everyone around the full circle instead of bunching each ring's start near the top.
      const angleDeg = -90 + globalIndex * GOLDEN_ANGLE_DEG;
      const angle = (angleDeg * Math.PI) / 180;
      points.push({ left: Math.cos(angle) * radius, top: Math.sin(angle) * radius, tier });
      globalIndex += 1;
    }
  });

  for (let iter = 0; iter < 60; iter += 1) {
    let moved = false;
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const dx = points[j].left - points[i].left;
        const dy = points[j].top - points[i].top;
        const dist = Math.hypot(dx, dy) || 0.001;
        if (dist < MIN_AVATAR_GAP) {
          moved = true;
          const push = (MIN_AVATAR_GAP - dist) / 2;
          const ux = dx / dist;
          const uy = dy / dist;
          points[i].left -= ux * push;
          points[i].top -= uy * push;
          points[j].left += ux * push;
          points[j].top += uy * push;
        }
      }
    }
    for (const p of points) {
      const r = Math.hypot(p.left, p.top) || 0.001;
      const clamped = Math.min(maxRadius, Math.max(CENTER_CLEARANCE, r));
      if (clamped !== r) {
        p.left = (p.left / r) * clamped;
        p.top = (p.top / r) * clamped;
      }
    }
    if (!moved) break;
  }

  return points;
}

function FoundAvatar({
  profile,
  index,
  pos,
  onPress,
}: {
  profile: Profile;
  index: number;
  pos: RadarPoint;
  onPress(): void;
}) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = 120 + index * 90;
    scale.value = withDelay(delay, withSpring(1, { damping: 9, stiffness: 140 }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 220 }));
  }, [index, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: pos.left }, { translateY: pos.top }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.foundWrap, style]}>
      <Pressable onPress={onPress} hitSlop={6}>
        <LinearGradient colors={["#FF536E", "#A855F7"]} style={styles.foundRing}>
          <Image source={{ uri: profile.avatar }} style={styles.foundAvatar} contentFit="cover" />
        </LinearGradient>
        {profile.verified ? (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark" size={9} color="white" />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

function OverflowBubble({
  extraCount,
  index,
  pos,
  onPress,
}: {
  extraCount: number;
  index: number;
  pos: RadarPoint;
  onPress(): void;
}) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = 120 + index * 90;
    scale.value = withDelay(delay, withSpring(1, { damping: 9, stiffness: 140 }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 220 }));
  }, [index, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: pos.left }, { translateY: pos.top }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.foundWrap, style]}>
      <Pressable onPress={onPress} hitSlop={6} style={[styles.foundRing, styles.overflowRing]}>
        <Text style={styles.overflowText}>+{extraCount}</Text>
      </Pressable>
      <View style={styles.foundLabel}>
        <Text style={styles.foundName}>View all</Text>
      </View>
    </Animated.View>
  );
}

function NearbyListSheet({
  visible,
  profiles,
  close,
  openProfile,
}: {
  visible: boolean;
  profiles: Profile[];
  close(): void;
  openProfile(profile: Profile): void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.listBackdrop}>
        <View style={styles.listSheet}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>{profiles.length} nearby</Text>
            <Pressable style={styles.listClose} onPress={close} hitSlop={8}>
              <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
          <FlatList
            data={profiles}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable style={styles.listRow} onPress={() => openProfile(item)}>
                <Image source={{ uri: item.avatar }} style={styles.listAvatar} contentFit="cover" />
                <View style={styles.listRowText}>
                  <Text style={styles.listName}>
                    {item.name}, {item.age}
                    {item.verified ? (
                      <Text style={styles.listVerified}> ✓</Text>
                    ) : null}
                  </Text>
                  <Text style={styles.listDistance}>{item.distance}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

export function NearbyRadarScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Nearby">) {
  const { width, height } = useWindowDimensions();
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | undefined>(undefined);
  const [phase, setPhase] = useState<"searching" | "results">("searching");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchToken, setSearchToken] = useState(0);
  const [listOpen, setListOpen] = useState(false);

  const radarSize = Math.min(width, height) * 0.92;
  const maxRadius = radarSize / 2 - 26;
  const watermarkSize = Math.min(width, height) * 1.1;
  const radarProfiles = profiles.slice(0, MAX_RADAR_SLOTS);
  const overflowCount = profiles.length - radarProfiles.length;
  const radarSlotCount = radarProfiles.length + (overflowCount > 0 ? 1 : 0);
  const radarLayout = useMemo(() => layoutRadarPoints(radarSlotCount, maxRadius), [radarSlotCount, maxRadius]);

  useEffect(() => {
    void profileApi.me().then((me) => setMyAvatarUrl(me.avatarUrl)).catch(() => {});
  }, []);

  const runSearch = useCallback(async () => {
    setPhase("searching");
    setError(null);
    setSearchExpanded(false);
    const startedAt = Date.now();
    try {
      const nearbyResult = await discoverApi.list({
        filter: "nearby",
        distanceTierKm: NEARBY_RADIUS_KM,
        maxDistanceKm: NEARBY_RADIUS_KM,
        limit: SEARCH_RESULT_LIMIT,
      });
      const shouldExpand = nearbyResult.profiles.length === 0;
      const result = shouldExpand
        ? await discoverApi.list({
            filter: "nearby",
            expandDistance: true,
            limit: SEARCH_RESULT_LIMIT,
          })
        : nearbyResult;
      const sorted = [...result.profiles]
        .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
        .slice(0, SEARCH_RESULT_LIMIT);
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, MIN_SEARCH_MS - elapsed);
      setTimeout(() => {
        setSearchExpanded(shouldExpand);
        setProfiles(sorted);
        setPhase("results");
      }, wait);
    } catch (e) {
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, MIN_SEARCH_MS - elapsed);
      setTimeout(() => {
        setError(e instanceof Error ? e.message : "Please try again.");
        setPhase("results");
      }, wait);
    }
  }, []);

  useEffect(() => {
    void runSearch();
  }, [runSearch, searchToken]);

  const searching = phase === "searching";

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#FFFFFF", "#FFF3F5", "#F7F7FB"]} style={StyleSheet.absoluteFill} />
      <Image
        source={LOGO_WATERMARK}
        style={[styles.watermark, { width: watermarkSize, height: watermarkSize, marginLeft: -watermarkSize / 2, marginTop: -watermarkSize / 2 }]}
        contentFit="contain"
        blurRadius={14}
        pointerEvents="none"
      />

      <View style={styles.top}>
        <Pressable style={styles.circleBtn} onPress={navigation.goBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View style={styles.topTextWrap}>
          <Text style={styles.title}>Nearby</Text>
          <Text style={styles.subtitle}>
            {searchExpanded ? "Search expanded beyond 15 km" : `Within ${NEARBY_RADIUS_KM} km of you`}
          </Text>
        </View>
        <Pressable
          style={styles.circleBtn}
          onPress={() => setSearchToken((v) => v + 1)}
          hitSlop={8}
          disabled={searching}
        >
          <Ionicons name="refresh" size={20} color={theme.colors.text} />
        </Pressable>
      </View>

      <View style={[styles.radarArea, { height: radarSize }]}>
        <View style={[styles.radarCenter, { width: radarSize, height: radarSize }]}>
          {searching ? (
            <>
              <Ring delay={0} size={radarSize * 0.4} />
              <Ring delay={800} size={radarSize * 0.7} />
              <Ring delay={1600} size={radarSize} />
            </>
          ) : (
            TIER_RADIUS_FRACTIONS.map((fraction, tier) => {
              const size = maxRadius * fraction * 2;
              return (
                <Animated.View
                  key={tier}
                  entering={FadeIn.duration(400).delay(tier * 80)}
                  pointerEvents="none"
                  style={[
                    styles.tierLine,
                    { width: size, height: size, borderRadius: size / 2, borderColor: RING_COLORS[tier % RING_COLORS.length] ?? RING_COLORS[0] },
                  ]}
                />
              );
            })
          )}
          {!searching &&
            radarProfiles.map((profile, index) => (
              <FoundAvatar
                key={profile.id}
                profile={profile}
                index={index}
                pos={radarLayout[index]}
                onPress={() => setSelected(profile)}
              />
            ))}
          {!searching && overflowCount > 0 ? (
            <OverflowBubble
              extraCount={overflowCount}
              index={radarProfiles.length}
              pos={radarLayout[radarProfiles.length]}
              onPress={() => setListOpen(true)}
            />
          ) : null}
          <CenterPulse avatarUrl={myAvatarUrl} />
        </View>
      </View>

      <View style={styles.bottom}>
        {searching ? (
          <Animated.Text entering={FadeIn.duration(300)} style={styles.statusText}>
            Searching for people near you…
          </Animated.Text>
        ) : error ? (
          <>
            <Text style={styles.statusText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => setSearchToken((v) => v + 1)}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </>
        ) : profiles.length === 0 ? (
          <>
            <Text style={styles.statusText}>No one within {NEARBY_RADIUS_KM} km right now</Text>
            <Pressable
              style={styles.retryBtn}
              onPress={() => navigation.replace("DiscoveryProfiles", { openFilters: true })}
            >
              <Text style={styles.retryText}>Widen search</Text>
            </Pressable>
          </>
        ) : (
          <Animated.View entering={FadeIn.duration(300)} style={styles.statusRow}>
            <Text style={styles.statusText}>
              {profiles.length} {profiles.length === 1 ? "person" : "people"} found{searchExpanded ? " in a wider search" : " nearby"}
            </Text>
            <Pressable onPress={() => setListOpen(true)} hitSlop={8}>
              <Text style={styles.viewAllText}>View all</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>

      <NearbyListSheet
        visible={listOpen}
        profiles={profiles}
        close={() => setListOpen(false)}
        openProfile={(profile) => {
          setListOpen(false);
          setSelected(profile);
        }}
      />

      {selected ? (
        <ProfileFeedModal
          profile={selected}
          visible
          onClose={() => setSelected(null)}
          onLikeProfile={() => {
            void discoverApi.like(selected.id).catch((e) =>
              Alert.alert("Couldn't send like", e instanceof Error ? e.message : "Please try again."),
            );
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  watermark: {
    position: "absolute",
    top: "50%",
    left: "50%",
    opacity: 0.1,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 58,
    paddingHorizontal: 16,
    gap: 12,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadow,
  },
  topTextWrap: { flex: 1, alignItems: "center" },
  title: { fontFamily: theme.typography.bold, fontSize: 18, color: theme.colors.text },
  subtitle: {
    fontFamily: theme.typography.medium,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  radarArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  radarCenter: { alignItems: "center", justifyContent: "center" },
  ring: {
    position: "absolute",
    borderWidth: 1.5,
  },
  tierLine: {
    position: "absolute",
    borderWidth: 1,
    borderStyle: "dashed",
    opacity: 0.3,
  },
  centerWrap: { alignItems: "center", justifyContent: "center" },
  centerGlow: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255,83,110,.18)",
  },
  centerAvatarRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: "#FF536E",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    ...theme.shadow,
  },
  centerAvatar: { width: 68, height: 68, borderRadius: 34 },
  centerAvatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surfaceMuted },
  foundWrap: {
    position: "absolute",
    alignItems: "center",
    width: 66,
  },
  foundRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    padding: 2.5,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadow,
  },
  foundAvatar: { width: 45, height: 45, borderRadius: 22.5 },
  overflowRing: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: "#FF536E",
  },
  overflowText: { fontFamily: theme.typography.bold, fontSize: 14, color: "#FF536E" },
  verifiedBadge: {
    position: "absolute",
    right: -2,
    bottom: 14,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#4ECDC4",
    borderWidth: 1.5,
    borderColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  foundLabel: { marginTop: 5, alignItems: "center" },
  foundName: { fontFamily: theme.typography.semibold, fontSize: 10.5, color: theme.colors.text },
  bottom: {
    alignItems: "center",
    paddingBottom: 46,
    paddingTop: 8,
    gap: 14,
    minHeight: 110,
  },
  statusText: {
    fontFamily: theme.typography.medium,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  statusRow: { alignItems: "center", gap: 6 },
  viewAllText: {
    fontFamily: theme.typography.bold,
    fontSize: 12,
    color: "#FF536E",
  },
  retryBtn: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: "#FF536E",
  },
  retryText: { fontFamily: theme.typography.bold, fontSize: 13, color: "white" },
  listBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: theme.colors.scrim,
  },
  listSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: "72%",
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    paddingBottom: 12,
    marginBottom: 6,
  },
  listTitle: { fontFamily: theme.typography.bold, fontSize: 18, color: theme.colors.text },
  listClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
  },
  listAvatar: { width: 48, height: 48, borderRadius: 24 },
  listRowText: { flex: 1 },
  listName: { fontFamily: theme.typography.semibold, fontSize: 14, color: theme.colors.text },
  listVerified: { color: "#4ECDC4" },
  listDistance: { fontFamily: theme.typography.regular, fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
});
