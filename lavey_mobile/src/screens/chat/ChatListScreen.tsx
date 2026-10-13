import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { NameInitialCircle } from "../../components/common/NameInitialCircle";
import { hasCustomProfileAvatar } from "../../utils/discoverProfileReady";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { useChat } from "../../context/ChatContext";
import { useSocket } from "../../hooks/useSocket";
import { chatApi, contentApi, discoverApi, subscriptionApi } from "../../api/services";
import { formatConversationDate } from "../../utils/dateFormatter";
import { theme } from "../../constants/theme";
import type { MainTabParamList } from "../../components/navigation/BottomTabNavigator";
import { useProfilesWhoLikedYou } from "../../hooks/useProfilesWhoLikedYou";
import { MatchAvatarStrip } from "./components/MatchAvatarStrip";
import { ChatEmptyStart } from "./components/ChatEmptyStart";
import { ChatRowMarks } from "./components/ChatRowMarks";
import { MessageLikesPanel } from "./components/MessageLikesPanel";
import { NotificationInbox } from "./components/NotificationInbox";
import { ProfileFeedModal } from "../home/components/ProfileFeedModal";
import { PlatinumModal } from "../../components/subscription/PlatinumModal";
import type { Conversation, NotificationEvent, Profile } from "../../types";
import { useAccessMode } from "../../context/AccessModeContext";
import { BackToForYouButton } from "../../components/navigation/BackToForYouButton";
import { useLogoReady } from "../../utils/deferLogo";
import { loadNotifications, peekNotifications } from "../../utils/notificationInboxCache";
import { navigateToForYou } from "../../utils/navigateToForYou";
// Group chats disabled — re-enable when the feature ships.
// import { CreateGroupSheet } from "../groups/CreateGroupSheet";
type Filter = "all" | "unread" | "online" | "likes";

