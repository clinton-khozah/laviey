import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { profileApi } from "../../../api/services";
import { theme } from "../../../constants/theme";
import { useMeetupComments } from "../../../hooks/useMeetupComments";
import type { MeetupComment } from "../../../types";

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function CommentRow({
  comment,
  onToggleLike,
  onReply,
}: {
  comment: MeetupComment;
  onToggleLike(id: string): void;
  onReply(comment: MeetupComment): void;
}) {
  return (
    <View style={styles.row}>
      {comment.senderAvatar ? (
        <Image source={{ uri: comment.senderAvatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarInitial}>{initial(comment.senderName)}</Text>
        </View>
      )}
      <View style={styles.rowBody}>
        <Text style={styles.name}>{comment.senderName}</Text>
        {comment.replyToName ? (
          <Text style={styles.replyTag}>
            Replying to <Text style={styles.replyTagName}>{firstName(comment.replyToName)}</Text>
          </Text>
        ) : null}
        <Text style={styles.text}>{comment.body}</Text>
        <View style={styles.rowActions}>
          <Pressable style={styles.likeBtn} onPress={() => onToggleLike(comment.id)}>
            <Ionicons name={comment.likedByMe ? "heart" : "heart-outline"} size={13} color={comment.likedByMe ? theme.colors.coral : "#8A878D"} />
            <Text style={[styles.likeText, comment.likedByMe && styles.likeTextActive]}>{comment.likeCount > 0 ? comment.likeCount : "Like"}</Text>
          </Pressable>
          <Pressable style={styles.replyBtn} onPress={() => onReply(comment)}>
            <Text style={styles.replyBtnText}>Reply</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function MeetupCommentsSheet({
  visible,
  meetupId,
  onClose,
}: {
  visible: boolean;
  meetupId: string | null;
  onClose(): void;
}) {
  const [identity, setIdentity] = useState<{ id: string; name: string; avatar: string } | null>(null);
  useEffect(() => {
    if (!visible) return;
    void profileApi
      .me()
      .then((me) => setIdentity({ id: me.id, name: me.displayName || "You", avatar: me.avatarUrl ?? "" }))
      .catch(() => {});
  }, [visible]);

  const localAvatarUrl = identity?.avatar ?? "";
  const localDisplayName = identity?.name ?? "You";
  const { comments, sendComment, toggleLike } = useMeetupComments(meetupId, visible);
  const [draft, setDraft] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!visible) setReplyingTo(null);
  }, [visible]);

  if (!meetupId) return null;

  const submit = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      const ok = await sendComment(draft, replyingTo?.id, replyingTo?.name);
      if (ok) {
        setDraft("");
        setReplyingTo(null);
        requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
      }
    } finally {
      setSending(false);
    }
  };

  const startReply = (comment: MeetupComment) => {
    setReplyingTo({ id: comment.id, name: comment.senderName });
    inputRef.current?.focus();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.sheet}>
          <View style={styles.head}>
            <Text style={styles.headTitle}>Comments</Text>
            <Pressable style={styles.close} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={18} color="#8A878D" />
            </Pressable>
          </View>
          <FlatList
            ref={listRef}
            data={comments}
            keyExtractor={(c) => c.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>No comments yet. Say hi 👋</Text>}
            renderItem={({ item }) => <CommentRow comment={item} onToggleLike={(id) => void toggleLike(id)} onReply={startReply} />}
          />
          {replyingTo ? (
            <View style={styles.replyBanner}>
              <Text style={styles.replyBannerText}>
                Replying to <Text style={styles.replyBannerName}>{firstName(replyingTo.name)}</Text>
              </Text>
              <Pressable onPress={() => setReplyingTo(null)} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color="#8A878D" />
              </Pressable>
            </View>
          ) : null}
          <View style={styles.composer}>
            {localAvatarUrl ? (
              <Image source={{ uri: localAvatarUrl }} style={styles.composerAvatar} />
            ) : (
              <View style={[styles.composerAvatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{initial(localDisplayName)}</Text>
              </View>
            )}
            <TextInput
              ref={inputRef}
              value={draft}
              onChangeText={setDraft}
              placeholder={replyingTo ? `Reply to ${firstName(replyingTo.name)}…` : "Add a comment…"}
              placeholderTextColor="#B0ACB4"
              style={styles.input}
              maxLength={500}
              onSubmitEditing={() => void submit()}
              returnKeyType="send"
            />
            <Pressable style={[styles.send, (!draft.trim() || sending) && styles.sendDisabled]} disabled={!draft.trim() || sending} onPress={() => void submit()}>
              <Ionicons name="send" size={15} color="white" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,.4)", justifyContent: "flex-end" },
  sheet: {
    maxHeight: "70%",
    minHeight: "45%",
    backgroundColor: "white",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  head: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderColor: "#EEE",
  },
  headTitle: { fontFamily: theme.typography.bold, fontSize: 15, color: theme.colors.text },
  close: {
    position: "absolute",
    right: 12,
    top: 9,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F3F3F3",
    alignItems: "center",
    justifyContent: "center",
  },
  list: { padding: 14, flexGrow: 1 },
  empty: {
    textAlign: "center",
    marginTop: 40,
    fontFamily: theme.typography.regular,
    color: "#9A96A0",
    fontSize: 13,
  },
  row: { flexDirection: "row", gap: 10, marginBottom: 16 },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  avatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.coral },
  avatarInitial: { color: "white", fontFamily: theme.typography.bold, fontSize: 13 },
  rowBody: { flex: 1 },
  name: { fontFamily: theme.typography.bold, fontSize: 12.5, color: theme.colors.text },
  replyTag: { fontFamily: theme.typography.medium, fontSize: 10.5, color: "#9A96A0", marginTop: 1 },
  replyTagName: { color: "#7C3AED", fontFamily: theme.typography.semibold },
  text: { fontFamily: theme.typography.regular, fontSize: 14, color: "#374151", marginTop: 3, lineHeight: 19 },
  rowActions: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 5 },
  likeBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  likeText: { fontFamily: theme.typography.semibold, fontSize: 11, color: "#8A878D" },
  likeTextActive: { color: theme.colors.coral },
  replyBtn: {},
  replyBtnText: { fontFamily: theme.typography.semibold, fontSize: 11, color: "#8A878D" },
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
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderColor: "#EEE",
  },
  composerAvatar: { width: 30, height: 30, borderRadius: 15 },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E2E7",
    paddingHorizontal: 14,
    fontFamily: theme.typography.regular,
    fontSize: 13.5,
    color: theme.colors.text,
    backgroundColor: "#FAFAFB",
  },
  send: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.coral,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.45 },
});
