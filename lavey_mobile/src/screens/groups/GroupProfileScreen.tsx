import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { groupChatApi, subscriptionApi } from "../../api/services";
import { theme } from "../../constants/theme";
import { useAccessMode } from "../../context/AccessModeContext";
import { PlatinumModal } from "../../components/subscription/PlatinumModal";
import type { RootStackParamList } from "../../navigation/AppNavigator";

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function GroupProfileScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, "GroupProfile">) {
  const { group, myUserId } = route.params;
  const { allFree } = useAccessMode();
  const [openingMemberId, setOpeningMemberId] = useState<string | null>(null);
  const [platinumOpen, setPlatinumOpen] = useState(false);

  const joined = group.members.filter((member) => member.status === "joined");

  const messageMember = async (userId: string) => {
    setOpeningMemberId(userId);
    try {
      const status = allFree ? null : await subscriptionApi.status();
      if (!allFree && !status?.isPremium) {
        setPlatinumOpen(true);
        return;
      }
      const result = await groupChatApi.messageMember(group.id, userId);
      navigation.navigate("ChatDetail", { conversationId: result.conversationId });
    } catch (e) {
      Alert.alert("Could not open chat", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setOpeningMemberId(null);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={navigation.goBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Group profile
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          {group.coverImage ? (
            <Image source={{ uri: group.coverImage }} style={styles.heroImage} />
          ) : (
            <LinearGradient colors={["#B84DE8", "#FF3F79"]} style={styles.heroImage} />
          )}
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.6)"]} style={styles.heroOverlay} />
          <View style={styles.heroCopy}>
            <Text style={styles.heroName} numberOfLines={2}>{group.name}</Text>
            <View style={styles.heroMetaRow}>
              <Ionicons name={group.visibility === "public" ? "globe-outline" : "lock-closed-outline"} size={13} color="white" />
              <Text style={styles.heroMetaText}>
                {group.visibility === "public" ? "Public group" : "Private group"} · {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
              </Text>
            </View>
          </View>
        </View>

        {group.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>About</Text>
            <Text style={styles.description}>{group.description}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{group.memberCount}</Text>
              <Text style={styles.statLabel}>Joined</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{group.isFull ? "Full" : group.spotsRemaining}</Text>
              <Text style={styles.statLabel}>{group.isFull ? "Group" : "Spots left"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>People who joined</Text>
          <Text style={styles.sectionHint}>Tap someone to view their profile. Platinum members can start a private chat.</Text>
          {joined.map((member) => (
            <View key={member.userId} style={styles.memberRow}>
              <Pressable
                style={styles.memberTouchable}
                onPress={() =>
                  member.userId !== myUserId &&
                  navigation.navigate("MemberProfile", { userId: member.userId, groupId: group.id, name: member.name, avatar: member.avatar })
                }
                disabled={member.userId === myUserId}
              >
                {member.avatar ? (
                  <Image source={{ uri: member.avatar }} style={styles.memberAvatar} />
                ) : (
                  <View style={[styles.memberAvatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>{initial(member.name)}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberRole}>{member.role === "owner" ? "Group host" : "Member"}</Text>
                </View>
              </Pressable>
              {member.userId !== myUserId ? (
                <Pressable
                  style={styles.memberMessage}
                  disabled={openingMemberId === member.userId}
                  onPress={() => void messageMember(member.userId)}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color="white" />
                  <Text style={styles.memberMessageText}>{openingMemberId === member.userId ? "Opening…" : "Message"}</Text>
                </Pressable>
              ) : (
                <Text style={styles.youLabel}>You</Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {!allFree ? <PlatinumModal visible={platinumOpen} close={() => setPlatinumOpen(false)} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    height: 54,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#EDEBEF",
    backgroundColor: "white",
  },
  headerBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: theme.typography.bold, fontSize: 15, color: theme.colors.text },
  scroll: { paddingBottom: 40 },
  hero: { height: 200, width: "100%" },
  heroImage: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  heroOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  heroCopy: { position: "absolute", left: 16, right: 16, bottom: 14 },
  heroName: { fontFamily: theme.typography.bold, fontSize: 21, color: "white" },
  heroMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  heroMetaText: { fontFamily: theme.typography.medium, fontSize: 12, color: "white" },
  section: { paddingHorizontal: 18, marginTop: 18 },
  sectionLabel: { fontFamily: theme.typography.bold, fontSize: 13.5, color: theme.colors.text, marginBottom: 6 },
  sectionHint: { fontFamily: theme.typography.regular, fontSize: 12, color: "#89838E", lineHeight: 18, marginBottom: 12 },
  description: { fontFamily: theme.typography.regular, fontSize: 13.5, color: "#4B4750", lineHeight: 20 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#EDEBEF", alignItems: "center", paddingVertical: 14 },
  statValue: { fontFamily: theme.typography.bold, fontSize: 18, color: theme.colors.text },
  statLabel: { fontFamily: theme.typography.regular, fontSize: 11, color: "#9A96A0", marginTop: 2 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 10, borderBottomWidth: 1, borderColor: "#F0EDF2" },
  memberTouchable: { flex: 1, flexDirection: "row", alignItems: "center", gap: 11 },
  memberAvatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "#7C3AED" },
  avatarInitial: { color: "white", fontFamily: theme.typography.bold, fontSize: 15 },
  memberName: { fontFamily: theme.typography.bold, fontSize: 13.5, color: theme.colors.text },
  memberRole: { fontFamily: theme.typography.regular, fontSize: 11, color: "#918B96", marginTop: 2 },
  memberMessage: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#7C3AED", borderRadius: 16, paddingHorizontal: 11, paddingVertical: 8 },
  memberMessageText: { fontFamily: theme.typography.bold, fontSize: 10.5, color: "white" },
  youLabel: { fontFamily: theme.typography.semibold, fontSize: 11, color: "#7C3AED", backgroundColor: "#F2EAFE", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
});