function openChatScreen(
  navigation: NavigationProp<ParamListBase>,
  params: { conversationId: string; conversation?: Conversation; profileId?: string },
) {
  let current: NavigationProp<ParamListBase> | undefined = navigation;
  while (current) {
    if (current.getState()?.routeNames?.includes("ChatDetail")) {
      current.navigate("ChatDetail", params);
      return;
    }
    current = current.getParent();
  }
}
function formatCountdown(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}
export function ChatListScreen({
  navigation,
  route,
}: BottomTabScreenProps<MainTabParamList, "Chat">) {
  const { conversations, refresh } = useChat();
  const logoReady = useLogoReady();
  const { allFree } = useAccessMode();
  const { profiles: likedProfiles, likedBackIds, refetch: refetchLikedProfiles } = useProfilesWhoLikedYou();
  const [stripPreviewProfile, setStripPreviewProfile] = useState<Profile | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [special, setSpecial] = useState<"notifications" | "admin" | null>(
    null,
  );
  const [notifications, setNotifications] = useState<NotificationEvent[]>(peekNotifications);
  const unreadNotifications = notifications.filter((n) => !n.read).length;
  const [platinumOpen, setPlatinumOpen] = useState(false);
  // const [creatingGroup, setCreatingGroup] = useState(false);
  const [official, setOfficial] = useState<unknown>(null);
  const [welcomeDiscount, setWelcomeDiscount] = useState<{ percent: number; expiresAt: string } | null>(null);
  const update = useCallback(() => void refresh(true), [refresh]);
  useSocket(update);
  useEffect(() => {
    void loadNotifications().then(setNotifications).catch(() => undefined);
    void Promise.all([
      chatApi
        .officialInbox()
        .then(setOfficial)
        .catch(() => setOfficial(null)),
      subscriptionApi
        .platinum()
        .then((catalog) => setWelcomeDiscount(catalog.welcomeDiscount ?? null))
        .catch(() => setWelcomeDiscount(null)),
    ]);
  }, []);
  useEffect(() => {
    if (route.params?.conversationId)
      navigation
        .getParent()
        ?.navigate("ChatDetail", {
          conversationId: route.params.conversationId,
        });
  }, [route.params?.conversationId, navigation]);
  const shown = useMemo(() => {
    const filtered = conversations.filter(
      (x) =>
        filter === "all" ||
        (filter === "unread" && x.unreadCount > 0) ||
        (filter === "online" && x.isOnline),
    );
    return [...filtered].sort((a, b) => {
      if (Boolean(a.isPinned) === Boolean(b.isPinned)) return 0;
      return a.isPinned ? -1 : 1;
    });
  }, [conversations, filter]);
  const unread = conversations.reduce((n, x) => n + x.unreadCount, 0);
  const openChatFromStrip = useCallback(
    (conversation: Conversation) =>
      openChatScreen(navigation, {
        conversationId: conversation.id,
        conversation,
      }),
    [navigation],
  );
  useEffect(() => {
    if (special !== "notifications" || unreadNotifications === 0) return;
    chatApi
      .markNotificationsRead()
      .then(() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))))
      .catch(() => {});
  }, [special, unreadNotifications]);
  const likeBackFromNotification = useCallback(
    async (actorUserId: string) => {
      try {
        const result = await discoverApi.like(actorUserId);
        void refetchLikedProfiles();
        if (result.matched) {
          void refresh(true);
          Alert.alert("It's a match! ❤️", "You can chat with them now.");
        }
      } catch (e) {
        Alert.alert("Couldn't like back", e instanceof Error ? e.message : "Please try again.");
      }
    },
    [refetchLikedProfiles, refresh],
  );
  const likePostFromNotification = useCallback((postId: string) => {
    void contentApi.likePost(postId).catch((e: unknown) => {
      Alert.alert("Couldn't like that post", e instanceof Error ? e.message : "Please try again.");
    });
  }, []);
  const openChatFromNotification = useCallback(
    (actorUserId: string) => {
      const known = conversations.find((item) => item.participantProfileId === actorUserId);
      setNotifications((prev) => prev.map((item) => (item.actorUserId === actorUserId ? { ...item, read: true } : item)));
      void chatApi.markNotificationsRead().catch(() => {});
      setSpecial(null);
      openChatScreen(navigation, known
        ? { conversationId: known.id, conversation: known }
        : { conversationId: "resolve", profileId: actorUserId });
      void refresh(true);
    },
    [conversations, navigation, refresh],
  );
  return (
    <SafeAreaView style={styles.root}>
      {logoReady ? (
        <View pointerEvents="none" style={styles.watermarkWrap}>
          <Image
            source={require("../../../assets/heart-tight.png")}
            style={styles.watermarkImage}
            contentFit="contain"
          />
        </View>
      ) : null}
      <View style={styles.header}>
        <BackToForYouButton variant="light" />
        <Text style={styles.title}>Messages</Text>
        <View style={styles.headerSpacer} />
        {/* Group chats disabled — re-enable when the feature ships.
        <Pressable
          style={styles.groups}
          onPress={() => navigation.getParent()?.navigate("GroupChats")}
          hitSlop={8}
        >
          <Ionicons name="people" size={20} color={theme.colors.text} />
        </Pressable>
        <Pressable
          style={styles.plus}
          onPress={() => setCreatingGroup(true)}
        >
          <Ionicons name="add" size={25} />
        </Pressable>
        */}
      </View>
      <View style={styles.onlineStrip}>
        <MatchAvatarStrip
          likedProfiles={likedProfiles}
          conversations={conversations}
          onOpenLikedProfile={setStripPreviewProfile}
          onOpenChat={openChatFromStrip}
        />
      </View>
      <View style={styles.tabs}>
        {(
          [
            ["all", `All ${conversations.length + 2}`],
            ["unread", `Unread ${unread}`],
            [
              "online",
              `Online ${conversations.filter((x) => x.isOnline).length}`,
            ],
            ["likes", `Likes ${likedProfiles.length}`],
          ] as const
        ).map(([id, label]) => (
          <Pressable key={id} onPress={() => setFilter(id)}>
            <Text style={[styles.tab, filter === id && styles.tabActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      {filter === "likes" ? (
        <MessageLikesPanel
          profiles={likedProfiles}
          likedBackIds={likedBackIds}
          onLikeBack={async (profile) => {
            await likeBackFromNotification(profile.id);
          }}
          onText={async (profile) => {
            await openChatFromNotification(profile.id);
          }}
          onStart={() => navigateToForYou(navigation)}
        />
      ) : (
      <FlatList
        data={shown}
        keyExtractor={(x) => x.id}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => void refresh(true)} />
        }
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          filter === "all" ? (
            <>
              <Special
                icon="notifications"
                title="Notifications"
                copy={notifications[0]?.text ?? "Likes, crushes & updates appear here"}
                badge={unreadNotifications}
                onPress={() => {
                  setSpecial("notifications");
                  void loadNotifications().then(setNotifications).catch(() => undefined);
                }}
                gold
              />
              {!allFree ? <Special
                icon="heart"
                logo
                verified
                title="Lavey Admin"
                copy="10% off Platinum — exclusive for you · Today"
                badge={official ? 1 : 0}
                onPress={() => setSpecial("admin")}
              /> : null}
            </>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.item}
            onPress={() =>
              openChatScreen(navigation, {
                conversationId: item.id,
                conversation: item,
              })
            }
          >
            <View>
              {hasCustomProfileAvatar(item.participantAvatar) ? (
                <Image source={{ uri: item.participantAvatar }} style={styles.avatar} />
              ) : (
                <NameInitialCircle name={item.participantName} size={58} />
              )}
              {item.isOnline ? <View style={styles.dot} /> : null}
            </View>
            <View style={styles.body}>
              <Text style={styles.name}>{item.participantName}</Text>
              <Text numberOfLines={1} style={styles.preview}>
                {item.lastMessage} ·{" "}
                {formatConversationDate(item.lastMessageAt)}
              </Text>
            </View>
            <ChatRowMarks pinned={Boolean(item.isPinned)} muted={Boolean(item.isMuted)} />
            {item.unreadCount ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
        )}
        ListEmptyComponent={
          <ChatEmptyStart
            icon="chatbubble-ellipses-outline"
            title="No conversations yet"
            copy="Find someone on For You, match, and say hello. Your chats will show up here."
            action="Start a chat"
            onStart={() => navigateToForYou(navigation)}
          />
        }
      />
      )}
      <SpecialSheet
        kind={special}
        close={() => setSpecial(null)}
        notifications={notifications}
        likedBackIds={likedBackIds}
        onLikeBack={likeBackFromNotification}
        onLikePost={likePostFromNotification}
        onOpenChat={openChatFromNotification}
        onOpenPlatinum={() => setPlatinumOpen(true)}
        welcomeDiscount={welcomeDiscount}
      />
      {!allFree ? <PlatinumModal visible={platinumOpen} close={() => setPlatinumOpen(false)} /> : null}
      {/* Group chats disabled — re-enable when the feature ships.
      <CreateGroupSheet
        visible={creatingGroup}
        onClose={() => setCreatingGroup(false)}
        onCreated={(group) => {
          setCreatingGroup(false);
          navigation.getParent()?.navigate("GroupChatDetail", { groupId: group.id, group });
        }}
      />
      */}
      {stripPreviewProfile ? (
        <ProfileFeedModal
          profile={stripPreviewProfile}
          visible
          profileLiked={likedBackIds.has(stripPreviewProfile.id)}
          onClose={() => setStripPreviewProfile(null)}
          onLikeProfile={async () => {
            const target = stripPreviewProfile;
            if (!target) return;
            try {
              const result = await discoverApi.like(target.id);
              void refetchLikedProfiles();
              if (result.matched) {
                void refresh(true);
                Alert.alert("It's a match! ❤️", "You can chat with them now.");
              }
            } catch {
              // best-effort
            }
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}
function Special({
  icon,
  title,
  copy,
  onPress,
  gold,
  badge = 0,
  logo,
  verified,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  copy: string;
  onPress(): void;
  gold?: boolean;
  badge?: number;
  logo?: boolean;
  verified?: boolean;
}) {
  return (
    <Pressable style={styles.item} onPress={onPress}>
      <View style={[styles.specialIcon, gold ? styles.gold : styles.admin]}>
        {logo ? (
          <Image source={require("../../../assets/heart-tight.png")} style={styles.specialLogo} />
        ) : (
          <Ionicons name={icon} size={24} color={gold ? "#FFB71B" : "#D72FCE"} />
        )}
      </View>
      <View style={styles.body}>
        <View style={styles.specialNameRow}>
          <Text style={styles.name}>{title}</Text>
          {verified ? (
            <Ionicons name="checkmark-circle" size={15} color="#1877F2" style={styles.specialVerified} />
          ) : (
            <Text style={styles.specialStar}>　★</Text>
          )}
        </View>
        <Text style={styles.preview}>{copy}</Text>
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
function SpecialSheet({
  kind,
  close,
  notifications,
  likedBackIds,
  onLikeBack,
  onLikePost,
  onOpenChat,
  onOpenPlatinum,
  welcomeDiscount,
}: {
  kind: "notifications" | "admin" | null;
  close(): void;
  notifications: NotificationEvent[];
  likedBackIds: Set<string>;
  onLikeBack(actorUserId: string): void;
  onLikePost(postId: string): void;
  onOpenChat(actorUserId: string): void;
  onOpenPlatinum(): void;
  welcomeDiscount: { percent: number; expiresAt: string } | null;
}) {
  const [offerClock, setOfferClock] = useState(() => Date.now());
  useEffect(() => {
    if (kind !== "admin" || !welcomeDiscount) return;
    const timer = setInterval(() => setOfferClock(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [kind, welcomeDiscount]);
  const activeWelcomeDiscount =
    welcomeDiscount && new Date(welcomeDiscount.expiresAt).getTime() > offerClock
      ? welcomeDiscount
      : null;

  return (
    <Modal visible={Boolean(kind)} animationType="slide" transparent>
      <View style={styles.sheetBack}>
        <SafeAreaView style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>
              {kind === "notifications" ? "Notifications" : "Lavey Admin"}
            </Text>
            <Pressable onPress={close}>
              <Ionicons name="close" size={24} />
            </Pressable>
          </View>
          {kind === "notifications" ? (
            <NotificationInbox
              notifications={notifications}
              likedBackIds={likedBackIds}
              onLikeBack={onLikeBack}
              onLikePost={onLikePost}
              onOpenChat={onOpenChat}
            />
          ) : (
          <ScrollView
            contentContainerStyle={styles.sheetBody}
            showsVerticalScrollIndicator={false}
          >
              <View style={styles.promo}>
                <View style={styles.promoCardHead}>
                  <Image
                    source={require("../../../assets/heart-tight.png")}
                    style={styles.promoCardAvatar}
                  />
                  <View>
                    <View style={styles.specialNameRow}>
                      <Text style={styles.promoCardFrom}>Lavey Admin</Text>
                      <Ionicons name="checkmark-circle" size={14} color="#1877F2" style={styles.specialVerified} />
                    </View>
                    <Text style={styles.promoCardHeadline}>
                      {activeWelcomeDiscount
                        ? `Lavey would like to offer you ${activeWelcomeDiscount.percent}% off Platinum`
                        : "Unlock more ways to connect with Platinum"}
                    </Text>
                  </View>
                </View>

                <Pressable onPress={onOpenPlatinum}>
                  <LinearGradient colors={["#FFF8FC", "#F9EDFF", "#FFF4E9"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.promoHero}>
                    <Image
                      source={require("../../../assets/heart-tight.png")}
                      style={styles.promoHeroLogo}
                    />
                    <Text style={styles.promoHeroDiscount}>{activeWelcomeDiscount ? `${activeWelcomeDiscount.percent}% OFF` : "PLATINUM"}</Text>
                    <Text style={styles.promoHeroPlan}>{activeWelcomeDiscount ? "Platinum welcome offer" : "More connection, more control"}</Text>
                    {activeWelcomeDiscount ? (
                      <View style={styles.promoCountdown}>
                        <Ionicons name="time-outline" size={13} color="#7C3AED" />
                        <Text style={styles.promoCountdownText}>{formatCountdown(activeWelcomeDiscount.expiresAt)}</Text>
                      </View>
                    ) : null}
                  </LinearGradient>
                </Pressable>

                <Text style={styles.promoCopy}>
                  {activeWelcomeDiscount
                    ? "Upgrade to Platinum and unlock unlimited likes, see who liked you, advanced filters, and weekly spotlight. Your welcome discount is applied automatically at checkout."
                    : "Upgrade to Platinum and unlock unlimited likes, see who liked you, advanced filters, and weekly spotlight."}
                </Text>
                <Pressable style={styles.promoButton} onPress={onOpenPlatinum}>
                  <Text style={styles.promoButtonText}>{activeWelcomeDiscount ? "Claim your discount" : "Upgrade to Platinum"}</Text>
                </Pressable>
                <Text style={styles.promoFineprint}>
                  {activeWelcomeDiscount
                    ? "Welcome offer for new members — applied automatically, no code needed."
                    : "Manage your plan anytime from Settings."}
                </Text>
              </View>
          </ScrollView>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F8FC" },
  watermarkWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  watermarkImage: {
    width: 190,
    height: 190,
    opacity: 0.07,
  },
  header: {
    height: 60,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerSpacer: { flex: 1 },
  onlineStrip: { height: 104, zIndex: 3, marginBottom: 6, overflow: "visible" },
  title: { fontFamily: theme.typography.bold, fontSize: 27 },
  plus: {
    position: "absolute",
    right: 18,
    width: 44,
    height: 44,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#DDDCE1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1D1922",
    shadowOpacity: 0.1,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  groups: {
    position: "absolute",
    right: 70,
    width: 44,
    height: 44,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#DDDCE1",
    alignItems: "center",
    justifyContent: "center",
  },
  tabs: {
    alignSelf: "center",
    flexDirection: "row",
    backgroundColor: "#ECEBF0",
    padding: 3,
    borderRadius: 21,
    marginBottom: 13,
  },
  tab: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    fontFamily: theme.typography.medium,
    fontSize: 10,
    color: "#625D66",
  },
  tabActive: { backgroundColor: "#E2D3F7", borderRadius: 17, color: "#8D3EE7" },
  list: { paddingHorizontal: 20, paddingBottom: 90 },
  item: { minHeight: 78, flexDirection: "row", alignItems: "center", gap: 13 },
  avatar: { width: 58, height: 58, borderRadius: 30 },
  dot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#25D375",
    borderWidth: 2,
    borderColor: "white",
  },
  specialIcon: {
    width: 62,
    height: 62,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  gold: { backgroundColor: "#F9F0E7", borderColor: "#F2CC82" },
  admin: { backgroundColor: "#F4E0FA", borderColor: "#DCA3EF" },
  specialLogo: { width: 34, height: 34 },
  body: { flex: 1 },
  specialNameRow: { flexDirection: "row", alignItems: "center" },
  name: { fontFamily: theme.typography.semibold, fontSize: 15 },
  specialVerified: { marginLeft: 5 },
  specialStar: { color: "#FFB400" },
  preview: {
    fontFamily: theme.typography.regular,
    color: "#89838E",
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 12,
    backgroundColor: "#FF5271",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "white",
    fontFamily: theme.typography.bold,
    fontSize: 10,
  },
  empty: {
    textAlign: "center",
    marginTop: 60,
    color: "#8D8792",
    fontFamily: theme.typography.regular,
  },
  sheetBack: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    height: "68%",
    backgroundColor: "#F8F8FC",
    borderTopLeftRadius: 27,
    borderTopRightRadius: 27,
    overflow: "hidden",
  },
  sheetHead: {
    height: 66,
    paddingHorizontal: 19,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#E3E0E5",
  },
  sheetTitle: { fontFamily: theme.typography.bold, fontSize: 21 },
  sheetBody: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 36 },
  promo: { padding: 4 },
  promoCardHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  promoCardAvatar: { width: 44, height: 44 },
  promoCardFrom: { fontFamily: theme.typography.bold, fontSize: 14 },
  promoCardHeadline: {
    fontFamily: theme.typography.medium,
    fontSize: 12.5,
    color: "#77717D",
    marginTop: 2,
    maxWidth: 260,
  },
  promoHero: {
    borderRadius: 22,
    paddingVertical: 32,
    alignItems: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E9D8F6",
  },
  promoHeroLogo: { width: 46, height: 46, marginBottom: 10 },
  promoHeroDiscount: { fontFamily: theme.typography.bold, fontSize: 27, color: "#54207A" },
  promoHeroPlan: {
    fontFamily: theme.typography.semibold,
    fontSize: 13,
    color: "#7B6686",
    marginTop: 2,
    letterSpacing: 1,
  },
  promoCountdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7D7F1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  promoCountdownText: { fontFamily: theme.typography.semibold, fontSize: 11, color: "#6B3A89" },
  promoCopy: {
    fontFamily: theme.typography.regular,
    color: "#77717D",
    lineHeight: 21,
  },
  promoButton: {
    marginTop: 20,
    backgroundColor: "#FF6170",
    borderRadius: 22,
    paddingVertical: 14,
    alignItems: "center",
  },
  promoButtonText: { color: "white", fontFamily: theme.typography.bold, fontSize: 14 },
  promoFineprint: {
    fontFamily: theme.typography.regular,
    fontSize: 10.5,
    color: "#A29CA8",
    textAlign: "center",
    marginTop: 12,
  },
});
