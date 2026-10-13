import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { theme } from "../../../constants/theme";
import type { Profile } from "../../../types";
import { ChatEmptyStart } from "./ChatEmptyStart";

export function MessageLikesPanel({
  profiles,
  likedBackIds,
  onLikeBack,
  onText,
  onStart,
}: {
  profiles: Profile[];
  likedBackIds: Set<string>;
  onLikeBack(profile: Profile): Promise<void>;
  onText(profile: Profile): Promise<void>;
  onStart(): void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = async (profile: Profile, action: "like" | "text") => {
    setBusyId(profile.id);
    try {
      if (action === "text" || likedBackIds.has(profile.id)) await onText(profile);
      else await onLikeBack(profile);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <FlatList
      data={profiles}
      keyExtractor={(item) => item.id}
      contentContainerStyle={profiles.length ? styles.list : styles.emptyWrap}
      ListEmptyComponent={
        <ChatEmptyStart
          icon="heart-outline"
          title="No likes yet"
          copy="Like people on For You. When they like you back, you can start a chat from here."
          action="Find people"
          onStart={onStart}
        />
      }
      renderItem={({ item }) => {
        const likedBack = likedBackIds.has(item.id);
        return (
          <View style={styles.row}>
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
            <View style={styles.copy}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
                {item.age ? `, ${item.age}` : ""}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                Liked you
              </Text>
            </View>
            <Pressable
              style={[styles.button, likedBack && styles.buttonText]}
              disabled={busyId === item.id}
              onPress={() => void run(item, likedBack ? "text" : "like")}
            >
              {busyId === item.id ? (
                <ActivityIndicator size="small" color={likedBack ? "#171720" : "#FFFFFF"} />
              ) : (
                <Text style={[styles.buttonLabel, likedBack && styles.buttonLabelText]}>
                  {likedBack ? "Text" : "Like back"}
                </Text>
              )}
            </Pressable>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: 90 },
  emptyWrap: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingTop: 48 },
  empty: {
    fontFamily: theme.typography.regular,
    fontSize: 14,
    lineHeight: 20,
    color: "#8C8798",
    textAlign: "center",
  },
  row: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#F3F2F5" },
  copy: { flex: 1 },
  name: { fontFamily: theme.typography.semibold, fontSize: 16, color: "#171720" },
  meta: { marginTop: 2, fontFamily: theme.typography.regular, fontSize: 13, color: "#8C8798" },
  button: {
    minWidth: 96,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#171720",
  },
  buttonText: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8D8E0",
  },
  buttonLabel: { fontFamily: theme.typography.semibold, fontSize: 13, color: "#FFFFFF" },
  buttonLabelText: { color: "#171720" },
});
