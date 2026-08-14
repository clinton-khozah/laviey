import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { settingsApi } from "../../api/services";
import { theme } from "../../constants/theme";
import type { RootStackParamList } from "../../navigation/AppNavigator";

type BlockedUser = { userId: string; displayName: string; avatarUrl: string };

export function BlockedUsersScreen(_props: NativeStackScreenProps<RootStackParamList, "BlockedUsers">) {
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await settingsApi.blocked());
    } catch (e) {
      Alert.alert("Couldn't load blocked users", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unblock = useCallback(async (user: BlockedUser) => {
    setUnblockingId(user.userId);
    try {
      await settingsApi.unblock(user.userId);
      setUsers((prev) => prev.filter((u) => u.userId !== user.userId));
    } catch (e) {
      Alert.alert("Couldn't unblock", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setUnblockingId(null);
    }
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["bottom"]}>
        <ActivityIndicator color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["bottom"]}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={users.length ? styles.list : styles.listEmpty}
        renderItem={({ item }) => (
          <View style={styles.row}>
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]} />
            )}
            <Text style={styles.name} numberOfLines={1}>{item.displayName}</Text>
            <Pressable style={styles.unblockBtn} onPress={() => void unblock(item)} disabled={unblockingId === item.userId}>
              {unblockingId === item.userId ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Text style={styles.unblockText}>Unblock</Text>
              )}
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.empty}>You haven't blocked anyone.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.background },
  list: { padding: 16 },
  listEmpty: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 11,
    marginBottom: 10,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { backgroundColor: theme.colors.surfaceMuted },
  name: { flex: 1, fontFamily: theme.typography.semibold, fontSize: 14, color: theme.colors.text },
  unblockBtn: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
  },
  unblockText: { fontFamily: theme.typography.semibold, fontSize: 12, color: theme.colors.primary },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: {
    textAlign: "center",
    fontFamily: theme.typography.regular,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
});
