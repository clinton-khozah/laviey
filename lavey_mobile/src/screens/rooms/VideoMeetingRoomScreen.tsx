import { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { RTCView } from "react-native-webrtc";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { profileApi } from "../../api/services";
import { theme } from "../../constants/theme";
import { useLocalMedia } from "../../hooks/useLocalMedia";
import { useMeetupWebRTC } from "../../hooks/useMeetupWebRTC";
import { useMeetingChat } from "../../hooks/useMeetingChat";
import { useMeetingReactions, type MeetingReactionType } from "../../hooks/useMeetingReactions";
import { useMeetingGifts, MEETING_GIFT_TYPES, type MeetingGiftEvent, type MeetingGiftType } from "../../hooks/useMeetingGifts";
import type { MeetingChatMessage, MeetingParticipant, UserProfile } from "../../types";
import type { RootStackParamList } from "../../navigation/AppNavigator";

const REACTION_EMOJI: Record<MeetingReactionType, string> = { like: "❤️", live: "🔥", love: "💕" };

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

/** Unifies the local camera and every remote peer into one shape so they render as equal Teams-style tiles. */
interface GridTile {
  id: string;
  name: string;
  avatarUrl: string;
  isHost: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isConnecting: boolean;
  stream: MeetingParticipant["stream"];
  isLocal: boolean;
}

function ParticipantTile({ tile, full }: { tile: GridTile; full: boolean }) {
  const showVideo = tile.stream && !tile.isVideoOff;
  useEffect(() => {
    console.log(
      '[tile]',
      tile.isLocal ? 'local' : tile.id,
      'showVideo:',
      Boolean(showVideo),
      'hasStream:',
      Boolean(tile.stream),
      'streamTracks:',
      tile.stream?.getTracks().map((t) => `${t.kind}:${t.enabled}:${t.readyState}`),
      'isVideoOff:',
      tile.isVideoOff,
    );
  }, [tile.isLocal, tile.id, showVideo, tile.stream, tile.isVideoOff]);
  return (
    <View style={[styles.tile, full && styles.tileFull]}>
      {showVideo ? (
        <RTCView streamURL={tile.stream!.toURL()} style={StyleSheet.absoluteFill} objectFit="cover" mirror={tile.isLocal} zOrder={tile.isLocal ? 1 : 0} />
      ) : tile.avatarUrl ? (
        <Image source={{ uri: tile.avatarUrl }} style={styles.tileAvatarImg} contentFit="cover" />
      ) : (
        <View style={styles.tileAvatarFallback}>
          <Text style={styles.tileAvatarInitial}>{initial(tile.name)}</Text>
        </View>
      )}
      {tile.isConnecting ? (
        <View style={styles.connectingPill}>
          <Text style={styles.connectingText}>Connecting…</Text>
        </View>
      ) : null}
      {tile.isMuted ? (
        <View style={styles.muteBadge}>
          <Ionicons name="mic-off" size={12} color="white" />
        </View>
      ) : null}
    </View>
  );
}

/** One flying particle within a reaction burst cluster. */
function ReactionParticle({ type, index }: { type: MeetingReactionType; index: number }) {
  const rise = useSharedValue(0);
  const dx = useMemo(() => (index - 1) * 24 + (Math.random() - 0.5) * 16, [index]);
  useEffect(() => {
    rise.value = withDelay(index * 80, withTiming(1, { duration: 2000 + index * 200 }));
  }, [rise, index]);
  const animStyle = useAnimatedStyle(() => ({
    opacity: rise.value <= 0 ? 0 : 1 - rise.value,
    transform: [
      { translateY: -rise.value * 190 },
      { translateX: dx + Math.sin(rise.value * 6) * 16 },
      { scale: 0.75 + rise.value * 0.55 },
    ],
  }));
  return (
    <Animated.Text entering={FadeIn} style={[styles.burstEmoji, animStyle]}>
      {REACTION_EMOJI[type]}
    </Animated.Text>
  );
}

/** Twitch/Instagram-Live style: one tap fans out a small cluster of particles instead of a single emoji. */
function ReactionBurstView({ type }: { type: MeetingReactionType }) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <ReactionParticle key={i} type={type} index={i} />
      ))}
    </>
  );
}

