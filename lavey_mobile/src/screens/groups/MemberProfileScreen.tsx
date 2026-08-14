import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { discoverApi, groupChatApi, subscriptionApi } from "../../api/services";
import { theme } from "../../constants/theme";
import { useAccessMode } from "../../context/AccessModeContext";
import { PlatinumModal } from "../../components/subscription/PlatinumModal";
import type { Profile } from "../../types";
import type { RootStackParamList } from "../../navigation/AppNavigator";

export function MemberProfileScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, "MemberProfile">) {
  const { userId, groupId, name, avatar } = route.params;
  const { allFree } = useAccessMode();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [messaging, setMessaging] = useState(false);
  const [platinumOpen, setPlatinumOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    discoverApi
      .profile(userId)
      .then((p) => { if (!cancelled) setProfile(p); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  const messageMember = async () => {
    setMessaging(true);
    try {
      const status = allFree ? null : await subscriptionApi.status();
      if (!allFree && !status?.isPremium) {
        setPlatinumOpen(true);
        return;
      }
      const result = await groupChatApi.messageMember(groupId, userId);
      navigation.navigate("ChatDetail", { conversationId: result.conversationId });
    } catch (e) {
      Alert.alert("Could not open chat", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setMessaging(false);
    }
  };

  const displayName = profile?.name ?? name ?? "Member";
  const displayAvatar = profile?.avatar ?? avatar ?? "";

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={navigation.goBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{displayName}</Text>
        <View style={styles.headerBtn} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={theme.colors.coral} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.hero}>
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.heroImage} />
            ) : (
              <LinearGradient colors={["#B84DE8", "#FF3F79"]} style={styles.heroImage} />
            )}
            <LinearGradient colors={["transparent", "rgba(0,0,0,0.65)"]} style={styles.heroOverlay} />
            <View style={styles.heroCopy}>
              <View style={styles.heroNameRow}>
                <Text style={styles.heroName} numberOfLines={1}>
                  {displayName}{profile?.age ? `, ${profile.age}` : ""}
                </Text>
                {profile?.verified ? <Ionicons name="checkmark-circle" size={19} color="#4EA8FF" /> : null}
              </View>
              {profile?.locationName ? (
                <View style={styles.heroMetaRow}>
                  <Ionicons name="location-outline" size={13} color="white" />
                  <Text style={styles.heroMetaText}>{profile.locationName}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {profile?.bio ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>About</Text>
              <Text style={styles.bio}>{profile.bio}</Text>
            </View>
          ) : null}

          {profile?.interests?.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Interests</Text>
              <View style={styles.chipRow}>
                {profile.interests.map((interest) => (
                  <View key={interest} style={styles.chip}>
                    <Text style={styles.chipText}>{interest}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {profile?.occupation || profile?.school || profile?.hometown ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Details</Text>
              {profile.occupation ? <DetailRow icon="briefcase-outline" text={profile.company ? `${profile.occupation} at ${profile.company}` : profile.occupation} /> : null}
              {profile.school ? <DetailRow icon="school-outline" text={profile.degree ? `${profile.degree}, ${profile.school}` : profile.school} /> : null}
              {profile.hometown ? <DetailRow icon="home-outline" text={`From ${profile.hometown}`} /> : null}
            </View>
          ) : null}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Pressable style={styles.messageBtn} disabled={messaging} onPress={() => void messageMember()}>
          <Ionicons name="chatbubble-ellipses-outline" size={17} color="white" />
          <Text style={styles.messageBtnText}>{messaging ? "Opening…" : "Message"}</Text>
        </Pressable>
      </View>

      {!allFree ? <PlatinumModal visible={platinumOpen} close={() => setPlatinumOpen(false)} /> : null}
    </SafeAreaView>
  );
}

function DetailRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={16} color="#7C3AED" />
      <Text style={styles.detailText}>{text}</Text>
    </View>
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
  headerTitle: { flex: 1, textAlign: "center", fontFamily: theme.typography.bold, fontSize: 15, color: theme.colors.text },
  scroll: { paddingBottom: 20 },
  hero: { height: 320, width: "100%" },
  heroImage: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  heroOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  heroCopy: { position: "absolute", left: 16, right: 16, bottom: 16 },
  heroNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  heroName: { fontFamily: theme.typography.bold, fontSize: 23, color: "white" },
  heroMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  heroMetaText: { fontFamily: theme.typography.medium, fontSize: 12, color: "white" },
  section: { paddingHorizontal: 18, marginTop: 18 },
  sectionLabel: { fontFamily: theme.typography.bold, fontSize: 13.5, color: theme.colors.text, marginBottom: 8 },
  bio: { fontFamily: theme.typography.regular, fontSize: 13.5, color: "#4B4750", lineHeight: 20 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: "#F2EAFE", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontFamily: theme.typography.semibold, fontSize: 12, color: "#7C3AED" },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  detailText: { fontFamily: theme.typography.regular, fontSize: 13, color: "#4B4750" },
  footer: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    paddingHorizontal: 18, paddingTop: 12, paddingBottom: 28,
    backgroundColor: "white", borderTopWidth: 1, borderColor: "#EDEBEF",
  },
  messageBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    height: 48, borderRadius: 24, backgroundColor: theme.colors.coral,
  },
  messageBtnText: { fontFamily: theme.typography.bold, fontSize: 14.5, color: "white" },
});
