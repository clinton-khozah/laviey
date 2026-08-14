import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { chatApi, discoverApi } from "../../api/services";
import { theme } from "../../constants/theme";
import type { Profile } from "../../types";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import { ProfileFeedModal } from "../home/components/ProfileFeedModal";

type OptionId =
  | "profile"
  | "pin"
  | "mute"
  | "unread"
  | "archive"
  | "report"
  | "block"
  | "unmatch"
  | "delete";

const OPTIONS: {
  id: OptionId;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  danger?: boolean;
  warn?: boolean;
}[] = [
  {
    id: "profile",
    icon: "person-circle-outline",
    title: "View profile",
    subtitle: "See photos, bio, and vibes",
  },
  {
    id: "pin",
    icon: "pin-outline",
    title: "Pin chat",
    subtitle: "Keep this conversation at the top",
  },
  {
    id: "mute",
    icon: "notifications-off-outline",
    title: "Mute notifications",
    subtitle: "Silence alerts from this chat",
  },
  {
    id: "unread",
    icon: "mail-unread-outline",
    title: "Mark as unread",
    subtitle: "Move it back to your unread list",
  },
  {
    id: "archive",
    icon: "archive-outline",
    title: "Archive chat",
    subtitle: "Hide it without deleting messages",
  },
  {
    id: "report",
    icon: "alert-circle-outline",
    title: "Report",
    subtitle: "Flag inappropriate behavior to Lavey",
    warn: true,
  },
  {
    id: "block",
    icon: "remove-circle-outline",
    title: "Block",
    subtitle: "Stop them from contacting you",
    danger: true,
  },
  {
    id: "unmatch",
    icon: "people-outline",
    title: "Unmatch",
    subtitle: "Remove this match from your inbox",
    danger: true,
  },
  {
    id: "delete",
    icon: "trash-outline",
    title: "Delete chat",
    subtitle: "Remove this conversation from your inbox",
    danger: true,
  },
];

export function ChatOptionsScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, "ChatOptions">) {
  const { conversationId, conversation } = route.params;
  const [previewProfile, setPreviewProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const name = conversation?.participantName || "Conversation";

  const openProfile = async () => {
    if (!conversation?.participantProfileId || profileLoading) return;
    setProfileLoading(true);
    try {
      setPreviewProfile(await discoverApi.profile(conversation.participantProfileId));
    } catch (e) {
      Alert.alert(
        "Could not load profile",
        e instanceof Error ? e.message : "Please try again.",
      );
    } finally {
      setProfileLoading(false);
    }
  };

  const onAction = (id: OptionId) => {
    if (id === "profile") {
      void openProfile();
      return;
    }
    if (id === "pin") {
      void chatApi.pin(conversationId, true).then(() => Alert.alert("Chat pinned"));
      return;
    }
    if (id === "delete") {
      Alert.alert("Delete chat?", "This removes the conversation from your inbox.", [
        { text: "Cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            void chatApi.deleteConversation(conversationId).then(() => {
              navigation.pop(2);
            }),
        },
      ]);
      return;
    }
    if (id === "block" || id === "report" || id === "unmatch") {
      Alert.alert(
        `${id[0].toUpperCase()}${id.slice(1)} ${name}?`,
        "This safety action will be sent to Lavey.",
        [{ text: "Cancel" }, { text: "Continue", style: "destructive" }],
      );
      return;
    }
    Alert.alert("Updated", "Your conversation setting was updated.");
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityLabel="Close chat options"
        >
          <Ionicons name="chevron-back" size={24} color="#101018" />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Chat options</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {name}
          </Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {conversation ? (
        <View style={styles.intro}>
          <Image source={{ uri: conversation.participantAvatar }} style={styles.avatar} />
          <View style={styles.introCopy}>
            <Text style={styles.introName} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.introMeta} numberOfLines={1}>
              {conversation.isAiCompanion
                ? "AI companion"
                : conversation.isOnline
                  ? "Online now"
                  : conversation.lastSeenLabel || "Last seen recently"}
            </Text>
          </View>
        </View>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {OPTIONS.map((item) => (
          <OptionRow
            key={item.id}
            icon={item.icon}
            title={item.title}
            subtitle={item.subtitle}
            danger={item.danger}
            warn={item.warn}
            onPress={() => onAction(item.id)}
          />
        ))}
      </ScrollView>

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

function OptionRow({
  icon,
  title,
  subtitle,
  onPress,
  warn,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress(): void;
  warn?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
      onPress={onPress}
    >
      <View
        style={[
          styles.optionIcon,
          warn && styles.optionIconWarn,
          danger && styles.optionIconDanger,
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={danger ? "#E23B3B" : warn ? "#DD8B00" : "#4B4750"}
        />
      </View>
      <View style={styles.optionCopy}>
        <Text style={[styles.optionTitle, danger && styles.optionTitleDanger]}>{title}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#C4BFC8" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#ECEAEE",
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, alignItems: "center" },
  title: { fontFamily: theme.typography.bold, fontSize: 17, color: "#101018" },
  subtitle: { fontFamily: theme.typography.regular, fontSize: 12, color: "#8C8798", marginTop: 2 },
  intro: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ECEAEE",
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: "#F4A3C0",
  },
  introCopy: { flex: 1, minWidth: 0 },
  introName: { fontFamily: theme.typography.bold, fontSize: 16, color: "#101018" },
  introMeta: {
    fontFamily: theme.typography.regular,
    fontSize: 12,
    color: "#8C8798",
    marginTop: 2,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#F0EEF2",
  },
  optionPressed: { opacity: 0.72 },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F1F3",
  },
  optionIconWarn: { backgroundColor: "#FFF3E0" },
  optionIconDanger: { backgroundColor: "#FFEBEB" },
  optionCopy: { flex: 1, minWidth: 0 },
  optionTitle: { fontFamily: theme.typography.semibold, fontSize: 14.5, color: "#221F26" },
  optionTitleDanger: { color: "#E23B3B" },
  optionSubtitle: {
    fontFamily: theme.typography.regular,
    fontSize: 11.5,
    color: "#918D96",
    marginTop: 1,
  },
});