/** Twitch-style live chat overlay — floats over the video, no modal needed to read it. */
function LiveChatFeed({ messages, localUserId }: { messages: MeetingChatMessage[]; localUserId: string }) {
  const recent = messages.slice(-5);
  return (
    <View style={styles.liveChatFeed} pointerEvents="none">
      {recent.map((m) => (
        <Animated.View key={m.id} entering={FadeInDown.duration(220)} style={styles.liveChatRow}>
          <Text style={styles.liveChatText} numberOfLines={2}>
            <Text style={[styles.liveChatName, m.fromUserId === localUserId && styles.liveChatNameMine]}>{m.fromName} </Text>
            {m.text}
          </Text>
        </Animated.View>
      ))}
    </View>
  );
}

/** TikTok/Twitch style — a gift gallops across the video with a caption, everyone in the room sees + hears it. */
function GiftRunAnimation({ gift, onDone }: { gift: MeetingGiftEvent; onDone(): void }) {
  const { width } = useWindowDimensions();
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, { duration: 2400 }, (finished) => {
      if (finished) runOnJS(onDone)();
    });
  }, [progress]);
  const runStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -90 + progress.value * (width + 180) },
      { translateY: Math.sin(progress.value * Math.PI * 4) * -8 },
      { scale: 0.85 + Math.sin(progress.value * Math.PI) * 0.35 },
    ],
    opacity: progress.value < 0.9 ? 1 : 1 - (progress.value - 0.9) / 0.1,
  }));
  return (
    <View style={styles.giftRunLayer} pointerEvents="none">
      <Animated.Text style={[styles.giftRunEmoji, runStyle]}>{gift.emoji}</Animated.Text>
      <Animated.View entering={FadeIn} style={styles.giftCaptionWrap}>
        <Text style={styles.giftCaptionText}>
          <Text style={styles.giftCaptionName}>{gift.fromName}</Text> gifted <Text style={styles.giftCaptionName}>{gift.toName}</Text> a {gift.label} {gift.emoji}
        </Text>
      </Animated.View>
    </View>
  );
}

