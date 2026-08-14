import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeOut, LinearTransition, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { matchApi, roomApi } from "../../api/services";
import { LoadingIndicator } from "../../components/common/LoadingIndicator";
import type { MainTabParamList } from "../../components/navigation/BottomTabNavigator";
import { theme } from "../../constants/theme";
import { useAppData } from "../../context/AppDataContext";
import { useLiveMeetupPresence } from "../../hooks/useLiveMeetupPresence";
import type { MatchListItem, OnlineDate } from "../../types";
import { LiveMeetupsStrip } from "./components/LiveMeetupsStrip";
import { MeetupCommentsSheet } from "./components/MeetupCommentsSheet";
import { MeetupOptionsSheet } from "./components/MeetupOptionsSheet";
import { BackToForYouButton } from "../../components/navigation/BackToForYouButton";

const DARK = "#101018";
const DATE_WATERMARK = require("../../../assets/date.png");

const COVER_THEMES = [
  ["#1A1824", "#2E2A38"],
  ["#15202B", "#243447"],
  ["#1F1A24", "#3A2E3D"],
  ["#141820", "#2A3344"],
  ["#1C1820", "#322938"],
] as const;

/** Deterministic so a given meetup always renders the same cover gradient. */
function coverThemeFor(id: string): readonly [string, string] {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return COVER_THEMES[hash % COVER_THEMES.length];
}

function whenLabel(item: OnlineDate, actuallyLive: boolean): string {
  if (actuallyLive) return "Live now";
  if (item.scheduledLabel) return item.scheduledLabel;
  if (item.status === "starting-soon" && item.startsInMinutes != null) return `Starts in ${item.startsInMinutes}m`;
  if (item.startsInMinutes != null) return `In ${item.startsInMinutes}m`;
  if (item.status === "live") return "Starting soon";
  return "Scheduled";
}

const START_PRESETS = [
  { minutes: 15, label: "In 15 min" },
  { minutes: 60, label: "In 1 hour" },
  { minutes: 240, label: "Later today" },
  { minutes: 60 * 24, label: "Tomorrow" },
] as const;
type MeetupFilter = "all" | "live" | "upcoming" | "ended";

const FILTER_OPTIONS: { id: MeetupFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "upcoming", label: "Upcoming" },
  { id: "ended", label: "Ended" },
];

