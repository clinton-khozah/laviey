import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { groupChatApi } from "../../api/services";
import { theme } from "../../constants/theme";
import type { GroupChat } from "../../types";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import { CreateGroupSheet } from "./CreateGroupSheet";
import { LoadingIndicator } from "../../components/common/LoadingIndicator";

const GRADIENT_VIBE = ["#7C3AED", "#EC4899", "#F97316"] as const;

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function GroupChatsScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "GroupChats">) {
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [publicGroups, setPublicGroups] = useState<GroupChat[]>([]);
  const [view, setView] = useState<"mine" | "discover">("mine");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const mine = await groupChatApi.list();
      // Older deployments may not have the public-discovery route registered yet.
      // Keep the member's own groups usable while that optional list is unavailable.
      const discoverable = await groupChatApi.discover().catch(() => []);
      setGroups(mine);
      setPublicGroups(discoverable);
    } catch (e) {
      Alert.alert("Could not load group chats", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const respond = async (group: GroupChat, action: "accept" | "decline") => {
    setBusyId(group.id);
    try {
      const updated = await groupChatApi.respond(group.id, action);
      setGroups((old) => (action === "decline" ? old.filter((g) => g.id !== group.id) : old.map((g) => (g.id === group.id ? updated : g))));
    } catch (e) {
      Alert.alert("Could not respond", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const invites = groups.filter((g) => g.myStatus === "invited");
  const joined = groups.filter((g) => g.myStatus !== "invited");
  const shown = view === "mine" ? joined : publicGroups.filter((g) => g.myStatus !== "joined");

  const join = async (group: GroupChat) => {
    setBusyId(group.id);
    try {
      const joinedGroup = await groupChatApi.join({ groupId: group.id });
      setGroups((old) => [joinedGroup, ...old.filter((item) => item.id !== group.id)]);
      setPublicGroups((old) => old.map((item) => item.id === group.id ? joinedGroup : item));
      navigation.navigate("GroupChatDetail", { groupId: joinedGroup.id, group: joinedGroup });
    } catch (e) {
      Alert.alert("Could not join group", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusyId(null);
    }
  };
  const joinWithCode = async () => {
    const code = inviteCode.trim().split("code=").pop()?.split("&")[0];
    if (!code) return;
    setBusyId("code");
    try {
      const joinedGroup = await groupChatApi.join({ inviteCode: code });
      setGroups((old) => [joinedGroup, ...old.filter((item) => item.id !== joinedGroup.id)]);
      setInviteCode("");
      navigation.navigate("GroupChatDetail", { groupId: joinedGroup.id, group: joinedGroup });
    } catch (e) {
      Alert.alert("Invalid group link", e instanceof Error ? e.message : "Check the link or code and try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View pointerEvents="none" style={styles.watermarkWrap}>
        <Image source={require("../../../assets/heart-tight.png")} style={styles.watermarkImage} contentFit="contain" />
      </View>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={navigation.goBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Group chats</Text>
          <Text style={styles.subtitle}>Connect and chat together</Text>
        </View>
        <Pressable style={styles.plus} onPress={() => setCreating(true)} hitSlop={8}>
          <View style={styles.plusInner}>
            <Ionicons name="add" size={21} color="#19171E" />
          </View>
        </Pressable>
      </View>
      <View style={styles.tabs}>
        {(["mine", "discover"] as const).map((item) => (
          <Pressable key={item} style={[styles.tab, view === item && styles.tabOn]} onPress={() => setView(item)}>
            <Ionicons name={item === "mine" ? "chatbubbles-outline" : "globe-outline"} size={15} color={view === item ? "white" : "#716B76"} />
            <Text style={[styles.tabText, view === item && styles.tabTextOn]}>{item === "mine" ? "Your groups" : "Discover"}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={shown}
        keyExtractor={(g) => g.id}
        refreshing={false}
        onRefresh={load}
        contentContainerStyle={styles.list}
        ListHeaderComponent={view === "discover" ? (
          <View style={styles.codeCard}>
            <Ionicons name="link" size={18} color="#7C3AED" />
            <TextInput value={inviteCode} onChangeText={setInviteCode} autoCapitalize="none" placeholder="Paste private group link or code" placeholderTextColor="#A7A1AB" style={styles.codeInput} />
            <Pressable disabled={!inviteCode.trim() || busyId === "code"} style={styles.codeJoin} onPress={() => void joinWithCode()}><Text style={styles.codeJoinText}>Join</Text></Pressable>
          </View>
        ) : invites.length > 0 ? (
            <View style={styles.invitesWrap}>
              <Text style={styles.sectionLabel}>Invites</Text>
              {invites.map((group) => (
                <View key={group.id} style={styles.inviteCard}>
                  <GroupAvatar group={group} size={40} />
                  <View style={styles.inviteCopy}>
                    <Text style={styles.inviteName}>{group.name}</Text>
                    <Text style={styles.inviteMeta}>{group.memberCount} members</Text>
                  </View>
                  <Pressable
                    style={styles.declineBtn}
                    disabled={busyId === group.id}
                    onPress={() => void respond(group, "decline")}
                  >
                    <Ionicons name="close" size={16} color="#8D8791" />
                  </Pressable>
                  <Pressable
                    style={styles.acceptBtn}
                    disabled={busyId === group.id}
                    onPress={() => void respond(group, "accept")}
                  >
                    <Ionicons name="checkmark" size={16} color="white" />
                  </Pressable>
                </View>
              ))}
              <Text style={styles.sectionLabel}>Your groups</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable style={styles.groupRow} onPress={() => navigation.navigate("GroupChatDetail", { groupId: item.id, group: item })}>
            <GroupAvatar group={item} size={50} />
            <View style={styles.groupCopy}>
              <Text style={styles.groupName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.groupMeta} numberOfLines={1}>
                {item.memberCount} {item.memberCount === 1 ? "member" : "members"}
                {item.description ? ` · ${item.description}` : ""}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#B0ACB4" />
            {view === "discover" ? (
              <Pressable
                style={[styles.joinBtn, (item.isFull || busyId === item.id) && styles.joinBtnDisabled]}
                disabled={item.isFull || busyId === item.id}
                onPress={(event) => {
                  event.stopPropagation();
                  void join(item);
                }}
              >
                <Text style={styles.joinText}>{item.isFull ? "Full" : busyId === item.id ? "Joining…" : "Join"}</Text>
              </Pressable>
            ) : null}
          </Pressable>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={34} color="#7C3AED" />
              </View>
              <Text style={styles.emptyTitle}>{view === "mine" ? "No group chats yet" : "No public groups yet"}</Text>
              <Text style={styles.emptyCopy}>{view === "mine" ? "Create one and invite some matches to join." : "Public groups you can join will appear here."}</Text>
              {view === "mine" ? (
                <Pressable style={styles.emptyCta} onPress={() => setCreating(true)}>
                  <Text style={styles.emptyCtaText}>Create a group</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null
        }
      />

      {loading ? (
        <View style={styles.loadingOverlay} pointerEvents="auto">
          <LoadingIndicator label="Loading groups…" />
        </View>
      ) : null}

      <CreateGroupSheet
        visible={creating}
        onClose={() => setCreating(false)}
        onCreated={(group) => {
          setCreating(false);
          setGroups((old) => [group, ...old]);
          navigation.navigate("GroupChatDetail", { groupId: group.id, group });
        }}
      />
    </SafeAreaView>
  );
}

function GroupAvatar({ group, size }: { group: GroupChat; size: number }) {
  if (group.coverImage) {
    return <Image source={{ uri: group.coverImage }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />;
  }
  return (
    <LinearGradient colors={GRADIENT_VIBE} style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "white", fontFamily: theme.typography.bold, fontSize: size * 0.4 }}>{initial(group.name)}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  watermarkWrap: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  watermarkImage: { width: 190, height: 190, opacity: 0.055 },
  header: {
    height: 68,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  back: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "white" },
  headerCopy: { flex: 1 },
  title: { fontFamily: theme.typography.bold, fontSize: 20, color: theme.colors.text },
  subtitle: { marginTop: 1, fontFamily: theme.typography.regular, fontSize: 10.5, color: "#938D98" },
  plus: { borderRadius: 20 },
  plusInner: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DDDCE1", shadowColor: "#1D1922", shadowOpacity: 0.1, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  list: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 90, flexGrow: 1 },
  tabs: { flexDirection: "row", marginHorizontal: 16, padding: 4, borderRadius: 18, backgroundColor: "#ECE9F0" },
  tab: { flex: 1, height: 38, borderRadius: 13, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" },
  tabOn: { backgroundColor: "#211A28" },
  tabText: { fontFamily: theme.typography.semibold, fontSize: 12, color: "#716B76" },
  tabTextOn: { color: "white" },
  codeCard: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, marginBottom: 14, borderRadius: 16, backgroundColor: "#F7F2FD", borderWidth: 1, borderColor: "#E8DDF7" },
  codeInput: { flex: 1, fontFamily: theme.typography.regular, fontSize: 12, color: theme.colors.text },
  codeJoin: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 12, backgroundColor: "#7C3AED" },
  codeJoinText: { color: "white", fontFamily: theme.typography.bold, fontSize: 11 },
  invitesWrap: { marginBottom: 4 },
  sectionLabel: { fontFamily: theme.typography.bold, fontSize: 12, color: "#9A96A0", marginBottom: 8, marginTop: 4 },
  inviteCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "white",
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EDEBEF",
  },
  inviteCopy: { flex: 1 },
  inviteName: { fontFamily: theme.typography.bold, fontSize: 13.5, color: theme.colors.text },
  inviteMeta: { fontFamily: theme.typography.regular, fontSize: 11, color: "#9A96A0", marginTop: 1 },
  declineBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F2F1F3", alignItems: "center", justifyContent: "center" },
  acceptBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#20C46A", alignItems: "center", justifyContent: "center" },
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "white",
    minHeight: 78,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EDEBEF",
  },
  groupCopy: { flex: 1 },
  groupName: { fontFamily: theme.typography.semibold, fontSize: 15, color: theme.colors.text },
  groupMeta: { fontFamily: theme.typography.regular, fontSize: 11.5, color: "#9A96A0", marginTop: 2 },
  joinBtn: { backgroundColor: "#7C3AED", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14 },
  joinBtnDisabled: { opacity: 0.45 },
  joinText: { color: "white", fontFamily: theme.typography.bold, fontSize: 11 },
  loadingOverlay: { position: "absolute", top: 112, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(248,248,252,.94)", zIndex: 20 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingBottom: 50 },
  emptyIcon: { width: 76, height: 76, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "#F3EAFE", borderWidth: 1, borderColor: "#E2D1F8" },
  emptyTitle: { marginTop: 22, fontFamily: theme.typography.bold, fontSize: 17, color: theme.colors.text },
  emptyCopy: { marginTop: 7, fontFamily: theme.typography.regular, fontSize: 12.5, lineHeight: 19, color: "#8D8791", textAlign: "center" },
  emptyCta: { marginTop: 20, borderRadius: 24, paddingHorizontal: 24, paddingVertical: 13, backgroundColor: "#17131D" },
  emptyCtaText: { color: "white", fontFamily: theme.typography.bold, fontSize: 13 },
});
