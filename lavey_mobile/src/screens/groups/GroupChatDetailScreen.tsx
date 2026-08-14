import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { profileApi, groupChatApi, matchApi } from "../../api/services";
import { theme } from "../../constants/theme";
import { useAuth } from "../../hooks/useAuth";
import type { GroupChat, GroupChatMessage, MatchListItem } from "../../types";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import type { ChatAssistResult } from "../../types";
import { LoadingIndicator } from "../../components/common/LoadingIndicator";

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function GroupChatDetailScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, "GroupChatDetail">) {
  const { groupId } = route.params;
  const [group, setGroup] = useState<GroupChat | null>(route.params.group ?? null);
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<GroupChatMessage | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [assistOpen, setAssistOpen] = useState(false);
  const [assistResult, setAssistResult] = useState<ChatAssistResult | null>(null);
  const [assistLoading, setAssistLoading] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    void profileApi.me().then((me) => setMyUserId(me.id)).catch(() => {});
  }, []);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        setMessages(await groupChatApi.messages(groupId));
      } catch (e) {
        if (!silent) Alert.alert("Could not load messages", e instanceof Error ? e.message : "Please try again.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [groupId],
  );
  useEffect(() => {
    void load();
    const poll = setInterval(() => void load(true), 4000);
    return () => clearInterval(poll);
  }, [load]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setDraft("");
    setSending(true);
    try {
      const message = await groupChatApi.send(groupId, body, replyingTo?.id);
      setMessages((old) => [...old, message]);
      setReplyingTo(null);
    } catch (e) {
      Alert.alert("Could not send", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setSending(false);
    }
  };

  const messageById = new Map(messages.map((m) => [m.id, m]));

  const openAi = async () => {
    setAssistOpen(true);
    setAssistLoading(true);
    try {
      setAssistResult(await groupChatApi.assist(groupId, group?.name ?? "Group chat"));
    } catch (e) {
      Alert.alert("Could not read this group", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setAssistLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={navigation.goBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <Pressable
          style={styles.headerCopy}
          onPress={() => group && navigation.navigate("GroupProfile", { group, myUserId })}
        >
          {group?.coverImage ? (
            <Image source={{ uri: group.coverImage }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.avatarFallback]}>
              <Text style={styles.headerAvatarInitial}>{initial(group?.name ?? "?")}</Text>
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {group?.name ?? "Group chat"}
            </Text>
            {group ? (
              <Text style={styles.headerSubtitle}>
                {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
              </Text>
            ) : null}
          </View>
        </Pressable>
        <Pressable style={styles.headerBtn} onPress={() => setOptionsOpen(true)} hitSlop={8}>
          <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.text} />
        </Pressable>
      </View>

      <View style={styles.messageArea}>
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const mine = item.senderUserId === myUserId;
            const replyTo = item.replyToMessageId ? messageById.get(item.replyToMessageId) : null;
            return (
              <View style={[styles.messageRow, mine && styles.messageRowMine]}>
                {!mine ? (
                  item.senderAvatar ? (
                    <Image source={{ uri: item.senderAvatar }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Text style={styles.avatarInitial}>{initial(item.senderName)}</Text>
                    </View>
                  )
                ) : null}
                <View style={[styles.bubble, mine && styles.bubbleMine]}>
                  {!mine ? <Text style={styles.senderName}>{item.senderName}</Text> : null}
                  {replyTo ? (
                    <View style={styles.replyPreview}>
                      <Text style={styles.replyPreviewName}>{firstName(replyTo.senderName)}</Text>
                      <Text style={styles.replyPreviewText} numberOfLines={1}>
                        {replyTo.body}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.body}</Text>
                </View>
                <Pressable style={styles.replyTrigger} onPress={() => { setReplyingTo(item); inputRef.current?.focus(); }} hitSlop={8}>
                  <Ionicons name="arrow-undo" size={13} color="#B0ACB4" />
                </Pressable>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>No messages yet. Say hi to the group 👋</Text>}
        />
        {loading ? (
          <View style={styles.messageLoading}>
            <LoadingIndicator label="Loading messages…" />
          </View>
        ) : null}
      </View>

      {replyingTo ? (
        <View style={styles.replyBanner}>
          <Text style={styles.replyBannerText}>
            Replying to <Text style={styles.replyBannerName}>{firstName(replyingTo.senderName)}</Text>
          </Text>
          <Pressable onPress={() => setReplyingTo(null)} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color="#8A878D" />
          </Pressable>
        </View>
      ) : null}

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <View style={styles.inputWrap}>
          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={setDraft}
            placeholder="Message the group…"
            placeholderTextColor="#B0ACB4"
            style={styles.input}
            maxLength={4000}
            multiline
          />
            <Pressable style={styles.aiButton} onPress={() => void openAi()} accessibilityLabel="Lavey group reply ideas and mood">
              <Image source={require("../../../assets/heart-tight.png")} style={styles.aiLogo} contentFit="contain" />
              <View style={styles.aiDot}><Ionicons name="sparkles" size={7} color="white" /></View>
            </Pressable>
          </View>
          <Pressable style={[styles.send, !draft.trim() && styles.sendDisabled]} disabled={!draft.trim() || sending} onPress={() => void send()}>
            <Ionicons name="send" size={16} color="white" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <GroupAssist
        visible={assistOpen}
        loading={assistLoading}
        result={assistResult}
        groupName={group?.name ?? "this group"}
        close={() => setAssistOpen(false)}
        refresh={() => void openAi()}
        pick={(value) => {
          setDraft(value);
          setAssistOpen(false);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
      />

      <GroupOptionsSheet
        visible={optionsOpen}
        group={group}
        onClose={() => setOptionsOpen(false)}
        onGroupUpdated={setGroup}
        onLeftOrDeleted={() => navigation.goBack()}
      />
    </SafeAreaView>
  );
}

function GroupAssist({ visible, loading, result, groupName, close, refresh, pick }: {
  visible: boolean;
  loading: boolean;
  result: ChatAssistResult | null;
  groupName: string;
  close(): void;
  refresh(): void;
  pick(value: string): void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.assistBackdrop}>
        <View style={styles.assistCard}>
          <View style={styles.assistHead}>
            <Image source={require("../../../assets/heart-tight.png")} style={styles.assistLogo} contentFit="contain" />
            <View style={styles.assistHeading}>
              <Text style={styles.assistTitle}>Reply ideas & mood</Text>
              <Text style={styles.assistWith}>For {groupName}</Text>
            </View>
            <Pressable onPress={refresh} hitSlop={8}><Ionicons name="refresh" size={19} color="#625D66" /></Pressable>
            <Pressable onPress={close} hitSlop={8}><Ionicons name="close" size={20} color="#625D66" /></Pressable>
          </View>
          {loading ? (
            <LoadingIndicator label="Reading the group vibe…" />
          ) : result ? (
            <>
              <View style={styles.moodCard}>
                <Text style={styles.assistLabel}>GROUP MOOD</Text>
                <Text style={styles.moodBadge}>{result.moodLabel}</Text>
                <Text style={styles.moodCopy}>{result.moodExplanation}</Text>
              </View>
              <Text style={styles.assistLabel}>SUGGESTED REPLIES · TAP TO USE</Text>
              {result.suggestions.slice(0, 3).map((suggestion, index) => (
                <Pressable key={suggestion} style={styles.suggestion} onPress={() => pick(suggestion)}>
                  <View style={styles.suggestionNumber}><Text style={styles.suggestionNumberText}>{index + 1}</Text></View>
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </Pressable>
              ))}
            </>
          ) : (
            <Text style={styles.empty}>Send a group message first.</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

function GroupOptionsSheet({
  visible,
  group,
  onClose,
  onGroupUpdated,
  onLeftOrDeleted,
}: {
  visible: boolean;
  group: GroupChat | null;
  onClose(): void;
  onGroupUpdated(group: GroupChat): void;
  onLeftOrDeleted(): void;
}) {
  const [step, setStep] = useState<"menu" | "invite">("menu");
  const [matches, setMatches] = useState<MatchListItem[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) {
      setStep("menu");
      setSelected(new Set());
    }
  }, [visible]);

  if (!group) return null;
  const memberIds = new Set(group.members.map((m) => m.userId));
  const invitableMatches = matches.filter((m) => !memberIds.has(m.userId as string));

  const openInvite = () => {
    setStep("invite");
    setLoadingMatches(true);
    void matchApi
      .list()
      .then(setMatches)
      .catch(() => setMatches([]))
      .finally(() => setLoadingMatches(false));
  };

  const submitInvite = async () => {
    setBusy(true);
    try {
      const updated = await groupChatApi.invite(group.id, [...selected]);
      onGroupUpdated(updated);
      onClose();
    } catch (e) {
      Alert.alert("Could not invite", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    setBusy(true);
    try {
      await groupChatApi.leave(group.id);
      onLeftOrDeleted();
    } catch (e) {
      Alert.alert("Could not leave", e instanceof Error ? e.message : "Please try again.");
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await groupChatApi.remove(group.id);
      onLeftOrDeleted();
    } catch (e) {
      Alert.alert("Could not delete", e instanceof Error ? e.message : "Please try again.");
      setBusy(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.optionsBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.optionsSheet, { paddingBottom: Math.max(insets.bottom, 20) + 8 }]}>
          <View style={styles.handle} />
          {step === "menu" ? (
            <>
              <Text style={styles.optionsTitle}>{group.name}</Text>
              <OptionRow icon="people-outline" title={`${group.memberCount} members · ${group.spotsRemaining} spots left`} onPress={onClose} />
              {group.inviteLink ? (
                <OptionRow icon="link-outline" title="Share group link" onPress={() => void Share.share({ message: `Join ${group.name} on Lavey: ${group.inviteLink}` })} />
              ) : null}
              {group.isHostedByYou ? (
                <OptionRow icon="person-add-outline" title="Invite more matches" onPress={openInvite} />
              ) : null}
              {group.isHostedByYou ? (
                <OptionRow icon="trash-outline" title="Delete group" danger onPress={() => void remove()} />
              ) : (
                <OptionRow icon="exit-outline" title="Leave group" danger onPress={() => void leave()} />
              )}
              <Pressable style={styles.cancel} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.optionsTitle}>Invite matches</Text>
              {loadingMatches ? (
                <ActivityIndicator style={{ marginVertical: 14 }} color="#7C3AED" />
              ) : invitableMatches.length === 0 ? (
                <Text style={styles.empty}>Everyone you&apos;ve matched with is already in this group.</Text>
              ) : (
                invitableMatches.map((m) => {
                  const userId = m.userId as string;
                  const on = selected.has(userId);
                  return (
                    <Pressable
                      key={m.id}
                      style={[styles.inviteRow, on && styles.inviteRowOn]}
                      onPress={() =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(userId)) next.delete(userId);
                          else next.add(userId);
                          return next;
                        })
                      }
                    >
                      {m.avatar ? <Image source={{ uri: m.avatar }} style={styles.inviteAvatar} /> : <View style={[styles.inviteAvatar, styles.avatarFallback]} />}
                      <Text style={styles.inviteName}>{m.name}</Text>
                      {on ? <Ionicons name="checkmark-circle" size={20} color="#7C3AED" /> : null}
                    </Pressable>
                  );
                })
              )}
              <View style={styles.optionsActions}>
                <Pressable style={styles.back} onPress={() => setStep("menu")}>
                  <Text style={styles.backText}>Back</Text>
                </Pressable>
                <Pressable style={[styles.primary, selected.size === 0 && styles.primaryDisabled]} disabled={selected.size === 0 || busy} onPress={() => void submitInvite()}>
                  <Text style={styles.primaryText}>{busy ? "Inviting…" : "Send invites"}</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function OptionRow({
  icon,
  title,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress(): void;
  danger?: boolean;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.optionRow, pressed && { opacity: 0.7 }]} onPress={onPress}>
      <View style={[styles.optionIcon, danger && styles.optionIconDanger]}>
        <Ionicons name={icon} size={19} color={danger ? "#E23B3B" : "#4B4750"} />
      </View>
      <Text style={[styles.optionTitle, danger && styles.optionTitleDanger]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    height: 58,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderBottomWidth: 1,
    borderColor: "#EDEBEF",
    backgroundColor: "white",
  },
  headerBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerAvatarInitial: { color: "white", fontFamily: theme.typography.bold, fontSize: 14 },
  headerText: { flex: 1 },
  headerTitle: { fontFamily: theme.typography.bold, fontSize: 15, color: theme.colors.text },
  headerSubtitle: { fontFamily: theme.typography.regular, fontSize: 11, color: "#9A96A0" },
  messageArea: { flex: 1, position: "relative" },
  messageLoading: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(248,248,252,.94)" },
  list: { padding: 14, gap: 10, flexGrow: 1 },
  empty: { textAlign: "center", marginTop: 30, fontFamily: theme.typography.regular, color: "#9A96A0", fontSize: 13 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, maxWidth: "86%" },
  messageRowMine: { alignSelf: "flex-end", flexDirection: "row-reverse" },
  avatar: { width: 26, height: 26, borderRadius: 13 },
  avatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "#7C3AED" },
  avatarInitial: { color: "white", fontFamily: theme.typography.bold, fontSize: 10 },
  bubble: {
    backgroundColor: "white",
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#EDEBEF",
  },
  bubbleMine: { backgroundColor: theme.colors.coral, borderColor: theme.colors.coral, borderBottomLeftRadius: 16, borderBottomRightRadius: 4 },
  senderName: { fontFamily: theme.typography.bold, fontSize: 10.5, color: "#7C3AED", marginBottom: 2 },
  bubbleText: { fontFamily: theme.typography.regular, fontSize: 14, color: theme.colors.text, lineHeight: 19 },
  bubbleTextMine: { color: "white" },
  replyPreview: { borderLeftWidth: 2, borderColor: "#D6D3D9", paddingLeft: 7, marginBottom: 5 },
  replyPreviewName: { fontFamily: theme.typography.semibold, fontSize: 10, color: "#7C3AED" },
  replyPreviewText: { fontFamily: theme.typography.regular, fontSize: 11, color: "#9A96A0" },
  replyTrigger: { paddingBottom: 6 },
  replyBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#F6F5F7",
    borderTopWidth: 1,
    borderColor: "#EEE",
  },
  replyBannerText: { fontFamily: theme.typography.medium, fontSize: 12, color: "#5B5660" },
  replyBannerName: { fontFamily: theme.typography.bold, color: theme.colors.text },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderColor: "#EDEBEF",
  },
  inputWrap: { flex: 1, position: "relative", justifyContent: "center" },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E2E7",
    paddingLeft: 14,
    paddingRight: 46,
    paddingVertical: 9,
    fontFamily: theme.typography.regular,
    fontSize: 14,
    color: theme.colors.text,
    backgroundColor: "#FAFAFB",
  },
  aiButton: { position: "absolute", right: 7, bottom: 7, width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  aiLogo: { width: 24, height: 24 },
  aiDot: { position: "absolute", right: 0, bottom: 0, width: 12, height: 12, borderRadius: 6, alignItems: "center", justifyContent: "center", backgroundColor: "#7C3AED", borderWidth: 1, borderColor: "white" },
  send: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.coral, alignItems: "center", justifyContent: "center" },
  sendDisabled: { opacity: 0.45 },
  assistBackdrop: { flex: 1, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(20,18,24,.46)" },
  assistCard: { width: "100%", maxWidth: 390, maxHeight: "82%", padding: 18, borderRadius: 24, backgroundColor: "white" },
  assistHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  assistLogo: { width: 34, height: 34 },
  assistHeading: { flex: 1 },
  assistTitle: { fontFamily: theme.typography.bold, fontSize: 16, color: theme.colors.text },
  assistWith: { marginTop: 1, fontFamily: theme.typography.regular, fontSize: 10.5, color: "#918B96" },
  assistLabel: { fontFamily: theme.typography.bold, fontSize: 9.5, letterSpacing: 1, color: "#918B96", marginBottom: 8 },
  moodCard: { padding: 14, marginBottom: 16, borderRadius: 17, backgroundColor: "#F7F1FD", borderWidth: 1, borderColor: "#E5D8F5" },
  moodBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, overflow: "hidden", backgroundColor: "#7C3AED", color: "white", fontFamily: theme.typography.bold, fontSize: 10.5 },
  moodCopy: { marginTop: 9, color: "#625D66", fontFamily: theme.typography.regular, fontSize: 12, lineHeight: 18 },
  suggestion: { minHeight: 52, marginBottom: 9, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, borderWidth: 1, borderColor: "#E8E1EF", backgroundColor: "#FEFDFF" },
  suggestionNumber: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#F0E7FB" },
  suggestionNumberText: { color: "#7C3AED", fontFamily: theme.typography.bold, fontSize: 10 },
  suggestionText: { flex: 1, color: theme.colors.text, fontFamily: theme.typography.medium, fontSize: 12.5, lineHeight: 18 },
  optionsBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,.48)" },
  optionsSheet: { backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 19, paddingTop: 10 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E2E0E4", alignSelf: "center", marginBottom: 10 },
  optionsTitle: { fontFamily: theme.typography.bold, fontSize: 16, color: "#19171E", marginBottom: 6 },
  memberHint: { fontFamily: theme.typography.regular, fontSize: 12, color: "#89838E", lineHeight: 18, marginBottom: 10 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 10, borderBottomWidth: 1, borderColor: "#F0EDF2" },
  memberAvatar: { width: 44, height: 44, borderRadius: 22 },
  memberName: { fontFamily: theme.typography.bold, fontSize: 13.5, color: theme.colors.text },
  memberRole: { fontFamily: theme.typography.regular, fontSize: 11, color: "#918B96", marginTop: 2 },
  memberMessage: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#7C3AED", borderRadius: 16, paddingHorizontal: 11, paddingVertical: 8 },
  memberMessageText: { fontFamily: theme.typography.bold, fontSize: 10.5, color: "white" },
  youLabel: { fontFamily: theme.typography.semibold, fontSize: 11, color: "#7C3AED", backgroundColor: "#F2EAFE", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  optionIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "#F2F1F3" },
  optionIconDanger: { backgroundColor: "#FFEBEB" },
  optionTitle: { fontFamily: theme.typography.semibold, fontSize: 14, color: "#221F26" },
  optionTitleDanger: { color: "#E23B3B" },
  cancel: { marginTop: 8, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "#F2F1F3" },
  cancelText: { fontFamily: theme.typography.semibold, fontSize: 14, color: "#3E3A44" },
  inviteRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, paddingHorizontal: 4, borderRadius: 12 },
  inviteRowOn: { backgroundColor: "#F3EAFE" },
  inviteAvatar: { width: 32, height: 32, borderRadius: 16 },
  inviteName: { flex: 1, fontFamily: theme.typography.semibold, fontSize: 13.5, color: theme.colors.text },
  optionsActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  back: { flex: 1, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "#F2F1F3" },
  backText: { fontFamily: theme.typography.semibold, fontSize: 14, color: "#3E3A44" },
  primary: { flex: 1, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "#7C3AED" },
  primaryDisabled: { opacity: 0.45 },
  primaryText: { fontFamily: theme.typography.bold, fontSize: 14, color: "white" },
});