export function VideoMeetingRoomScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, "VideoMeetingRoom">) {
  const { meetup } = route.params;
  const [me, setMe] = useState<UserProfile | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    void profileApi.me().then(setMe).catch(() => undefined);
  }, []);

  const localMedia = useLocalMedia(true);
  const mediaReady = Boolean(localMedia.localStream);
  const localUserId = me?.id ?? "";
  const localDisplayName = me?.displayName ?? "You";
  const localAvatarUrl = me?.avatarUrl ?? "";

  const { participants, status } = useMeetupWebRTC({
    meetupId: meetup.id,
    localUserId,
    localDisplayName,
    localAvatarUrl,
    isHost: Boolean(meetup.isHostedByYou),
    localStream: localMedia.localStream,
    enabled: Boolean(localUserId),
    mediaReady,
  });

  const gridTiles: GridTile[] = useMemo(() => {
    const local: GridTile = {
      id: "local",
      name: localDisplayName,
      avatarUrl: localAvatarUrl,
      isHost: Boolean(meetup.isHostedByYou),
      isMuted: !localMedia.isAudioEnabled,
      isVideoOff: !localMedia.isVideoEnabled,
      isConnecting: false,
      stream: localMedia.localStream,
      isLocal: true,
    };
    const remote: GridTile[] = participants.map((p) => ({
      id: p.id,
      name: p.name,
      avatarUrl: p.avatarUrl,
      isHost: Boolean(p.isHost),
      isMuted: Boolean(p.isMuted),
      isVideoOff: Boolean(p.isVideoOff),
      isConnecting: Boolean(p.isConnecting),
      stream: p.stream,
      isLocal: false,
    }));
    return [local, ...remote];
  }, [localAvatarUrl, localDisplayName, localMedia.isAudioEnabled, localMedia.isVideoEnabled, localMedia.localStream, meetup.isHostedByYou, participants]);

  const { messages, sendMessage } = useMeetingChat({ meetupId: meetup.id, localUserId, localDisplayName, localAvatarUrl });
  const { bursts, sendReaction } = useMeetingReactions({ meetupId: meetup.id, localUserId, localDisplayName });
  const { activeGift, sendGift, dismissActive } = useMeetingGifts({ meetupId: meetup.id, localUserId, localDisplayName });

  const [giftStep, setGiftStep] = useState<"closed" | "recipient" | "gift">("closed");
  const [giftRecipient, setGiftRecipient] = useState<{ id: string; name: string } | null>(null);

  const openGiftFlow = () => {
    if (participants.length === 0) return;
    if (participants.length === 1) {
      setGiftRecipient({ id: participants[0].id, name: participants[0].name });
      setGiftStep("gift");
    } else {
      setGiftStep("recipient");
    }
  };

  const pickRecipient = (p: MeetingParticipant) => {
    setGiftRecipient({ id: p.id, name: p.name });
    setGiftStep("gift");
  };

  const pickGiftType = (type: MeetingGiftType) => {
    if (giftRecipient) sendGift(type, giftRecipient.id, giftRecipient.name);
    setGiftStep("closed");
    setGiftRecipient(null);
  };

  const leave = () => {
    localMedia.stopMedia();
    navigation.goBack();
  };

  const subtitle = useMemo(() => {
    if (status === "unsupported") return "Video link unavailable — try again";
    if (participants.length === 0) return "Waiting for others…";
    return `${participants.length + 1} in the room`;
  }, [status, participants.length]);

  const submitMessage = () => {
    const text = draft.trim();
    if (!text) return;
    if (sendMessage(text)) {
      setDraft("");
    }
  };

  if (localMedia.error) {
    return (
      <View style={styles.errorRoot}>
        <Ionicons name="videocam-off" size={40} color="#F3424B" />
        <Text style={styles.errorTitle}>Camera unavailable</Text>
        <Text style={styles.errorCopy}>{localMedia.error}</Text>
        <Pressable style={styles.errorRetry} onPress={localMedia.retry}>
          <Text style={styles.errorRetryText}>Try again</Text>
        </Pressable>
        <Pressable style={styles.errorLeave} onPress={leave}>
          <Text style={styles.errorLeaveText}>Leave</Text>
        </Pressable>
      </View>
    );
  }

  if (status === "full") {
    return (
      <View style={styles.errorRoot}>
        <Ionicons name="people" size={40} color="#F3424B" />
        <Text style={styles.errorTitle}>This date is full</Text>
        <Text style={styles.errorCopy}>Dates can host up to 10 people at once. Try again once someone leaves.</Text>
        <Pressable style={styles.errorLeave} onPress={leave}>
          <Text style={styles.errorLeaveText}>Leave</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={leave} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color="white" />
        </Pressable>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {meetup.title}
            </Text>
            <View style={styles.liveTag}>
              <Text style={styles.liveTagText}>LIVE</Text>
            </View>
          </View>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>

      <View style={styles.stage}>
        {/* Plain View grid, not FlatList — RTCView is a native SurfaceView on Android, and those
            render black inside virtualized lists because cell recycling breaks the surface's
            window attachment. Our participant count is always small, so virtualization buys us
            nothing anyway. */}
        {gridTiles.length <= 2 ? (
          <View style={styles.gridSolo}>
            {gridTiles.map((tile) => (
              <ParticipantTile key={tile.id} tile={tile} full />
            ))}
          </View>
        ) : (
          <View style={styles.gridWrap}>
            {gridTiles.map((tile) => (
              <ParticipantTile key={tile.id} tile={tile} full={false} />
            ))}
          </View>
        )}

        {participants.length === 0 && status !== "unsupported" ? (
          <View style={styles.waitingBanner} pointerEvents="none">
            <Ionicons name="hourglass-outline" size={13} color="white" />
            <Text style={styles.waitingBannerText}>Waiting for someone to join…</Text>
          </View>
        ) : null}

        <LiveChatFeed messages={messages} localUserId={localUserId} />

        <View style={styles.sideActions}>
          {(["like", "live", "love"] as const).map((type) => (
            <Pressable key={type} style={styles.sideActionBtn} onPress={() => sendReaction(type)}>
              <Text style={styles.sideActionEmoji}>{REACTION_EMOJI[type]}</Text>
            </Pressable>
          ))}
          <Pressable style={[styles.sideActionBtn, participants.length === 0 && styles.controlDisabled]} onPress={openGiftFlow} disabled={participants.length === 0}>
            <Ionicons name="gift" size={19} color="white" />
          </Pressable>
        </View>
      </View>

      <View style={styles.controls}>
        <Pressable style={[styles.control, !localMedia.isAudioEnabled && styles.controlOff]} onPress={localMedia.toggleAudio}>
          <Ionicons name={localMedia.isAudioEnabled ? "mic" : "mic-off"} size={21} color="white" />
        </Pressable>
        <Pressable style={[styles.control, !localMedia.isVideoEnabled && styles.controlOff]} onPress={localMedia.toggleVideo}>
          <Ionicons name={localMedia.isVideoEnabled ? "videocam" : "videocam-off"} size={21} color="white" />
        </Pressable>
        <Pressable style={[styles.control, chatOpen && styles.controlActive]} onPress={() => setChatOpen((v) => !v)}>
          <Ionicons name="chatbubble-ellipses" size={20} color="white" />
        </Pressable>
        <Pressable style={styles.leaveBtn} onPress={leave}>
          <Text style={styles.leaveBtnText}>Leave</Text>
        </Pressable>
      </View>

      <Modal visible={chatOpen} animationType="fade" transparent onRequestClose={() => setChatOpen(false)}>
        <KeyboardAvoidingView style={styles.chatScrim} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={styles.chatScrimTap} onPress={() => setChatOpen(false)} />
          <View style={styles.chatComposer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Message everyone…"
              placeholderTextColor="rgba(255,255,255,.5)"
              style={styles.chatInput}
              onSubmitEditing={submitMessage}
              returnKeyType="send"
              autoFocus
            />
            <Pressable style={styles.chatSend} onPress={submitMessage} disabled={!draft.trim()}>
              <Ionicons name="send" size={17} color="white" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={giftStep !== "closed"} transparent animationType="slide" onRequestClose={() => setGiftStep("closed")}>
        <View style={styles.giftScrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setGiftStep("closed")} />
          <View style={styles.giftSheet}>
            <Pressable style={styles.giftClose} onPress={() => setGiftStep("closed")} hitSlop={8}>
              <Ionicons name="close" size={20} color="white" />
            </Pressable>
            {giftStep === "recipient" ? (
              <>
                <Text style={styles.giftSheetTitle}>Gift who?</Text>
                <View style={styles.giftRecipientGrid}>
                  {participants.map((p) => (
                    <Pressable key={p.id} style={styles.giftRecipientItem} onPress={() => pickRecipient(p)}>
                      {p.avatarUrl ? (
                        <Image source={{ uri: p.avatarUrl }} style={styles.giftRecipientAvatar} />
                      ) : (
                        <View style={[styles.giftRecipientAvatar, styles.tileAvatarFallback]}>
                          <Text style={styles.tileAvatarInitial}>{initial(p.name)}</Text>
                        </View>
                      )}
                      <Text style={styles.giftRecipientName} numberOfLines={1}>
                        {p.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : giftStep === "gift" && giftRecipient ? (
              <>
                <Text style={styles.giftSheetTitle}>Send {giftRecipient.name} a gift</Text>
                <View style={styles.giftTypeGrid}>
                  {MEETING_GIFT_TYPES.map((g) => (
                    <Pressable key={g.id} style={styles.giftTypeItem} onPress={() => pickGiftType(g)}>
                      <Text style={styles.giftTypeEmoji}>{g.emoji}</Text>
                      <Text style={styles.giftTypeLabel}>{g.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <View style={styles.overlayLayer} pointerEvents="none">
        <View style={styles.burstLayer}>
          {bursts.map((burst) => (
            <ReactionBurstView key={burst.id} type={burst.type} />
          ))}
        </View>
        {activeGift ? <GiftRunAnimation gift={activeGift} onDone={dismissActive} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#08080B" },
  header: { paddingTop: 54, paddingHorizontal: 16, paddingBottom: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,.12)", alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flexShrink: 1, color: "white", fontFamily: theme.typography.bold, fontSize: 16 },
  liveTag: { backgroundColor: "#F3424B", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  liveTagText: { color: "white", fontFamily: theme.typography.bold, fontSize: 9, letterSpacing: 0.5 },
  subtitle: { color: "#C9C6CE", fontFamily: theme.typography.regular, fontSize: 11.5, marginTop: 2 },
  stage: { flex: 1, position: "relative" },
  overlayLayer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  gridSolo: { flex: 1, padding: 6, flexDirection: "column" },
  gridWrap: { flex: 1, padding: 6, flexDirection: "row", flexWrap: "wrap", alignContent: "flex-start" },
  tile: {
    width: "47%",
    aspectRatio: 0.8,
    margin: "1.5%",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#18181D",
    alignItems: "center",
    justifyContent: "center",
  },
  tileFull: { flex: 1, width: "100%", aspectRatio: undefined, margin: 6 },
  tileAvatarImg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  tileAvatarFallback: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "#2A2A32" },
  tileAvatarInitial: { color: "white", fontFamily: theme.typography.bold, fontSize: 30 },
  connectingPill: { position: "absolute", top: 10, alignSelf: "center", backgroundColor: "rgba(0,0,0,.55)", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  connectingText: { color: "white", fontFamily: theme.typography.medium, fontSize: 10 },
  muteBadge: { position: "absolute", left: 8, bottom: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(0,0,0,.5)", alignItems: "center", justifyContent: "center" },
  waitingBanner: {
    position: "absolute",
    top: 10,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,.55)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  waitingBannerText: { color: "white", fontFamily: theme.typography.medium, fontSize: 11.5 },
  burstLayer: { position: "absolute", right: 26, bottom: 190, alignItems: "flex-end" },
  burstEmoji: { fontSize: 24, position: "absolute" },
  sideActions: { position: "absolute", right: 14, bottom: 14, gap: 10 },
  sideActionBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,.14)", alignItems: "center", justifyContent: "center" },
  sideActionEmoji: { fontSize: 17, textAlign: "center" },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 14, paddingVertical: 16, paddingBottom: 30 },
  control: { width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(255,255,255,.14)", alignItems: "center", justifyContent: "center" },
  controlOff: { backgroundColor: "#F3424B" },
  leaveBtn: { paddingHorizontal: 20, height: 48, borderRadius: 24, backgroundColor: "#F3424B", alignItems: "center", justifyContent: "center" },
  leaveBtnText: { color: "white", fontFamily: theme.typography.bold, fontSize: 14 },
  controlDisabled: { opacity: 0.35 },
  giftRunLayer: { position: "absolute", top: 90, left: 0, right: 0, alignItems: "center" },
  giftRunEmoji: { fontSize: 44, position: "absolute" },
  giftCaptionWrap: {
    marginTop: 64,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,.55)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: "88%",
  },
  giftCaptionText: { color: "white", fontFamily: theme.typography.medium, fontSize: 12.5, textAlign: "center" },
  giftCaptionName: { fontFamily: theme.typography.bold, color: "#FDE68A" },
  giftScrim: { flex: 1, backgroundColor: "rgba(0,0,0,.5)", justifyContent: "flex-end" },
  giftSheet: { backgroundColor: "#17171D", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
  giftClose: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,.14)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  giftSheetTitle: { color: "white", fontFamily: theme.typography.bold, fontSize: 16, marginBottom: 16, textAlign: "center" },
  giftRecipientGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16, justifyContent: "center" },
  giftRecipientItem: { alignItems: "center", width: 70, gap: 6 },
  giftRecipientAvatar: { width: 56, height: 56, borderRadius: 28 },
  giftRecipientName: { color: "white", fontFamily: theme.typography.semibold, fontSize: 11.5 },
  giftTypeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14, justifyContent: "center" },
  giftTypeItem: { alignItems: "center", width: 74, gap: 5, backgroundColor: "rgba(255,255,255,.08)", borderRadius: 16, paddingVertical: 14 },
  giftTypeEmoji: { fontSize: 30 },
  giftTypeLabel: { color: "white", fontFamily: theme.typography.semibold, fontSize: 11 },
  errorRoot: { flex: 1, backgroundColor: "#08080B", alignItems: "center", justifyContent: "center", padding: 30, gap: 8 },
  errorTitle: { color: "white", fontFamily: theme.typography.bold, fontSize: 17, marginTop: 6 },
  errorCopy: { color: "#C9C6CE", fontFamily: theme.typography.regular, fontSize: 13, textAlign: "center" },
  errorRetry: { marginTop: 14, backgroundColor: "white", borderRadius: 24, paddingHorizontal: 22, paddingVertical: 12 },
  errorRetryText: { fontFamily: theme.typography.bold, fontSize: 13.5, color: theme.colors.text },
  errorLeave: { marginTop: 10, paddingHorizontal: 22, paddingVertical: 10 },
  errorLeaveText: { color: "#C9C6CE", fontFamily: theme.typography.semibold, fontSize: 13 },
  liveChatFeed: { position: "absolute", left: 10, right: 100, bottom: 6, gap: 6 },
  liveChatRow: { alignSelf: "flex-start", maxWidth: "100%", backgroundColor: "rgba(0,0,0,.4)", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 },
  liveChatText: { color: "white", fontFamily: theme.typography.regular, fontSize: 12.5, lineHeight: 16 },
  liveChatName: { fontFamily: theme.typography.bold, color: "#7DD3FC" },
  liveChatNameMine: { color: "#FDE68A" },
  controlActive: { backgroundColor: theme.colors.primary },
  chatScrim: { flex: 1, backgroundColor: "rgba(0,0,0,.32)", justifyContent: "flex-end" },
  chatScrimTap: { flex: 1 },
  chatComposer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    paddingBottom: 26,
    backgroundColor: "rgba(20,20,26,.92)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  chatInput: { flex: 1, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,.12)", paddingHorizontal: 15, fontFamily: theme.typography.regular, fontSize: 13.5, color: "white" },
  chatSend: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
});
