import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../constants/theme";
import type { Conversation, Profile } from "../../../types";

type StripItem =
  | { kind: "liked"; id: string; name: string; avatar: string; profile: Profile }
  | { kind: "chat"; id: string; name: string; avatar: string; isOnline: boolean; conversation: Conversation };

export function MatchAvatarStrip({
  likedProfiles,
  conversations,
  onOpenLikedProfile,
  onOpenChat,
}: {
  likedProfiles: Profile[];
  conversations: Conversation[];
  onOpenLikedProfile(profile: Profile): void;
  onOpenChat(conversation: Conversation): void;
}) {
  const conversationParticipantIds = new Set(conversations.map((c) => c.participantProfileId));
  const items: StripItem[] = [
    ...likedProfiles
      .filter((p) => !conversationParticipantIds.has(p.id))
      .map((p): StripItem => ({ kind: "liked", id: p.id, name: p.name, avatar: p.avatar, profile: p })),
    ...[...conversations]
      .sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0))
      .map((c): StripItem => ({ kind: "chat", id: c.id, name: c.participantName, avatar: c.participantAvatar, isOnline: c.isOnline, conversation: c })),
  ];

  if (!items.length) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.strip}>
      {items.map((item) => (
        <Pressable
          key={`${item.kind}-${item.id}`}
          style={styles.item}
          onPress={() => (item.kind === "liked" ? onOpenLikedProfile(item.profile) : onOpenChat(item.conversation))}
        >
          <View style={[styles.ring, item.kind === "liked" && styles.ringLiked]}>
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
            {item.kind === "liked" ? (
              <View style={styles.heartBadge}>
                <Ionicons name="heart" size={10} color="white" />
              </View>
            ) : item.isOnline ? (
              <View style={styles.onlineDot} />
            ) : null}
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {item.kind === "liked" ? "Likes you" : item.name.split(" ")[0]}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  strip: { paddingHorizontal: 20, paddingBottom: 2, gap: 14 },
  item: { alignItems: "center", width: 62 },
  ring: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: "#E2E0E5",
    alignItems: "center",
    justifyContent: "center",
  },
  ringLiked: { borderColor: "#FF5271" },
  avatar: { width: 54, height: 54, borderRadius: 27 },
  heartBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FF5271",
    borderWidth: 2,
    borderColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  onlineDot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: "#25D375",
    borderWidth: 2,
    borderColor: "white",
  },
  name: {
    marginTop: 5,
    fontFamily: theme.typography.medium,
    fontSize: 10.5,
    color: "#4B4650",
  },
});
