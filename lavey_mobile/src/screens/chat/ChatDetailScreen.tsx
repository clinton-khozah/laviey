import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import {
  AudioModule,
  RecordingPresets,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { chatApi, discoverApi, matchApi } from "../../api/services";
import { LoadingIndicator } from "../../components/common/LoadingIndicator";
import { theme } from "../../constants/theme";
import type { ChatAssistResult, ChatMessage, Conversation, Profile } from "../../types";
import { ProfileFeedModal } from "../home/components/ProfileFeedModal";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import { navigateToForYou } from "../../utils/navigateToForYou";

function conversationPreviewProfile(conversation: Conversation): Profile {
  return {
    id: conversation.participantProfileId,
    name: conversation.participantName,
    avatar: conversation.participantAvatar,
    age: 0,
    bio: "",
    distance: "",
    verified: false,
    vibeScore: conversation.vibeScore ?? 0,
    interests: [],
    posts: [],
    isOnline: conversation.isOnline,
    isAiCompanion: conversation.isAiCompanion,
    aiDisclosureLabel: conversation.aiDisclosureLabel,
  };
}

export function ChatDetailScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, "ChatDetail">) {
  const { conversationId, conversation } = route.params;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [assist, setAssist] = useState(false);
  const [ai, setAi] = useState<ChatAssistResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [reply, setReply] = useState<ChatMessage | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [requestBusy, setRequestBusy] = useState(false);
  const [previewProfile, setPreviewProfile] = useState<Profile | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const insets = useSafeAreaInsets();
  const composerBottomPad = Math.max(insets.bottom, Platform.OS === "android" ? 10 : 8);
  const incomingRequest = conversation?.conversationKind === "i_crush_incoming" || conversation?.conversationKind === "chat_request_incoming";
  const outgoingRequest = conversation?.conversationKind === "i_crush_outgoing" || conversation?.conversationKind === "chat_request_outgoing";
  // Defensive fallback: conversationId itself encodes a pending request ("icrush-<inviteId>")
  // even if a caller forgot to pass the matching conversation.conversationKind — without this,
  // load()/send() below would try to query this synthetic id as a real conversation uuid.
  const pendingRequest = incomingRequest || outgoingRequest || conversationId.startsWith("icrush-");
  const crushRequest = conversation?.conversationKind === "i_crush_incoming" || conversation?.conversationKind === "i_crush_outgoing";
  const respondToRequest = async (accept: boolean) => {
    if (!conversation?.iCrushInviteId || requestBusy) return;
    setRequestBusy(true);
    try {
      if (accept) {
        const result = await matchApi.acceptCrush(conversation.iCrushInviteId);
        navigation.replace("ChatDetail", { conversationId: result.conversationId, conversation: { ...conversation, id: result.conversationId, conversationKind: "match" } });
      } else {
        await matchApi.rejectCrush(conversation.iCrushInviteId);
        navigation.goBack();
      }
    } catch (e) {
      Alert.alert("Could not respond", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setRequestBusy(false);
    }
  };
  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        setMessages(await chatApi.messages(conversationId));
        await chatApi.read(conversationId);
      } catch (e) {
        if (!silent)
          Alert.alert(
            "Could not load chat",
            e instanceof Error ? e.message : "Please try again.",
          );
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [conversationId],
  );
  useEffect(() => {
    // A pending crush/chat request has no real conversation yet — conversationId is a
    // synthetic "icrush-<inviteId>" placeholder, not a row the messages API can look up.
    if (pendingRequest) {
      setLoading(false);
      return;
    }
    void load();
    const poll = setInterval(() => void load(true), 4000);
    return () => clearInterval(poll);
  }, [load, pendingRequest]);
  const changeText = (v: string) => {
    setText(v);
    void chatApi
      .typing(conversationId, Boolean(v.trim()))
      .catch(() => undefined);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => void chatApi.typing(conversationId, false),
      2200,
    );
  };
  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setText("");
    setSending(true);
    try {
      const result = await chatApi.send(conversationId, body);
      setMessages((old) => [...old, result]);
      setReply(null);
    } catch (e) {
      setText(body);
      Alert.alert(
        "Message not sent",
        e instanceof Error ? e.message : "Please try again.",
      );
    } finally {
      setSending(false);
    }
  };
  const sendPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.82,
    });
    if (result.canceled) return;
    setSending(true);
    try {
      const sent = await chatApi.sendPhoto(
        conversationId,
        result.assets[0].uri,
      );
      setMessages((old) => [...old, sent]);
    } catch (e) {
      Alert.alert(
        "Photo not sent",
        e instanceof Error ? e.message : "Please try again.",
      );
    } finally {
      setSending(false);
    }
  };
  const toggleRecording = async () => {
    try {
      if (recorderState.isRecording) {
        await recorder.stop();
        if (recorder.uri) {
          const sent = await chatApi.sendAudio(conversationId, recorder.uri);
          setMessages((old) => [...old, sent]);
        }
      } else {
        const permission = await AudioModule.requestRecordingPermissionsAsync();
        if (!permission.granted)
          return Alert.alert(
            "Microphone needed",
            "Allow microphone access to send voice messages.",
          );
        await AudioModule.setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
        await recorder.prepareToRecordAsync();
        recorder.record();
      }
    } catch (e) {
      Alert.alert(
        "Voice message failed",
        e instanceof Error ? e.message : "Please try again.",
      );
    }
  };
  const openAi = async () => {
    setAssist(true);
    setAiLoading(true);
    try {
      setAi(
        await chatApi.assist(
          conversationId,
          conversation?.participantName || "your match",
          messages,
        ),
      );
    } catch (e) {
      Alert.alert(
        "Could not read this chat",
        e instanceof Error ? e.message : "Please try again.",
      );
    } finally {
      setAiLoading(false);
    }
  };
  const openParticipantProfile = useCallback(() => {
    if (!conversation?.participantProfileId) return;
    setPreviewProfile(conversationPreviewProfile(conversation));
    void discoverApi
      .profile(conversation.participantProfileId)
      .then(setPreviewProfile)
      .catch(() => undefined);
  }, [conversation]);
  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <Pressable onPress={() => navigateToForYou(navigation)} hitSlop={8} accessibilityLabel="Back to For You">
            <Ionicons name="chevron-back" size={25} />
          </Pressable>
        </View>
        <Pressable
          style={styles.headerCenter}
          onPress={openParticipantProfile}
          disabled={!conversation?.participantProfileId}
        >
          {conversation ? (
            <Image
              source={{ uri: conversation.participantAvatar }}
              style={styles.avatar}
            />
          ) : null}
          <View style={styles.headerBody}>
            <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail" maxFontSizeMultiplier={1}>
              {conversation?.participantName || "Conversation"}
            </Text>
            {!conversation?.isAiCompanion ? (
              <Text style={styles.status}>
                {conversation?.isOnline
                  ? "Online now"
                  : conversation?.lastSeenLabel || "Last seen today"}
              </Text>
            ) : null}
          </View>
        </Pressable>
        <View style={styles.headerSideRight}>
          {!pendingRequest && !conversation?.isAiCompanion ? (
            <Pressable
              onPress={() =>
                navigation.navigate("VideoCall", { conversationId, conversation })
              }
            >
              <Ionicons name="videocam-outline" size={23} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() =>
              navigation.navigate("ChatOptions", { conversationId, conversation })
            }
          >
            <Ionicons name="ellipsis-vertical" size={23} />
          </Pressable>
        </View>
      </View>
      <View style={styles.body}>
        <View pointerEvents="none" style={styles.watermarkWrap}>
          <Image
            source={require("../../../assets/heart-tight.png")}
            style={styles.watermarkImage}
            contentFit="contain"
            blurRadius={Platform.OS === "android" ? 4 : 2}
          />
        </View>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 66 : 0}
          style={styles.flex}
        >
          <View style={styles.messagesArea}>
            {loading ? (
              <View style={styles.loadingWrap}>
                <LoadingIndicator label="Loading conversation…" />
              </View>
            ) : (
              <ScrollView
                style={styles.flex}
                contentContainerStyle={styles.messages}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                {messages.map((item) => (
                  <Bubble
                    key={item.id}
                    message={item}
                    onLongPress={() => setSelectedMessage(item)}
                  />
                ))}
                {conversation?.isTyping ? (
                  <View style={styles.typingBubble}>
                    <Text style={styles.typing}>typing…</Text>
                  </View>
                ) : null}
              </ScrollView>
            )}
          </View>
          {reply ? (
            <View style={styles.replyBar}>
              <View style={styles.replyBarText}>
                <Text style={styles.replyName}>
                  Replying to{" "}
                  {reply.senderId === "me"
                    ? "yourself"
                    : conversation?.participantName}
                </Text>
                <Text numberOfLines={1} style={styles.replyText}>
                  {reply.text}
                </Text>
              </View>
              <Pressable onPress={() => setReply(null)}>
                <Ionicons name="close" size={20} color="#8C3AE0" />
              </Pressable>
            </View>
          ) : null}
          {pendingRequest ? (
            <View style={[styles.requestCard, { marginBottom: composerBottomPad }]}>
              <Image source={{ uri: conversation?.participantAvatar }} style={styles.requestAvatar} />
              <Text style={styles.requestTitle}>{incomingRequest ? (crushRequest ? `${conversation?.participantName} sent you a crush 💋` : `${conversation?.participantName} wants to chat`) : (crushRequest ? "Crush sent" : "Request sent")}</Text>
              <Text style={styles.requestCopy}>{incomingRequest ? "View their profile above, then accept to open the conversation or decline." : `Waiting for ${conversation?.participantName} to accept. You can chat once they approve.`}</Text>
              {incomingRequest ? <View style={styles.requestActions}>
                <Pressable disabled={requestBusy} style={styles.requestDecline} onPress={() => void respondToRequest(false)}><Text style={styles.requestDeclineText}>Decline</Text></Pressable>
                <Pressable disabled={requestBusy} style={styles.requestAccept} onPress={() => void respondToRequest(true)}><Text style={styles.requestAcceptText}>{requestBusy ? "Please wait…" : (crushRequest ? "Accept crush" : "Accept request")}</Text></Pressable>
              </View> : null}
            </View>
          ) : (
            <View style={[styles.composerDock, { paddingBottom: composerBottomPad }]}>
              <View style={styles.composer}>
                <Pressable
                  style={[
                    styles.roundButton,
                    recorderState.isRecording && styles.recording,
                  ]}
                  onPress={() => void toggleRecording()}
                >
                  <Ionicons
                    name={recorderState.isRecording ? "stop" : "mic"}
                    size={19}
                    color={recorderState.isRecording ? "#D7264A" : "#726C79"}
                  />
                </Pressable>
                <Pressable
                  style={styles.roundButton}
                  onPress={() => void sendPhoto()}
                >
                  <Ionicons name="camera-outline" size={19} color="#726C79" />
                </Pressable>
                <View style={styles.inputWrap}>
                  <TextInput
                    value={text}
                    onChangeText={changeText}
                    multiline
                    numberOfLines={4}
                    maxFontSizeMultiplier={1}
                    placeholder={
                      recorderState.isRecording
                        ? `Recording ${Math.ceil(recorderState.durationMillis / 1000)}s…`
                        : "Say something sweet…"
                    }
                    placeholderTextColor="#A79FB0"
                    style={styles.input}
                    textAlignVertical="center"
                  />
                  <Pressable
                    style={styles.emojiButton}
                    onPress={() => void openAi()}
                    accessibilityLabel="Lavey reply ideas and mood"
                  >
                    <Image
                      source={require("../../../assets/heart-tight.png")}
                      style={styles.composerAiLogo}
                    />
                    <View style={styles.composerAiDot}>
                      <Ionicons name="sparkles" size={7} color="white" />
                    </View>
                  </Pressable>
                </View>
                <Pressable
                  onPress={() => void send()}
                  style={[styles.send, !text.trim() && styles.sendIdle]}
                  disabled={!text.trim() && !recorderState.isRecording}
                >
                  <Ionicons name="send" size={19} color="white" />
                </Pressable>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>

      <Assist
        visible={assist}
        close={() => setAssist(false)}
        loading={aiLoading}
        result={ai}
        participant={conversation?.participantName || "your match"}
        refresh={openAi}
        pick={(v) => {
          setText(v);
          setAssist(false);
        }}
      />
      <ReactionPicker
        message={selectedMessage}
        close={() => setSelectedMessage(null)}
        react={(emoji) => {
          const target = selectedMessage;
          if (!target) return;
          setMessages((old) => old.map((m) => m.id === target.id ? { ...m, reaction: emoji } : m));
          setSelectedMessage(null);
          void chatApi.react(conversationId, target.id, emoji);
        }}
        reply={() => {
          if (selectedMessage) setReply(selectedMessage);
          setSelectedMessage(null);
        }}
      />
      {previewProfile ? (
        <ProfileFeedModal
          profile={previewProfile}
          visible
          hideCrush
          onClose={() => setPreviewProfile(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}
function ReactionPicker({ message, close, react, reply }: { message: ChatMessage | null; close(): void; react(emoji: string): void; reply(): void }) {
  const emojis = ["❤️", "😂", "😍", "😮", "😢", "👍"];
  return (
    <Modal visible={Boolean(message)} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.reactionBackdrop} onPress={close}>
        <View style={styles.reactionCard}>
          <View style={styles.emojiRow}>{emojis.map((emoji) => <Pressable key={emoji} style={styles.emojiChoice} onPress={() => react(emoji)}><Text style={styles.emojiText}>{emoji}</Text></Pressable>)}</View>
          <View style={styles.messageActions}>
            <Pressable style={styles.messageAction} onPress={reply}><Ionicons name="arrow-undo-outline" size={19} color="#4B4650" /><Text style={styles.messageActionText}>Reply</Text></Pressable>
            <Pressable style={styles.messageAction} onPress={close}><Ionicons name="copy-outline" size={19} color="#4B4650" /><Text style={styles.messageActionText}>Copy</Text></Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}
function Bubble({
  message,
  onLongPress,
}: {
  message: ChatMessage;
  onLongPress(): void;
}) {
  const mine = message.senderId === "me";
  const body = (
    <>
      {message.replyTo ? (
        <View style={[styles.quote, mine && styles.quoteMine]}>
          <Text style={[styles.quoteName, mine && styles.quoteNameMine]}>
            {message.replyTo.senderId === "me" ? "You" : "Reply"}
          </Text>
          <Text
            numberOfLines={1}
            style={mine ? styles.quoteTextMine : styles.quoteText}
          >
            {message.replyTo.text}
          </Text>
        </View>
      ) : null}
      {message.kind === "image" && message.imageUrl ? (
        <Image source={{ uri: message.imageUrl }} style={styles.photo} />
      ) : message.kind === "audio" && message.audioUrl ? (
        <AudioBubble url={message.audioUrl} mine={mine} />
      ) : (
        <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
          {message.text}
        </Text>
      )}
      <View style={styles.timeRow}>
        <Text style={[styles.time, mine && styles.timeMine]}>
          {message.sentAt}
        </Text>
        {mine ? (
          <Text style={styles.ticks}>{message.read ? "✓✓✓" : "✓"}</Text>
        ) : null}
      </View>
      {message.reaction ? (
        <View style={styles.reactionBubble}>
          <Text style={styles.reaction}>{message.reaction}</Text>
        </View>
      ) : null}
    </>
  );
  if (mine) {
    return (
      <Pressable
        onLongPress={onLongPress}
        style={[styles.bubbleWrap, styles.alignEnd]}
      >
        <LinearGradient
          colors={["#FDE7F0", "#F2E8FA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.bubble, styles.mine]}
        >
          {body}
        </LinearGradient>
      </Pressable>
    );
  }
  return (
    <Pressable
      onLongPress={onLongPress}
      style={[styles.bubbleWrap, styles.alignStart, styles.bubble, styles.theirs]}
    >
      {body}
    </Pressable>
  );
}
function AudioBubble({ url, mine }: { url: string; mine: boolean }) {
  const player = useAudioPlayer(url);
  const tint = mine ? "#7E244E" : "#3D3940";
  return (
    <Pressable style={styles.audio} onPress={() => player.play()}>
      <View style={[styles.playCircle, mine && styles.playCircleMine]}>
        <Ionicons name="play" size={15} color={mine ? "#9D3264" : "#726C79"} />
      </View>
      <View style={[styles.wave, mine && styles.waveMine]} />
      <Text style={{ color: tint, fontFamily: theme.typography.medium, fontSize: 12 }}>
        Voice
      </Text>
    </Pressable>
  );
}
function Assist({
  visible,
  close,
  loading,
  result,
  participant,
  refresh,
  pick,
}: {
  visible: boolean;
  close(): void;
  loading: boolean;
  result: ChatAssistResult | null;
  participant: string;
  refresh(): void;
  pick(v: string): void;
}) {
  const firstName = participant.split(" ")[0] ?? participant;
  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.assistBackdrop} onPress={close}>
        <Pressable style={styles.assistSheet} onPress={(event) => event.stopPropagation()}>
          <LinearGradient
            colors={["#7C3AED", "#C026D3", "#FF5271"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.assistHero}
          >
            <View style={styles.assistHeroTop}>
              <View style={styles.assistBrand}>
                <Image
                  source={require("../../../assets/heart-tight.png")}
                  style={styles.assistLogo}
                />
                <View style={styles.assistSparkle}>
                  <Ionicons name="sparkles" size={11} color="#FFFFFF" />
                </View>
              </View>
              <View style={styles.assistHeroActions}>
                <Pressable style={styles.assistIconBtn} onPress={refresh} hitSlop={8}>
                  <Ionicons name="refresh" size={18} color="#FFFFFF" />
                </Pressable>
                <Pressable style={styles.assistIconBtn} onPress={close} hitSlop={8}>
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
            <Text style={styles.assistHeroTitle}>Reply ideas & mood</Text>
            <Text style={styles.assistHeroSub}>
              Lavey reads the chat with {firstName} and suggests what to say next.
            </Text>
          </LinearGradient>

          <ScrollView
            style={styles.assistBody}
            contentContainerStyle={styles.assistBodyContent}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.assistLoadingWrap}>
                <LoadingIndicator transparent />
                <Text style={styles.assistLoadingText}>Reading the vibe…</Text>
              </View>
            ) : result ? (
              <>
                <View style={styles.moodCard}>
                  <View style={styles.moodCardHead}>
                    <Ionicons name="pulse-outline" size={16} color="#7C3AED" />
                    <Text style={styles.moodLabel}>Conversation mood</Text>
                  </View>
                  <View style={styles.moodBadgeWrap}>
                    <LinearGradient
                      colors={["#EDE9FE", "#FCE7F3"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.moodBadge}
                    >
                      <Text style={styles.moodBadgeText}>{result.moodLabel}</Text>
                    </LinearGradient>
                  </View>
                  <Text style={styles.moodText}>{result.moodExplanation}</Text>
                </View>

                <View style={styles.suggestionsBlock}>
                  <View style={styles.suggestionsHead}>
                    <Text style={styles.suggestionsTitle}>Suggested replies</Text>
                    <Text style={styles.suggestionsHint}>Tap to use instantly</Text>
                  </View>
                  {result.suggestions.slice(0, 3).map((suggestion, index) => (
                    <Pressable
                      key={suggestion}
                      style={({ pressed }) => [
                        styles.suggestionCard,
                        pressed && styles.suggestionCardPressed,
                      ]}
                      onPress={() => pick(suggestion)}
                    >
                      <View style={[styles.suggestionIndex, SUGGESTION_ACCENTS[index % 3]]}>
                        <Text style={styles.suggestionIndexText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                      <Ionicons name="arrow-forward-circle" size={22} color="#C026D3" />
                    </Pressable>
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.assistEmpty}>
                <Ionicons name="chatbubble-ellipses-outline" size={28} color="#B6B0BC" />
                <Text style={styles.noAi}>Send a message first and Lavey will suggest replies.</Text>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const SUGGESTION_ACCENTS = [
  { backgroundColor: "#7C3AED" },
  { backgroundColor: "#0891B2" },
  { backgroundColor: "#DB2777" },
] as const;
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F8FC" },
  header: {
    height: 66,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDFDFF",
    borderBottomWidth: 0,
    zIndex: 2,
  },
  headerSide: {
    width: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerSideRight: {
    minWidth: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  headerProfile: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#F4A3C0",
  },
  headerBody: { flexShrink: 1, maxWidth: "62%", alignItems: "flex-start" },
  name: { fontFamily: theme.typography.bold, fontSize: 15, textAlign: "left" },
  status: {
    fontFamily: theme.typography.regular,
    color: "#86818A",
    fontSize: 10,
  },
  body: { flex: 1, position: "relative", backgroundColor: "#F6F5FA" },
  watermarkWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  watermarkImage: { width: 330, height: 330, opacity: 0.1 },
  flex: { flex: 1 },
  messagesArea: { flex: 1, minHeight: 0 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  messages: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  bubbleWrap: { maxWidth: "78%", marginVertical: 4, marginBottom: 6 },
  alignEnd: { alignSelf: "flex-end" },
  alignStart: { alignSelf: "flex-start" },
  bubble: {
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 19,
  },
  mine: {
    borderWidth: 1,
    borderColor: "#F5A5C7",
    borderBottomRightRadius: 5,
    shadowColor: "#C55CA4",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 7,
    elevation: 3,
  },
  theirs: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#EDEAF0",
    borderBottomLeftRadius: 5,
    shadowColor: "#171720",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleText: {
    fontFamily: theme.typography.regular,
    color: "#2B2730",
    fontSize: 14.5,
    lineHeight: 20,
  },
  bubbleTextMine: { color: "#7E244E" },
  timeRow: { flexDirection: "row", gap: 7, marginTop: 4, alignItems: "center" },
  time: {
    fontFamily: theme.typography.semibold,
    color: "#A09AA3",
    fontSize: 9,
  },
  timeMine: { color: "#C85B88" },
  ticks: { color: "#8FE1FF", fontSize: 11 },
  photo: { width: 210, height: 270, borderRadius: 14 },
  audio: { minWidth: 210, flexDirection: "row", alignItems: "center", gap: 10 },
  playCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F0EDF2",
    alignItems: "center",
    justifyContent: "center",
  },
  playCircleMine: { backgroundColor: "rgba(255,255,255,.7)" },
  wave: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "#D7D3DA" },
  waveMine: { backgroundColor: "rgba(126,36,78,.3)" },
  reactionBubble: {
    position: "absolute",
    right: 6,
    bottom: -14,
    backgroundColor: "white",
    borderRadius: 11,
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#171720",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  reaction: { fontSize: 12 },
  reactionBackdrop: { flex: 1, backgroundColor: "rgba(20,18,24,.28)", alignItems: "center", justifyContent: "center" },
  reactionCard: { width: 330, borderRadius: 20, backgroundColor: "white", padding: 10, shadowColor: "#17131B", shadowOffset: { width: 0, height: 8 }, shadowOpacity: .2, shadowRadius: 18, elevation: 12 },
  emojiRow: { height: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-around", borderBottomWidth: 1, borderColor: "#EEEAF0" },
  emojiChoice: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22 },
  emojiText: { fontSize: 25 },
  messageActions: { flexDirection: "row", paddingTop: 7 },
  messageAction: { flex: 1, height: 42, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  messageActionText: { fontFamily: theme.typography.semibold, color: "#4B4650", fontSize: 12 },
  quote: {
    borderLeftWidth: 3,
    borderColor: "#079A65",
    backgroundColor: "rgba(0,0,0,.04)",
    padding: 7,
    borderRadius: 8,
    marginBottom: 7,
  },
  quoteMine: {
    borderColor: "#C85B88",
    backgroundColor: "rgba(255,255,255,.55)",
  },
  quoteName: {
    color: "#07885E",
    fontFamily: theme.typography.bold,
    fontSize: 10,
  },
  quoteNameMine: { color: "#9D3264" },
  quoteText: { color: "#4A454F" },
  quoteTextMine: { color: "#7E4560" },
  typingBubble: {
    alignSelf: "flex-start",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#EDEAF0",
    borderRadius: 16,
    borderBottomLeftRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 13,
    marginBottom: 6,
  },
  typing: {
    fontFamily: theme.typography.medium,
    color: "#938D99",
    fontSize: 12,
  },
  aiFab: {
    position: "absolute",
    left: 16,
    bottom: 82,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#CFB1FF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  aiLogo: { width: 31, height: 31 },
  verify: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#2788EE",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  replyBar: {
    minHeight: 48,
    paddingHorizontal: 16,
    backgroundColor: "#F4EEF8",
    borderTopWidth: 1,
    borderColor: "#E7DFF0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  replyBarText: { flex: 1 },
  replyName: {
    fontFamily: theme.typography.semibold,
    color: "#8C3AE0",
    fontSize: 10,
  },
  replyText: { maxWidth: 280, fontSize: 10, color: "#78727C" },
  composerDock: {
    backgroundColor: "#FDFDFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E8E4EC",
    shadowColor: "#171720",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  composer: {
    minHeight: 56,
    paddingVertical: 7,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    backgroundColor: "#FDFDFF",
  },
  requestCard: { margin: 16, padding: 20, borderRadius: 22, alignItems: "center", backgroundColor: "white", borderWidth: 1, borderColor: "#E9DDF3" },
  requestAvatar: { width: 74, height: 74, borderRadius: 37, marginBottom: 12 },
  requestTitle: { fontFamily: theme.typography.bold, fontSize: 17, color: theme.colors.text, textAlign: "center" },
  requestCopy: { fontFamily: theme.typography.regular, fontSize: 12.5, lineHeight: 19, color: "#7E7783", textAlign: "center", marginTop: 7 },
  requestActions: { flexDirection: "row", gap: 10, width: "100%", marginTop: 18 },
  requestDecline: { flex: 1, height: 45, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#F1EEF3" },
  requestDeclineText: { fontFamily: theme.typography.bold, fontSize: 12, color: "#625A67" },
  requestAccept: { flex: 1.4, height: 45, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#7C3AED" },
  requestAcceptText: { fontFamily: theme.typography.bold, fontSize: 12, color: "white" },
  roundButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F0EDF2",
    alignItems: "center",
    justifyContent: "center",
  },
  recording: { backgroundColor: "#FFCCD7" },
  inputWrap: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    flexDirection: "row",
    alignItems: "flex-end",
    borderWidth: 1,
    borderColor: "#E5E1E9",
    borderRadius: 21,
    backgroundColor: "white",
    paddingLeft: 15,
    paddingRight: 4,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 108,
    paddingTop: Platform.OS === "android" ? 8 : 10,
    paddingBottom: Platform.OS === "android" ? 8 : 10,
    fontFamily: theme.typography.regular,
    fontSize: 14.5,
    color: "#241F29",
  },
  emojiButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  composerAiLogo: { width: 24, height: 24 },
  composerAiDot: {
    position: "absolute",
    right: 1,
    bottom: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#7C3AED",
    borderWidth: 1,
    borderColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EC4899",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EC4899",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  sendIdle: { backgroundColor: "#E7A9C4", shadowOpacity: 0 },
  assistBackdrop: {
    flex: 1,
    backgroundColor: "rgba(14, 12, 20, 0.52)",
    justifyContent: "flex-end",
  },
  assistSheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  assistHero: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
  },
  assistHeroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  assistBrand: { position: "relative" },
  assistLogo: { width: 36, height: 36 },
  assistSparkle: {
    position: "absolute",
    right: -4,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.24)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  assistHeroActions: { flexDirection: "row", gap: 8 },
  assistIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  assistHeroTitle: {
    fontFamily: theme.typography.bold,
    fontSize: 22,
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  assistHeroSub: {
    marginTop: 6,
    fontFamily: theme.typography.regular,
    fontSize: 13,
    lineHeight: 19,
    color: "rgba(255,255,255,0.92)",
    maxWidth: 320,
  },
  assistBody: { flexGrow: 0 },
  assistBodyContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 16,
  },
  assistLoadingWrap: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 28,
  },
  assistLoadingText: {
    fontFamily: theme.typography.medium,
    fontSize: 13,
    color: "#7A7380",
  },
  moodCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#FAF8FF",
    borderWidth: 1,
    borderColor: "#E9E0FF",
  },
  moodCardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  moodLabel: {
    fontFamily: theme.typography.semibold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: "#6B6280",
    textTransform: "uppercase",
  },
  moodBadgeWrap: { alignSelf: "flex-start" },
  moodBadge: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  moodBadgeText: {
    fontFamily: theme.typography.bold,
    fontSize: 13,
    color: "#7C3AED",
  },
  moodText: {
    marginTop: 12,
    fontFamily: theme.typography.regular,
    lineHeight: 21,
    fontSize: 14,
    color: "#3D3648",
  },
  suggestionsBlock: { gap: 10 },
  suggestionsHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  suggestionsTitle: {
    fontFamily: theme.typography.bold,
    fontSize: 15,
    color: "#1F2430",
  },
  suggestionsHint: {
    fontFamily: theme.typography.medium,
    fontSize: 11,
    color: "#C026D3",
  },
  suggestionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECE7F3",
    shadowColor: "#7C3AED",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  suggestionCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
    borderColor: "#D8B4FE",
  },
  suggestionIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionIndexText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.bold,
    fontSize: 12,
  },
  suggestionText: {
    flex: 1,
    fontFamily: theme.typography.medium,
    fontSize: 14,
    lineHeight: 20,
    color: "#2A2430",
  },
  assistEmpty: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 32,
    paddingHorizontal: 12,
  },
  noAi: {
    textAlign: "center",
    fontFamily: theme.typography.regular,
    fontSize: 13,
    lineHeight: 19,
    color: "#7A7380",
  },
});