export function DiscoverScreen({ navigation }: BottomTabScreenProps<MainTabParamList, "Discover">) {
  const { width, height } = useWindowDimensions();
  const watermarkSide = Math.min(width, height) * 0.82;
  const { dates, datesLoading, refreshDates, setDates } = useAppData();
  const [refreshing, setRefreshing] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [optionsFor, setOptionsFor] = useState<OnlineDate | null>(null);
  const [filter, setFilter] = useState<MeetupFilter>("all");
  const liveMeetupIds = useLiveMeetupPresence(useMemo(() => dates.map((d) => d.id), [dates]));
  const statusCounts = useMemo(() => {
    const live = dates.filter((date) => liveMeetupIds.has(date.id) || date.status === "live").length;
    const ended = dates.filter((date) => date.status === "ended" || date.status === "expired").length;
    return { all: dates.length, live, upcoming: Math.max(0, dates.length - live - ended), ended };
  }, [dates, liveMeetupIds]);
  const shownDates = useMemo(() => dates.filter((date) => {
    const live = liveMeetupIds.has(date.id) || date.status === "live";
    const ended = date.status === "ended" || date.status === "expired";
    if (filter === "live") return live;
    if (filter === "upcoming") return !live && !ended;
    if (filter === "ended") return ended;
    return true;
  }), [dates, filter, liveMeetupIds]);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshDates(true);
    } catch (e) {
      if (!dates.length) {
        Alert.alert("Could not load dates", e instanceof Error ? e.message : "Please try again.");
      }
    } finally {
      setRefreshing(false);
    }
  }, [refreshDates, dates.length]);

  const initialLoading = !dates.length && (datesLoading || refreshing);

  const joinMeetup = useCallback(
    async (item: OnlineDate) => {
      try {
        await roomApi.join(item.id, item.accessCode);
        navigation.getParent()?.navigate("VideoMeetingRoom", { meetup: item });
      } catch (e) {
        Alert.alert("Could not join", e instanceof Error ? e.message : "Please try again.");
      }
    },
    [navigation],
  );

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <View pointerEvents="none" style={styles.watermarkWrap}>
          <Image source={DATE_WATERMARK} style={[styles.watermarkHero, { width: watermarkSide, height: watermarkSide }]} contentFit="contain" />
        </View>
        <LoadingIndicator fullScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View pointerEvents="none" style={styles.watermarkWrap}>
        <Image source={DATE_WATERMARK} style={[styles.watermarkHero, { width: watermarkSide, height: watermarkSide }]} contentFit="contain" />
      </View>
      <View style={styles.pageContent}>
      <View style={styles.header}>
        <BackToForYouButton variant="light" />
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Dates</Text>
          <Text style={styles.subtitle}>Video dates with your matches</Text>
        </View>
        <Pressable style={styles.createBtn} onPress={() => setSheet(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Create date">
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </Pressable>
      </View>
      <View style={styles.filterBar}>
        {FILTER_OPTIONS.map(({ id, label }) => {
          const active = filter === id;
          const count = id === "all" ? statusCounts.all : id === "live" ? statusCounts.live : id === "upcoming" ? statusCounts.upcoming : statusCounts.ended;
          return (
            <Pressable key={id} onPress={() => setFilter(id)} style={[styles.filterTab, active && styles.filterTabActive]}>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
              {count > 0 ? (
                <View style={[styles.filterCount, active && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>{count}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <LiveMeetupsStrip dates={dates} liveMeetupIds={liveMeetupIds} onSelect={(date) => void joinMeetup(date)} />
      <FlatList
          style={styles.listScroller}
          data={shownDates}
          keyExtractor={(x) => x.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={theme.colors.coral} />}
          contentContainerStyle={[styles.list, !dates.length && styles.listEmpty]}
          renderItem={({ item }) => (
            <MeetupCard
              item={item}
              live={liveMeetupIds.has(item.id)}
              onJoin={() => void joinMeetup(item)}
              onOptions={() => setOptionsFor(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>
                {filter === "all" ? "No dates scheduled" : `No ${filter} dates`}
              </Text>
              <Text style={styles.emptyCopy}>
                Tap the + button above to go live or schedule a date.
              </Text>
            </View>
          }
        />
      </View>
      <ScheduleSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        onCreated={(date) => {
          setDates((old) => [date, ...old]);
          setSheet(false);
        }}
      />
      <MeetupOptionsSheet
        visible={Boolean(optionsFor)}
        meetup={optionsFor}
        onClose={() => setOptionsFor(null)}
        onDeleted={(id) => setDates((old) => old.filter((d) => d.id !== id))}
        onUpdated={(updated) => setDates((old) => old.map((d) => (d.id === updated.id ? updated : d)))}
      />
    </SafeAreaView>
  );
}

function LivePulseDot() {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(withSequence(withTiming(0.75, { duration: 600 }), withTiming(1, { duration: 600 })), -1, true);
  }, [scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[styles.liveDot, style]} />;
}

function MeetupCard({
  item,
  live,
  onJoin,
  onOptions,
}: {
  item: OnlineDate;
  live: boolean;
  onJoin(): void;
  onOptions(): void;
}) {
  const [start, end] = useMemo(() => coverThemeFor(item.id), [item.id]);
  const isLive = live;
  const isPrivate = item.visibility === "private";
  const [liked, setLiked] = useState(Boolean(item.liked));
  const [likeCount, setLikeCount] = useState(item.likeCount ?? 0);
  const [liking, setLiking] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const refreshCommentCount = useCallback(() => {
    void roomApi.comments(item.id).then((list) => setCommentCount(list.length)).catch(() => undefined);
  }, [item.id]);
  useEffect(() => {
    refreshCommentCount();
  }, [refreshCommentCount]);

  const toggleLike = async () => {
    if (liking) return;
    setLiking(true);
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((v) => v + (nextLiked ? 1 : -1));
    try {
      const result = await roomApi.like(item.id, nextLiked);
      setLiked(result.userLiked);
      setLikeCount(result.likeCount);
    } catch {
      setLiked(!nextLiked);
      setLikeCount((v) => v - (nextLiked ? 1 : -1));
    } finally {
      setLiking(false);
    }
  };

  const showHostAsCover = !item.coverImage && Boolean(item.hostAvatar);

  return (
    <View style={styles.card}>
      <View style={styles.coverWrap}>
        {item.coverImage ? (
          <Image source={{ uri: item.coverImage }} style={styles.cover} contentFit="cover" />
        ) : showHostAsCover ? (
          <Image source={{ uri: item.hostAvatar }} style={styles.cover} contentFit="cover" />
        ) : (
          <LinearGradient colors={[start, end]} style={styles.cover}>
            <Ionicons name="videocam-outline" size={26} color="rgba(255,255,255,.55)" />
          </LinearGradient>
        )}
        <View style={styles.coverTop}>
          {isLive ? (
            <View style={styles.livePill}>
              <LivePulseDot />
              <Text style={styles.livePillText}>LIVE</Text>
            </View>
          ) : (
            <View style={styles.statusPill}>
              <Ionicons name="time-outline" size={10} color="white" />
              <Text style={styles.statusPillText}>{whenLabel(item, isLive)}</Text>
            </View>
          )}
          <View style={styles.coverTopEnd}>
            <View style={styles.visBadge}>
              <Ionicons name={isPrivate ? "lock-closed" : "globe-outline"} size={11} color="white" />
            </View>
            <Pressable style={styles.menuBtn} onPress={onOptions} hitSlop={6}>
              <Ionicons name="ellipsis-vertical" size={13} color="white" />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.hostRow}>
          {item.hostAvatar ? (
            <Image source={{ uri: item.hostAvatar }} style={styles.hostAvatar} />
          ) : (
            <View style={[styles.hostAvatar, styles.hostAvatarFallback]}>
              <Text style={styles.hostAvatarInitial}>{item.hostName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.hostName} numberOfLines={1}>
            {item.hostName}
          </Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2} ellipsizeMode="tail">
          {item.title}
        </Text>

        <View style={styles.actionsRow}>
          <Pressable style={styles.actionBtn} onPress={() => void toggleLike()}>
            <Ionicons name={liked ? "heart" : "heart-outline"} size={16} color={liked ? theme.colors.coral : "#9A949F"} />
            {likeCount > 0 ? <Text style={[styles.actionText, liked && styles.actionTextActive]}>{likeCount}</Text> : null}
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => setCommentsOpen(true)}>
            <Ionicons name="chatbubble-outline" size={15} color="#9A949F" />
            {commentCount > 0 ? <Text style={styles.actionText}>{commentCount}</Text> : null}
          </Pressable>
          <Pressable style={styles.joinBtnWrap} onPress={onJoin}>
            <View style={[styles.joinBtn, isLive && styles.joinBtnLive]}>
              <Text style={styles.joinText}>{isLive ? "Join now" : "Join"}</Text>
            </View>
          </Pressable>
        </View>
      </View>

      <MeetupCommentsSheet
        visible={commentsOpen}
        meetupId={item.id}
        onClose={() => {
          setCommentsOpen(false);
          refreshCommentCount();
        }}
      />
    </View>
  );
}

function ScheduleSheet({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose(): void;
  onCreated(date: OnlineDate): void;
}) {
  const [caption, setCaption] = useState("");
  const [isPublic, setPublic] = useState(true);
  const [minutes, setMinutes] = useState<number>(START_PRESETS[0].minutes);
  const [matches, setMatches] = useState<MatchListItem[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [inviteeId, setInviteeId] = useState<string | null>(null);
  const [busy, setBusy] = useState<"live" | "schedule" | null>(null);

  useEffect(() => {
    if (!visible) {
      setCaption("");
      setPublic(true);
      setMinutes(START_PRESETS[0].minutes);
      setInviteeId(null);
      return;
    }
    setLoadingMatches(true);
    void matchApi
      .list()
      .then(setMatches)
      .catch(() => setMatches([]))
      .finally(() => setLoadingMatches(false));
  }, [visible]);

  const invitee = matches.find((m) => m.userId === inviteeId) ?? null;
  const scheduledAt = useMemo(
    () =>
      new Date(Date.now() + minutes * 60000).toLocaleString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [minutes],
  );

  const submit = async (kind: "live" | "schedule") => {
    const text = caption.trim();
    if (!text) return Alert.alert("Say something", "Add a short title for your date.");
    if (!isPublic && !invitee) {
      return Alert.alert("Choose a match", "Private dates need someone invited — pick a match below.");
    }
    setBusy(kind);
    try {
      const startsAt = new Date(Date.now() + (kind === "live" ? 1 : minutes) * 60000).toISOString();
      const created = await roomApi.create({
        title: text.slice(0, 48),
        topic: text.slice(0, 240),
        visibility: isPublic ? "public" : "private",
        mode: isPublic ? "post" : "invite",
        startsAt,
        ...(isPublic ? {} : { inviteToProfileId: invitee!.userId as string, inviteToName: invitee!.name }),
      });
      onCreated(created);
    } catch (e) {
      Alert.alert("Could not create date", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.keyboardFill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={styles.scrim} onPress={onClose}>
          <Pressable style={styles.sheetTouchable} onPress={() => undefined}>
            <SafeAreaView style={styles.sheet} edges={["bottom"]}>
              <View style={styles.sheetContent}>
              <View style={styles.sheetHandle} />
              <View pointerEvents="none" style={styles.sheetArtWrap}>
                <Image source={DATE_WATERMARK} style={styles.sheetArt} contentFit="contain" />
              </View>
              <View style={styles.sheetHeader}>
                <View style={styles.sheetHeaderMain}>
                  <View style={styles.sheetHeaderCopy}>
                    <Text style={styles.sheetHeaderTitle}>Create a date</Text>
                    <Text style={styles.sheetHeaderSub}>Go live now or pick a time.</Text>
                  </View>
                </View>
                <Pressable style={styles.sheetHeaderClose} onPress={onClose} hitSlop={8}>
                  <Ionicons name="close" size={18} color="#8C8798" />
                </Pressable>
              </View>

              <ScrollView
                style={styles.sheetScroll}
                contentContainerStyle={styles.sheetBody}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.sheetLabel}>Give it a title</Text>
                <TextInput
                  value={caption}
                  onChangeText={setCaption}
                  placeholder="Coffee chat, movie night, first proper date…"
                  placeholderTextColor="#A09AA5"
                  multiline
                  style={styles.input}
                  maxLength={240}
                />
                <Text style={styles.inputCount}>{caption.length}/240</Text>

                <Text style={styles.sheetLabel}>Quick start</Text>
                <Pressable
                  onPress={() => void submit("live")}
                  disabled={busy !== null}
                  style={({ pressed }) => [styles.goLiveBtn, pressed && styles.pressed, busy !== null && styles.disabled]}
                >
                  <View style={styles.goLiveIconWrap}>
                    {busy === "live" ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <View style={styles.goLiveDot} />
                    )}
                  </View>
                  <View style={styles.goLiveCopy}>
                    <Text style={styles.goLiveTitle}>{busy === "live" ? "Starting…" : "Start now"}</Text>
                    <Text style={styles.goLiveHint}>Live in under a minute — no scheduling needed</Text>
                  </View>
                  <Ionicons name="arrow-forward-circle" size={26} color={theme.colors.coral} />
                </Pressable>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or plan ahead</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Text style={styles.sheetLabel}>Who can join</Text>
                <View style={styles.visChoices}>
                  <Pressable
                    style={[styles.visChoice, isPublic && styles.visChoiceActive]}
                    onPress={() => setPublic(true)}
                  >
                    <Ionicons name="globe-outline" size={16} color={isPublic ? "#FFFFFF" : DARK} />
                    <Text style={[styles.visChoiceText, isPublic && styles.visChoiceTextActive]}>Public</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.visChoice, !isPublic && styles.visChoiceActive]}
                    onPress={() => setPublic(false)}
                  >
                    <Ionicons name="lock-closed-outline" size={16} color={!isPublic ? "#FFFFFF" : DARK} />
                    <Text style={[styles.visChoiceText, !isPublic && styles.visChoiceTextActive]}>Private</Text>
                  </Pressable>
                </View>
                <Text style={styles.visHint}>
                  {isPublic ? "Anyone on Lavey can discover and join." : "Only the match you invite can join."}
                </Text>

                {!isPublic ? (
                  <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} layout={LinearTransition.duration(200)}>
                    <Text style={styles.sheetLabel}>Invite a match</Text>
                    {loadingMatches ? (
                      <ActivityIndicator style={styles.matchesLoading} color={DARK} />
                    ) : matches.length === 0 ? (
                      <View style={styles.matchesEmpty}>
                        <Ionicons name="heart-outline" size={18} color="#8C8798" />
                        <Text style={styles.matchesEmptyText}>
                          Match with someone on For You first — private dates are invite-only.
                        </Text>
                      </View>
                    ) : (
                      <ScrollView style={styles.matchList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                        {matches.map((m) => {
                          const selected = m.userId === inviteeId;
                          return (
                            <Pressable
                              key={m.id}
                              style={[styles.matchRow, selected && styles.matchRowOn]}
                              onPress={() => setInviteeId(m.userId ?? null)}
                            >
                              {m.avatar ? (
                                <Image source={{ uri: m.avatar }} style={styles.matchAvatar} />
                              ) : (
                                <View style={[styles.matchAvatar, styles.matchAvatarFallback]}>
                                  <Text style={styles.matchAvatarInitial}>{m.name.charAt(0).toUpperCase()}</Text>
                                </View>
                              )}
                              <Text style={styles.matchName} numberOfLines={1}>
                                {m.name}
                              </Text>
                              {selected ? (
                                <View style={styles.matchCheck}>
                                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                                </View>
                              ) : null}
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    )}
                  </Animated.View>
                ) : null}

                <Animated.View layout={LinearTransition.duration(200)}>
                  <Text style={styles.sheetLabel}>When</Text>
                  <View style={styles.pills}>
                    {START_PRESETS.map((p) => {
                      const active = minutes === p.minutes;
                      return (
                        <Pressable key={p.minutes} onPress={() => setMinutes(p.minutes)}>
                          <View style={[styles.pill, active && styles.pillActive]}>
                            <Text style={[styles.pillText, active && styles.pillTextActive]}>{p.label}</Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={styles.dateBox}>
                    <View style={styles.dateBoxIcon}>
                      <Ionicons name="calendar" size={16} color={DARK} />
                    </View>
                    <View style={styles.dateBoxCopy}>
                      <Text style={styles.dateBoxLabel}>Scheduled for</Text>
                      <Text style={styles.dateBoxText}>{scheduledAt}</Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => void submit("schedule")}
                    disabled={busy !== null}
                    style={({ pressed }) => [styles.submit, pressed && styles.pressed, busy !== null && styles.disabled]}
                  >
                    {busy === "schedule" ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name={isPublic ? "calendar-outline" : "paper-plane-outline"} size={18} color="#FFFFFF" />
                        <Text style={styles.submitText}>{isPublic ? "Schedule date" : "Send invite"}</Text>
                      </>
                    )}
                  </Pressable>
                </Animated.View>
              </ScrollView>
              </View>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F8FC" },
  watermarkWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    zIndex: 0,
  },
  watermarkHero: {
    opacity: 0.32,
  },
  pageContent: {
    flex: 1,
    zIndex: 1,
  },
  listScroller: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    minHeight: 68,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  headerCopy: { flex: 1, paddingRight: 4 },
  title: { fontFamily: theme.typography.bold, fontSize: 27, color: DARK, letterSpacing: -0.4 },
  subtitle: { fontFamily: theme.typography.regular, fontSize: 13, color: "#8C8798", marginTop: 2 },
  createBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: DARK,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#101018",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  filterBar: {
    alignSelf: "center",
    flexDirection: "row",
    backgroundColor: "#ECEBF0",
    padding: 3,
    borderRadius: 21,
    marginHorizontal: 20,
    marginBottom: 14,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 17,
  },
  filterTabActive: { backgroundColor: "#FFFFFF" },
  filterText: { fontFamily: theme.typography.medium, fontSize: 11, color: "#625D66" },
  filterTextActive: { fontFamily: theme.typography.semibold, color: DARK },
  filterCount: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DEDCE3",
  },
  filterCountActive: { backgroundColor: DARK },
  filterCountText: { fontFamily: theme.typography.bold, fontSize: 9, color: "#625D66" },
  filterCountTextActive: { color: "#FFFFFF" },
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 90, gap: 12 },
  listEmpty: { flex: 1 },
  row: { gap: 12 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingBottom: 48 },
  emptyTitle: { fontFamily: theme.typography.semibold, fontSize: 16, color: DARK, textAlign: "center" },
  emptyCopy: {
    marginTop: 8,
    textAlign: "center",
    fontFamily: theme.typography.regular,
    fontSize: 13,
    color: "#8C8798",
    lineHeight: 19,
    maxWidth: 260,
  },
  card: {
    flex: 1,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E8E6EB",
    shadowColor: "#171720",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  coverWrap: { aspectRatio: 4 / 3.2, backgroundColor: "#EFEDF2" },
  cover: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  coverTop: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: "rgba(229,57,53,.94)",
  },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "white" },
  livePillText: { color: "white", fontFamily: theme.typography.bold, fontSize: 9, letterSpacing: 0.5 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: "rgba(16,16,24,.72)",
  },
  statusPillText: { color: "white", fontFamily: theme.typography.semibold, fontSize: 9 },
  coverTopEnd: { flexDirection: "row", alignItems: "center", gap: 5 },
  visBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(16,16,24,.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(16,16,24,.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { padding: 11 },
  hostRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  hostAvatar: { width: 20, height: 20, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: "#EDEBEF" },
  hostAvatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: DARK },
  hostAvatarInitial: { color: "white", fontFamily: theme.typography.bold, fontSize: 8 },
  hostName: { flex: 1, color: "#8C8798", fontFamily: theme.typography.medium, fontSize: 10.5 },
  cardTitle: { marginTop: 5, fontFamily: theme.typography.semibold, fontSize: 13, color: DARK, lineHeight: 17 },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 10 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 4, paddingRight: 8 },
  actionText: { fontFamily: theme.typography.semibold, fontSize: 10.5, color: "#9A949F" },
  actionTextActive: { color: theme.colors.coral },
  joinBtnWrap: { marginLeft: "auto", borderRadius: 10, overflow: "hidden" },
  joinBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: DARK,
    borderRadius: 10,
  },
  joinBtnLive: { backgroundColor: theme.colors.coral },
  joinText: { fontFamily: theme.typography.semibold, fontSize: 10, color: "white" },
  keyboardFill: { flex: 1 },
  scrim: { flex: 1, backgroundColor: "rgba(16,16,24,.48)", justifyContent: "flex-end" },
  sheetTouchable: { width: "100%", maxHeight: "92%" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    maxHeight: "100%",
    position: "relative",
  },
  sheetContent: {
    zIndex: 1,
  },
  sheetArtWrap: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 4,
  },
  sheetArt: {
    width: "100%",
    height: 148,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E0E4",
    marginTop: 10,
    marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ECEAEE",
    backgroundColor: "transparent",
  },
  sheetHeaderMain: {
    flex: 1,
    paddingRight: 12,
  },
  sheetHeaderCopy: { flex: 1 },
  sheetHeaderTitle: {
    fontFamily: theme.typography.bold,
    fontSize: 20,
    color: DARK,
    letterSpacing: -0.3,
  },
  sheetHeaderSub: {
    marginTop: 2,
    fontFamily: theme.typography.regular,
    fontSize: 13,
    color: "#8C8798",
  },
  sheetHeaderClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F2F4",
  },
  sheetScroll: { flexGrow: 0, backgroundColor: "transparent" },
  sheetBody: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, gap: 4, backgroundColor: "transparent" },
  sheetLabel: {
    marginTop: 10,
    marginBottom: 8,
    fontFamily: theme.typography.semibold,
    fontSize: 12,
    color: "#8C8798",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  input: {
    minHeight: 72,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E4E0E6",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: "top",
    fontFamily: theme.typography.medium,
    fontSize: 15,
    color: DARK,
    backgroundColor: "#FAFAFC",
  },
  inputCount: {
    alignSelf: "flex-end",
    marginTop: 4,
    fontFamily: theme.typography.regular,
    fontSize: 11,
    color: "#B0ACB8",
  },
  goLiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFF5F6",
    borderWidth: 1,
    borderColor: "#FFD6DC",
  },
  goLiveIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.coral,
    alignItems: "center",
    justifyContent: "center",
  },
  goLiveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFFFFF" },
  goLiveCopy: { flex: 1 },
  goLiveTitle: { fontFamily: theme.typography.bold, fontSize: 15, color: DARK },
  goLiveHint: { fontFamily: theme.typography.regular, fontSize: 12, color: "#8C8798", marginTop: 2 },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.6 },
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 14 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: "#E8E4EA" },
  dividerText: { fontFamily: theme.typography.medium, fontSize: 11, color: "#A09AA5", letterSpacing: 0.2 },
  visChoices: {
    flexDirection: "row",
    gap: 10,
  },
  visChoice: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E4E0E6",
    backgroundColor: "#FAFAFC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  visChoiceActive: {
    backgroundColor: DARK,
    borderColor: DARK,
  },
  visChoiceText: {
    fontFamily: theme.typography.semibold,
    fontSize: 13,
    color: DARK,
  },
  visChoiceTextActive: { color: "#FFFFFF" },
  visHint: {
    marginTop: 8,
    fontFamily: theme.typography.regular,
    fontSize: 12,
    color: "#8C8798",
    lineHeight: 17,
  },
  matchesLoading: { marginVertical: 10 },
  matchesEmpty: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#FAFAFC",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E4E0E6",
  },
  matchesEmptyText: {
    flex: 1,
    fontFamily: theme.typography.regular,
    fontSize: 12,
    color: "#8C8798",
    lineHeight: 17,
  },
  matchList: { maxHeight: 132 },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 14,
    backgroundColor: "#FAFAFC",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E4E0E6",
    marginBottom: 6,
  },
  matchRowOn: { borderColor: DARK, backgroundColor: "#F3F2F4" },
  matchAvatar: { width: 32, height: 32, borderRadius: 16 },
  matchAvatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: DARK },
  matchAvatarInitial: { color: "#FFFFFF", fontFamily: theme.typography.bold, fontSize: 12 },
  matchName: { flex: 1, fontFamily: theme.typography.semibold, fontSize: 13, color: DARK },
  matchCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DARK,
  },
  pills: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E4E0E6",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#FAFAFC",
  },
  pillActive: { backgroundColor: DARK, borderColor: DARK },
  pillText: { fontFamily: theme.typography.semibold, fontSize: 12, color: "#5B5660" },
  pillTextActive: { color: "#FFFFFF" },
  dateBox: {
    marginTop: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E4E0E6",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FAFAFC",
  },
  dateBoxIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E4E0E6",
    alignItems: "center",
    justifyContent: "center",
  },
  dateBoxCopy: { flex: 1 },
  dateBoxLabel: {
    fontFamily: theme.typography.medium,
    fontSize: 10,
    color: "#8C8798",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  dateBoxText: {
    marginTop: 2,
    fontFamily: theme.typography.semibold,
    fontSize: 14,
    color: DARK,
  },
  submit: {
    height: 52,
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: DARK,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitText: { color: "#FFFFFF", fontFamily: theme.typography.bold, fontSize: 15 },
});
