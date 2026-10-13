import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../constants/theme";
import { hasCustomProfileAvatar } from "../../../utils/discoverProfileReady";
import type { NotificationEvent } from "../../../types";

function messageCopy(item: NotificationEvent): string {
  const text = item.text?.trim();
  const body = item.body?.trim();
  if (text && body && body !== text) return body.length > text.length ? body : text;
  return text || body || item.title?.trim() || "You have a new message.";
}

function senderName(item: NotificationEvent): string {
  const name = item.actorName?.trim();
  return name && name !== "Someone" ? name : "Lavey";
}

function kindLabel(item: NotificationEvent): string {
  switch (item.kind) {
    case "post_like":
      return "Liked your post";
    case "like":
      return "Liked you";
    case "crush":
      return "Sent you a crush";
    case "match":
      return "It's a match";
    case "date_invite":
      return "Date invite";
    case "profile_view":
      return "Viewed your profile";
    default:
      return item.title?.trim() || "Notification";
  }
}

export function NotificationInbox({
  notifications,
  likedBackIds,
  onLikeBack,
  onLikePost,
  onOpenChat,
}: {
  notifications: NotificationEvent[];
  likedBackIds: Set<string>;
  onLikeBack(actorUserId: string): void;
  onLikePost(postId: string): void;
  onOpenChat(actorUserId: string): void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const open = notifications.find((item) => item.id === openId) ?? null;

  const likePost = (postId: string) => {
    setLikedPostIds((prev) => new Set(prev).add(postId));
    onLikePost(postId);
  };

  if (open) {
    const name = senderName(open);
    const likedBack = open.actorUserId ? likedBackIds.has(open.actorUserId) : false;
    const showChat = open.kind === "match" || likedBack;
    const postLiked = open.postId ? likedPostIds.has(open.postId) : false;
    const showPostLike = open.kind === "post_like" && Boolean(open.postId);
    const showLikeBack = Boolean(open.actorUserId) && (open.kind === "like" || open.kind === "crush" || open.kind === "post_like");
    return (
      <View style={styles.reader}>
        <ScrollView contentContainerStyle={styles.readerBody} showsVerticalScrollIndicator={false}>
          <View style={styles.personCard}>
            <SenderAvatar item={open} size={92} />
            <Text style={styles.personName}>{name}</Text>
            <Text style={styles.kindLabel}>{kindLabel(open)}</Text>
            <Text style={styles.personCopy}>{messageCopy(open)}</Text>
            <Text style={styles.sentAt}>{open.sentAt}</Text>
            <View style={styles.actionRow}>
              {showPostLike && open.postId ? (
                <Pressable
                  style={[styles.iconAction, postLiked && styles.iconActionDone]}
                  onPress={() => likePost(open.postId!)}
                  accessibilityLabel="Like their post"
                >
                  <Ionicons name={postLiked ? "heart" : "heart-outline"} size={20} color={postLiked ? "#FFFFFF" : "#FF4B6E"} />
                  <Text style={[styles.iconActionText, postLiked && styles.iconActionTextOn]}>{postLiked ? "Liked" : "Like"}</Text>
                </Pressable>
              ) : null}
              {showChat && open.actorUserId ? (
                <Pressable style={styles.iconActionSolid} onPress={() => onOpenChat(open.actorUserId!)} accessibilityLabel="Chat now">
                  <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" />
                  <Text style={styles.iconActionTextOn}>Chat now</Text>
                </Pressable>
              ) : showLikeBack && open.actorUserId ? (
                <Pressable style={styles.iconActionSolid} onPress={() => onLikeBack(open.actorUserId!)} accessibilityLabel="Like back">
                  <Ionicons name="heart" size={18} color="#FFFFFF" />
                  <Text style={styles.iconActionTextOn}>Like back</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!notifications.length) {
    return <Text style={styles.empty}>No messages yet.</Text>;
  }

  return (
    <ScrollView style={styles.fill} showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
      {notifications.map((item) => (
        <Pressable key={item.id} style={styles.row} onPress={() => setOpenId(item.id)}>
          <SenderAvatar item={item} size={52} />
          <View style={styles.copy}>
            <View style={styles.rowTop}>
              <Text style={[styles.name, !item.read && styles.nameUnread]} numberOfLines={1}>
                {senderName(item)}
              </Text>
              <Text style={styles.time}>{item.sentAt}</Text>
            </View>
            <Text style={[styles.preview, !item.read && styles.previewUnread]} numberOfLines={2}>
              {messageCopy(item)}
            </Text>
          </View>
          {item.kind === "post_like" && item.actorUserId ? (
            <View style={styles.rowActions}>
              {item.postId ? (
                <Pressable
                  style={styles.rowIcon}
                  onPress={() => likePost(item.postId!)}
                  accessibilityLabel="Like their post"
                >
                  <Ionicons name={likedPostIds.has(item.postId) ? "heart" : "heart-outline"} size={20} color="#FF4B6E" />
                </Pressable>
              ) : null}
              <Pressable
                style={styles.rowIconFilled}
                onPress={() => (likedBackIds.has(item.actorUserId!) ? onOpenChat(item.actorUserId!) : onLikeBack(item.actorUserId!))}
                accessibilityLabel={likedBackIds.has(item.actorUserId) ? "Chat now" : "Like back"}
              >
                <Ionicons name={likedBackIds.has(item.actorUserId) ? "chatbubble-ellipses" : "heart"} size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : !item.read ? (
            <View style={styles.unread} />
          ) : null}
        </Pressable>
      ))}
    </ScrollView>
  );
}

function SenderAvatar({ item, size }: { item: NotificationEvent; size: number }) {
  const verified = item.kind === "verified" || /identity is verified|you're verified/i.test(messageCopy(item));
  if (verified) {
    const tick = Math.max(18, Math.round(size * 0.34));
    return (
      <View style={{ width: size, height: size }}>
        <View style={[styles.logoAvatar, { width: size, height: size, borderRadius: size / 2 }]}>
          <Image source={require("../../../../assets/heart-tight.png")} style={{ width: size * 0.62, height: size * 0.62 }} contentFit="contain" />
        </View>
        <View style={[styles.verifiedTick, { width: tick, height: tick, borderRadius: tick / 2, right: -1, bottom: -1 }]}>
          <Ionicons name="checkmark" size={tick * 0.62} color="#FFFFFF" />
        </View>
      </View>
    );
  }
  if (hasCustomProfileAvatar(item.actorAvatar)) {
    return <Image source={{ uri: item.actorAvatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  const letter = senderName(item).slice(0, 1).toUpperCase();
  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.fallbackLetter, { fontSize: size * 0.36 }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: { paddingBottom: 28 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E6E4E8",
  },
  copy: { flex: 1, minWidth: 0 },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  name: {
    flex: 1,
    fontFamily: theme.typography.semibold,
    fontSize: 16,
    color: "#171720",
  },
  nameUnread: { fontFamily: theme.typography.bold },
  time: {
    fontFamily: theme.typography.regular,
    fontSize: 12,
    color: "#8C8798",
  },
  preview: {
    marginTop: 3,
    fontFamily: theme.typography.regular,
    fontSize: 14,
    lineHeight: 19,
    color: "#6E6978",
  },
  previewUnread: { color: "#171720" },
  unread: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#171720",
  },
  empty: {
    textAlign: "center",
    marginTop: 48,
    paddingHorizontal: 28,
    fontFamily: theme.typography.regular,
    fontSize: 14,
    lineHeight: 21,
    color: "#8C8798",
  },
  reader: { flex: 1, backgroundColor: "#FAFAFC" },
  readerHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E6E4E8",
    backgroundColor: "#FFFFFF",
  },
  readerName: {
    flex: 1,
    fontFamily: theme.typography.semibold,
    fontSize: 17,
    color: "#171720",
  },
  readerBody: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 32,
  },
  bubble: {
    alignSelf: "flex-start",
    maxWidth: "88%",
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E4E0E6",
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bubbleText: {
    fontFamily: theme.typography.regular,
    fontSize: 16,
    lineHeight: 23,
    color: "#171720",
  },
  sentAt: {
    marginTop: 8,
    marginLeft: 4,
    fontFamily: theme.typography.regular,
    fontSize: 12,
    color: "#8C8798",
  },
  personCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E6E4E8",
  },
  personName: {
    marginTop: 14,
    fontFamily: theme.typography.bold,
    fontSize: 22,
    color: "#171720",
    textAlign: "center",
  },
  noticeLogo: {
    width: 72,
    height: 72,
    marginTop: 16,
  },
  kindLabel: {
    marginTop: 4,
    fontFamily: theme.typography.semibold,
    fontSize: 14,
    color: "#FF4B6E",
  },
  personCopy: {
    marginTop: 12,
    fontFamily: theme.typography.regular,
    fontSize: 15,
    lineHeight: 22,
    color: "#3C3842",
    textAlign: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  iconAction: {
    minWidth: 116,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF0F3",
    borderWidth: 1,
    borderColor: "#FFD0DA",
  },
  iconActionDone: {
    backgroundColor: "#FF4B6E",
    borderColor: "#FF4B6E",
  },
  iconActionSolid: {
    minWidth: 132,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FF4B6E",
  },
  iconActionText: {
    fontFamily: theme.typography.semibold,
    fontSize: 14,
    color: "#FF4B6E",
  },
  iconActionTextOn: {
    fontFamily: theme.typography.semibold,
    fontSize: 14,
    color: "#FFFFFF",
  },
  rowActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF0F3",
  },
  rowIconFilled: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF4B6E",
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E2D3F7",
  },
  logoAvatar: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111111",
  },
  verifiedTick: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1877F2",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  fallbackLetter: {
    fontFamily: theme.typography.semibold,
    color: "#171720",
  },
});
