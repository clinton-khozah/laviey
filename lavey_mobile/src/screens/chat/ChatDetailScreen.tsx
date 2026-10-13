import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Keyboard,
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
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { chatApi, discoverApi, matchApi } from "../../api/services";
import { useChat } from "../../context/ChatContext";
import { LoadingIndicator } from "../../components/common/LoadingIndicator";
import { NameInitialCircle } from "../../components/common/NameInitialCircle";
import { hasCustomProfileAvatar } from "../../utils/discoverProfileReady";
import { theme } from "../../constants/theme";
import type { ChatAssistResult, ChatMessage, Conversation, Profile } from "../../types";
import { ProfileFeedModal } from "../home/components/ProfileFeedModal";
import { CrushRequestModal } from "./components/CrushRequestModal";
import { ComposerEmojiSheet } from "./components/ComposerEmojiSheet";
import { VoicePlaybackBar } from "./components/VoicePlaybackBar";
import { VoiceRecordingBar } from "./components/VoiceRecordingBar";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import { navigateToForYou } from "../../utils/navigateToForYou";
import { useLogoReady } from "../../utils/deferLogo";

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
  const { acceptRequest, acceptedConversationId } = useChat();
  const logoReady = useLogoReady();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [assist, setAssist] = useState(false);
  const [ai, setAi] = useState<ChatAssistResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [reply, setReply] = useState<ChatMessage | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [requestBusy, setRequestBusy] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [previewProfile, setPreviewProfile] = useState<Profile | null>(null);
  const participantProfile = useRef<Profile | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const loadingMessages = useRef(false);
  const pendingOutgoing = useRef<string | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardLift, setKeyboardLift] = useState(0);
  const composerBottomPad = keyboardVisible
    ? 12
    : Math.max(insets.bottom, 0) + 22;
  const alreadyAcceptedId = conversation?.iCrushInviteId ? acceptedConversationId(conversation.iCrushInviteId) : undefined;
  const incomingRequest = !alreadyAcceptedId && (conversation?.conversationKind === "i_crush_incoming" || conversation?.conversationKind === "chat_request_incoming");
  const outgoingRequest = !alreadyAcceptedId && (conversation?.conversationKind === "i_crush_outgoing" || conversation?.conversationKind === "chat_request_outgoing");
  // Defensive fallback: conversationId itself encodes a pending request ("icrush-<inviteId>")
  // even if a caller forgot to pass the matching conversation.conversationKind — without this,
  // load()/send() below would try to query this synthetic id as a real conversation uuid.
  const pendingRequest =
    !alreadyAcceptedId &&
    !chatOpen &&
    conversation?.conversationKind !== "match" &&
    (incomingRequest || outgoingRequest || conversationId.startsWith("icrush-"));
  const crushRequest = conversation?.conversationKind === "i_crush_incoming" || conversation?.conversationKind === "i_crush_outgoing";
  const respondToRequest = async (accept: boolean) => {
    if (!conversation?.iCrushInviteId || requestBusy) return;
    if (accept) {
      setChatOpen(true);
      try {
        const result = await matchApi.acceptCrush(conversation.iCrushInviteId);
        const opened = { ...conversation, id: result.conversationId, conversationKind: "match" as const, iCrushInviteId: undefined };
        acceptRequest(conversation.iCrushInviteId, opened);
        navigation.setParams({
          conversationId: result.conversationId,
          conversation: opened,
        });
      } catch (e) {
        setChatOpen(false);
        Alert.alert("Could not respond", e instanceof Error ? e.message : "Please try again.");
      }
      return;
    }
    setRequestBusy(true);
    try {
      await matchApi.rejectCrush(conversation.iCrushInviteId);
      navigation.goBack();
    } catch (e) {
      Alert.alert("Could not respond", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setRequestBusy(false);
    }
  };
  useEffect(() => {
    if (!alreadyAcceptedId || !conversation || alreadyAcceptedId === conversationId) return;
    navigation.setParams({
      conversationId: alreadyAcceptedId,
      conversation: { ...conversation, id: alreadyAcceptedId, conversationKind: "match", iCrushInviteId: undefined },
    });
  }, [alreadyAcceptedId, conversation, conversationId, navigation]);
  const load = useCallback(
    async () => {
      if (conversationId === "resolve" || loadingMessages.current) return;
      loadingMessages.current = true;
      try {
        const next = await chatApi.messages(conversationId);
        setMessages((current) => {
          const same =
            current.length === next.length &&
            current[current.length - 1]?.id === next[next.length - 1]?.id &&
            current[current.length - 1]?.text === next[next.length - 1]?.text;
          return same ? current : next;
        });
        void chatApi.read(conversationId).catch(() => undefined);
      } catch {
        // Keep the thread on screen. The next refresh can fill it in.
      } finally {
        loadingMessages.current = false;
      }
    },
    [conversationId],
  );
  useEffect(() => {
    if (conversationId !== "resolve" || !route.params.profileId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const lookup = chatApi.conversationByProfile(route.params.profileId);
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("This chat is taking too long to open.")), 8000);
    });
    void Promise.race([lookup, timeout])
      .then(({ conversationId: id }) => {
        if (cancelled) return;
        if (!id) {
          Alert.alert("Couldn't open chat", "Your match chat is still being prepared. Please try again.");
          navigation.goBack();
          return;
        }
        navigation.setParams({ conversationId: id });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        Alert.alert("Couldn't open chat", e instanceof Error ? e.message : "Please try again.");
        navigation.goBack();
      });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [conversationId, navigation, route.params.profileId]);
  useEffect(() => {
    // A pending crush/chat request has no real conversation yet — conversationId is a
    // synthetic "icrush-<inviteId>" placeholder, not a row the messages API can look up.
    if (pendingRequest || conversationId === "resolve") return;
    void load();
    const poll = setInterval(() => void load(), 12000);
    return () => clearInterval(poll);
  }, [load, pendingRequest]);
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (event) => {
      const windowHeight = Dimensions.get("window").height;
      const screenHeight = Dimensions.get("screen").height;
      const { height, screenY } = event.endCoordinates;
      const windowAlreadyShrunk = screenHeight - windowHeight > height * 0.45;
      const covered = Math.round(windowHeight - screenY);
      const lift = windowAlreadyShrunk
        ? 0
        : covered > 0 && covered <= height + 48
          ? covered
          : Math.round(height);
      setKeyboardLift(lift);
      setKeyboardVisible(true);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardLift(0);
      setKeyboardVisible(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  const changeText = (v: string) => {
    setText(v);
    if (conversationId.startsWith("icrush-") || conversationId === "resolve") return;
    void chatApi
      .typing(conversationId, Boolean(v.trim()))
      .catch(() => undefined);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => void chatApi.typing(conversationId, false),
      2200,
    );
  };
  const deliver = async (body: string) => {
    if (!body || sending) return;
    const draft = text;
    setText("");
    setSending(true);
    try {
      const result = await chatApi.send(conversationId, body);
      setMessages((old) => [...old, result]);
      setReply(null);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    } catch (e) {
      setText(draft);
      Alert.alert(
        "Message not sent",
        e instanceof Error ? e.message : "Please try again.",
      );
    } finally {
      setSending(false);
    }
  };
  const send = () => {
    const body = text.trim();
    if (!body || sending) return;
    if (conversationId.startsWith("icrush-") || conversationId === "resolve") {
      pendingOutgoing.current = body;
      setText("");
      return;
    }
    void deliver(body);
  };
  useEffect(() => {
    const body = pendingOutgoing.current;
    if (!body || conversationId.startsWith("icrush-") || conversationId === "resolve") return;
    pendingOutgoing.current = null;
    void deliver(body);
  }, [conversationId]);
  const insertEmoji = (emoji: string) => {
    setText((current) => {
      if (!current) return emoji;
      return /\s$/.test(current) ? `${current}${emoji}` : `${current} ${emoji}`;
    });
    setEmojiOpen(false);
  };
  const sendPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      legacy: true,
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
        await AudioModule.setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
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
      let transcript = messages;
      const hasText = transcript.some((message) => message.kind !== "image" && message.kind !== "audio" && message.text?.trim());
      if (!hasText && conversationId !== "resolve" && !conversationId.startsWith("icrush-")) {
        transcript = await chatApi.messages(conversationId);
        setMessages(transcript);
      }
      setAi(
        await chatApi.assist(
          conversationId,
          conversation?.participantName || "your match",
          transcript,
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
  useEffect(() => {
    const profileId = conversation?.participantProfileId;
    if (!profileId) return;
    let cancelled = false;
    void discoverApi.profile(profileId).then((profile) => {
      if (cancelled) return;
      participantProfile.current = profile;
      setPreviewProfile((current) => (current?.id === profile.id ? profile : current));
      const photos = [profile.avatar, ...profile.posts.map((post) => post.src || post.poster || "")].filter(Boolean).slice(0, 6);
      if (photos.length) void Image.prefetch(photos);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [conversation?.participantProfileId]);
  const openParticipantProfile = useCallback(() => {
    if (!conversation) return;
    setPreviewProfile(participantProfile.current ?? conversationPreviewProfile(conversation));
    if (!conversation.participantProfileId) return;
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
          disabled={!conversation}
          accessibilityLabel={`View ${conversation?.participantName || "profile"}`}
        >
          {conversation ? (
            hasCustomProfileAvatar(conversation.participantAvatar) ? (
              <Image source={{ uri: conversation.participantAvatar }} style={styles.avatar} />
            ) : (
              <NameInitialCircle name={conversation.participantName} size={40} />
            )
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
              style={styles.headerIcon}
              hitSlop={8}
              onPress={() =>
                navigation.navigate("VideoCall", { conversationId, conversation })
              }
            >
              <Ionicons name="videocam-outline" size={23} />
            </Pressable>
          ) : null}
          <Pressable
            style={styles.headerIcon}
            hitSlop={8}
            onPress={() =>
              navigation.navigate("ChatOptions", { conversationId, conversation })
            }
          >
            <Ionicons name="ellipsis-vertical" size={23} />
          </Pressable>
        </View>
      </View>
      <View style={[styles.body, { paddingBottom: keyboardLift }]}>
        {logoReady ? (
          <>
            <View pointerEvents="none" style={styles.watermarkWrap}>
              <Image
                source={require("../../../assets/heart-tight.png")}
                style={styles.watermarkImage}
                contentFit="contain"
                blurRadius={Platform.OS === "android" ? 4 : 2}
              />
            </View>
            <View pointerEvents="none" style={styles.watermarkWrap}>
              <Image
                source={require("../../../assets/heart-tight.png")}
                style={styles.watermarkImage}
                contentFit="contain"
                blurRadius={Platform.OS === "android" ? 4 : 2}
              />
            </View>
          </>
        ) : null}
        <View style={styles.messagesArea}>
            <ScrollView
              ref={scrollRef}
              style={styles.flex}
              contentContainerStyle={styles.messages}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              onContentSizeChange={() => {
                if (keyboardVisible) {
                  scrollRef.current?.scrollToEnd({ animated: false });
                }
              }}
            >
              {messages.map((item) => (
                <Bubble
                  key={item.id}
                  message={item}
                  otherOnline={Boolean(conversation?.isOnline)}
                  onLongPress={() => setSelectedMessage(item)}
                />
              ))}
              {conversation?.isTyping ? (
                <View style={styles.typingBubble}>
                  <Text style={styles.typing}>typing…</Text>
                </View>
              ) : null}
            </ScrollView>
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
        {pendingRequest || conversationId === "resolve" ? null : (
          <View style={[styles.composerDock, { paddingBottom: composerBottomPad }]}>
              <View style={styles.composer}>
                <View style={styles.inputWrap}>
                  {recorderState.isRecording ? (
                    <VoiceRecordingBar durationMillis={recorderState.durationMillis} />
                  ) : (
                    <TextInput
                      value={text}
                      onChangeText={changeText}
                      multiline
                      scrollEnabled
                      maxFontSizeMultiplier={1.1}
                      placeholder="Message"
                      placeholderTextColor="#8A8D91"
                      style={styles.input}
                      textAlignVertical="top"
                      onContentSizeChange={() => {
                        requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: false }));
                      }}
                      onFocus={() => {
                        requestAnimationFrame(() => {
                          scrollRef.current?.scrollToEnd({ animated: true });
                        });
                      }}
                    />
                  )}
                  {text.trim() ? (
                    <Pressable
                      style={styles.pillIcon}
                      onPress={() => void openAi()}
                      accessibilityLabel="Lavey reply ideas"
                    >
                      <Image
                        source={require("../../../assets/heart-tight.png")}
                        style={styles.composerAiLogo}
                      />
                    </Pressable>
                  ) : (
                    <View style={styles.pillTools}>
                      <Pressable
                        style={styles.pillIcon}
                        onPress={() => void openAi()}
                        accessibilityLabel="Lavey reply ideas"
                      >
                        <Image
                          source={require("../../../assets/heart-tight.png")}
                          style={styles.composerAiLogo}
                        />
                      </Pressable>
                      <Pressable
                        style={styles.pillIcon}
                        onPress={() => void sendPhoto()}
                        accessibilityLabel="Send a photo"
                      >
                        <Ionicons name="image-outline" size={20} color="#65676B" />
                      </Pressable>
                      <Pressable
                        style={styles.pillIcon}
                        onPress={() => void toggleRecording()}
                        accessibilityLabel={recorderState.isRecording ? "Stop recording" : "Voice message"}
                      >
                        <Ionicons
                          name={recorderState.isRecording ? "stop" : "mic-outline"}
                          size={20}
                          color={recorderState.isRecording ? "#D7264A" : "#65676B"}
                        />
                      </Pressable>
                    </View>
                  )}
                </View>
                <Pressable
                  onPress={() => setEmojiOpen(true)}
                  style={styles.send}
                  accessibilityLabel="Add emoji"
                >
                  <Ionicons name="heart" size={20} color="white" />
                </Pressable>
                {text.trim() ? (
                  <Pressable
                    onPress={() => {
                      if (recorderState.isRecording || sending) return;
                      void send();
                    }}
                    style={styles.send}
                    accessibilityLabel="Send"
                  >
                    <Ionicons name="send" size={20} color="white" />
                  </Pressable>
                ) : null}
              </View>
            </View>
        )}
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
      {pendingRequest ? (
        <CrushRequestModal
          visible
          name={conversation?.participantName || "them"}
          avatar={conversation?.participantAvatar}
          incoming={incomingRequest}
          crush={crushRequest}
          busy={requestBusy}
          onAccept={() => void respondToRequest(true)}
          onDecline={() => void respondToRequest(false)}
          onClose={incomingRequest ? undefined : () => navigation.goBack()}
        />
      ) : null}
      <ComposerEmojiSheet visible={emojiOpen} onClose={() => setEmojiOpen(false)} onPick={insertEmoji} />
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
function MessageTicks({ read, online }: { read: boolean; online: boolean }) {
  const seen = read;
  const delivered = seen || online;
  return (
    <Ionicons
      name={delivered ? "checkmark-done" : "checkmark"}
      size={15}
      color={seen ? "#34B7F1" : "#9AA0A6"}
    />
  );
}
function Bubble({
  message,
  otherOnline,
  onLongPress,
}: {
  message: ChatMessage;
  otherOnline: boolean;
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
        <VoicePlaybackBar url={message.audioUrl} mine={mine} />
      ) : (
        <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
          {message.text}
        </Text>
      )}
      <View style={styles.timeRow}>
        <Text style={[styles.time, mine && styles.timeMine]}>
          {message.sentAt}
        </Text>
        {mine ? <MessageTicks read={message.read} online={otherOnline} /> : null}
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
        delayLongPress={350}
        onLongPress={onLongPress}
        style={[styles.bubbleWrap, styles.alignEnd, message.reaction ? styles.bubbleWithReaction : null]}
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
      delayLongPress={350}
      onLongPress={onLongPress}
      style={[styles.bubbleWrap, styles.alignStart, styles.bubble, styles.theirs, message.reaction ? styles.bubbleWithReaction : null]}
    >
      {body}
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
          <View style={styles.assistHero}>
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
          </View>

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
                    <Ionicons name="pulse-outline" size={16} color="#111111" />
                    <Text style={styles.moodLabel}>Conversation mood</Text>
                  </View>
                  <View style={styles.moodBadgeWrap}>
                    <View style={styles.moodBadge}>
                      <Text style={styles.moodBadgeText}>{result.moodLabel}</Text>
                    </View>
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
                      <Ionicons name="arrow-forward-circle" size={22} color="#111111" />
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
  { backgroundColor: "#111111" },
  { backgroundColor: "#111111" },
  { backgroundColor: "#111111" },
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
    minWidth: 96,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 14,
    paddingRight: 6,
  },
  headerIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
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
  bubbleWithReaction: { marginBottom: 22 },
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
    marginBottom: 12,
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
    marginBottom: 18,
    paddingVertical: 10,
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
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E4E6EB",
  },
  composer: {
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    backgroundColor: "#FFFFFF",
  },
  inputWrap: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 24,
    backgroundColor: "#F0F2F5",
    paddingLeft: 14,
    paddingRight: 4,
  },
  input: {
    flex: 1,
    minHeight: 26,
    maxHeight: 96,
    marginVertical: 11,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    fontFamily: theme.typography.regular,
    fontSize: 17,
    lineHeight: 22,
    color: "#050505",
  },
  pillTools: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
  },
  pillIcon: {
    width: 36,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  composerAiLogo: { width: 20, height: 20 },
  send: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#EC4899",
    alignItems: "center",
    justifyContent: "center",
  },
  sendLike: { backgroundColor: "#EC4899" },
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
    backgroundColor: "#111111",
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
    backgroundColor: "#F7F7F8",
    borderWidth: 1,
    borderColor: "#ECECEE",
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
    borderColor: "#E6E6E8",
    backgroundColor: "#FFFFFF",
  },
  moodBadgeText: {
    fontFamily: theme.typography.bold,
    fontSize: 13,
    color: "#111111",
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
    color: "#8A8494",
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
    borderColor: "#ECECEE",
    shadowColor: "#000000",
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
