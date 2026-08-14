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
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useChat } from "../../context/ChatContext";
import { useSocket } from "../../hooks/useSocket";
import { chatApi, discoverApi, subscriptionApi } from "../../api/services";
import { formatConversationDate } from "../../utils/dateFormatter";
import { theme } from "../../constants/theme";
import type { MainTabParamList } from "../../components/navigation/BottomTabNavigator";
import { useProfilesWhoLikedYou } from "../../hooks/useProfilesWhoLikedYou";
import { MatchAvatarStrip } from "./components/MatchAvatarStrip";
import { ProfileFeedModal } from "../home/components/ProfileFeedModal";
import { PlatinumModal } from "../../components/subscription/PlatinumModal";
import type { Conversation, NotificationEvent, Profile } from "../../types";
import { useAccessMode } from "../../context/AccessModeContext";
import { BackToForYouButton } from "../../components/navigation/BackToForYouButton";
// Group chats disabled — re-enable when the feature ships.
// import { CreateGroupSheet } from "../groups/CreateGroupSheet";
type Filter = "all" | "unread" | "online";
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
  const { conversations, loading, refresh } = useChat();
  const { allFree } = useAccessMode();
  const { profiles: likedProfiles, likedBackIds, refetch: refetchLikedProfiles } = useProfilesWhoLikedYou();
  const [stripPreviewProfile, setStripPreviewProfile] = useState<Profile | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [special, setSpecial] = useState<"notifications" | "admin" | null>(
    null,
  );
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const unreadNotifications = notifications.filter((n) => !n.read).length;
  const [platinumOpen, setPlatinumOpen] = useState(false);
  // const [creatingGroup, setCreatingGroup] = useState(false);
  const [official, setOfficial] = useState<unknown>(null);
  const [welcomeDiscount, setWelcomeDiscount] = useState<{ percent: number; expiresAt: string } | null>(null);
  const update = useCallback(() => void refresh(true), [refresh]);
  useSocket(update);
  useEffect(() => {
    void Promise.all([
      chatApi
        .notifications()
        .then(setNotifications)
        .catch(() => setNotifications([])),
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
  const shown = useMemo(
    () =>
      conversations.filter(
        (x) =>
          filter === "all" ||
          (filter === "unread" && x.unreadCount > 0) ||
          (filter === "online" && x.isOnline),
      ),
    [conversations, filter],
  );
  const unread = conversations.reduce((n, x) => n + x.unreadCount, 0);
  const openChatFromStrip = useCallback(
    (conversation: Conversation) =>
      navigation.getParent()?.navigate("ChatDetail", {
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
  const openChatFromNotification = useCallback(
    async (actorUserId: string) => {
      try {
        const { conversationId } = await chatApi.conversationByProfile(actorUserId);
        if (!conversationId) throw new Error("Your match chat is still being prepared. Please try again.");
        setSpecial(null);
        navigation.getParent()?.navigate("ChatDetail", { conversationId });
      } catch (e) {
        Alert.alert("Couldn't open chat", e instanceof Error ? e.message : "Please try again.");
      }
    },
    [navigation],
  );
  return (
    <SafeAreaView style={styles.root}>
      <View pointerEvents="none" style={styles.watermarkWrap}>
        <Image
          source={require("../../../assets/heart-tight.png")}
          style={styles.watermarkImage}
          contentFit="contain"
        />
      </View>
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
      <MatchAvatarStrip
        likedProfiles={likedProfiles}
        conversations={conversations}
        onOpenLikedProfile={setStripPreviewProfile}
        onOpenChat={openChatFromStrip}
      />
      <View style={styles.tabs}>
        {(
          [
            ["all", `All ${conversations.length + 2}`],
            ["unread", `Unread ${unread}`],
            [
              "online",
              `Online ${conversations.filter((x) => x.isOnline).length}`,
            ],
          ] as const
        ).map(([id, label]) => (
          <Pressable key={id} onPress={() => setFilter(id)}>
            <Text style={[styles.tab, filter === id && styles.tabActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={shown}
        keyExtractor={(x) => x.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} />
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
                onPress={() => setSpecial("notifications")}
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
              navigation
                .getParent()
                ?.navigate("ChatDetail", {
                  conversationId: item.id,
                  conversation: item,
                })
            }
          >
            <View>
              <Image
                source={{ uri: item.participantAvatar }}
                style={styles.avatar}
              />
              {item.isOnline ? <View style={styles.dot} /> : null}
            </View>
            <View style={styles.body}>
              <Text style={styles.name}>{item.participantName}</Text>
              <Text numberOfLines={1} style={styles.preview}>
                {item.lastMessage} ·{" "}
                {formatConversationDate(item.lastMessageAt)}
              </Text>
            </View>
            {item.unreadCount ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No conversations in this filter.</Text>
        }
      />
      <SpecialSheet
        kind={special}
        close={() => setSpecial(null)}
        notifications={notifications}
        likedBackIds={likedBackIds}
        onLikeBack={likeBackFromNotification}
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
const NOTIFICATION_KIND_LABELS: Record<string, string> = {
  crush: "Crush",
  post_like: "Post appreciation",
  like: "Profile like",
  verified: "Verification",
  match: "New match",
  system: "Lavey",
  profile_view: "Profile view",
  meetup_like: "Date interest",
  meetup_join: "Date join",
};
function formatActorMeta(item: NotificationEvent): string | null {
  const parts: string[] = [];
  if (item.actorAge != null) parts.push(String(item.actorAge));
  if (item.actorLocation) parts.push(item.actorLocation);
  return parts.length ? parts.join(" · ") : null;
}

function NotificationCard({
  item,
  showChat,
  onAction,
}: {
  item: NotificationEvent;
  showChat: boolean;
  onAction(): void;
}) {
  const isMatch = item.kind === "match";
  const headline =
    item.kind === "match"
      ? (item.title ?? "It's a match!")
      : item.kind === "verified"
        ? "You're verified!"
        : (item.title ?? item.text);
  const subtext =
    item.body && item.body !== headline
      ? item.body
      : item.kind === "match"
        ? `${item.actorName.split(" ")[0] ?? item.actorName} matched with you`
        : null;
  const actorMeta = formatActorMeta(item);
  const vibeLabel =
    item.actorVibeScore != null ? `${Math.round(item.actorVibeScore)}% vibe` : null;

  return (
    <View
      style={[
        styles.notice,
        isMatch && styles.noticeMatch,
        !item.read && styles.noticeUnread,
        !item.read && isMatch && styles.noticeMatchUnread,
      ]}
    >
      <View style={styles.noticeHeaderRow}>
        <Text style={styles.noticeKind}>
          {(NOTIFICATION_KIND_LABELS[item.kind] ?? "Update").toUpperCase()}
        </Text>
        <Text style={styles.noticeMetaInline}>{item.sentAt}</Text>
      </View>
      {isMatch ? <View style={styles.noticeMatchAccent} /> : null}
      <View style={styles.noticeMain}>
        <View style={styles.noticeTopRow}>
          <NotificationIcon item={item} match={isMatch} />
          <View style={styles.noticeContent}>
            <View style={styles.noticeNameRow}>
              <Text style={styles.noticeName} numberOfLines={1}>
                {item.actorName}
                {item.actorAge != null ? `, ${item.actorAge}` : ""}
              </Text>
              {vibeLabel ? (
                <View style={styles.noticeVibePill}>
                  <Text style={styles.noticeVibeText}>{vibeLabel}</Text>
                </View>
              ) : null}
            </View>
            {actorMeta ? (
              <View style={styles.noticeLocationRow}>
                <Ionicons name="location-outline" size={12} color="#8B93A1" />
                <Text style={styles.noticeLocation} numberOfLines={1}>
                  {item.actorLocation ?? actorMeta}
                </Text>
              </View>
            ) : null}
            <Text style={[styles.noticeTitle, isMatch && styles.noticeTitleMatch]}>
              {headline}
            </Text>
            {subtext ? <Text style={styles.noticeText}>{subtext}</Text> : null}
          </View>
        </View>
        {item.actionable && item.actorUserId ? (
          <Pressable
            style={[styles.noticeAction, showChat && styles.noticeActionChat]}
            onPress={onAction}
          >
            <Text style={styles.noticeActionText}>
              {showChat ? "Open conversation" : "Like back"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function NotificationIcon({ item, match = false }: { item: NotificationEvent; match?: boolean }) {
  if (item.kind === "verified") {
    return (
      <View style={[styles.noticeIcon, styles.noticeIconVerified]}>
        <Ionicons name="checkmark-circle" size={26} color="#1877F2" />
      </View>
    );
  }
  if (item.kind === "system") {
    return (
      <View style={[styles.noticeIcon, styles.noticeIconSystem]}>
        <Ionicons name="notifications" size={20} color="#8D3EE7" />
      </View>
    );
  }
  if (item.actorAvatar) {
    return (
      <Image
        source={{ uri: item.actorAvatar }}
        style={[styles.noticeAvatar, match && styles.noticeAvatarMatch]}
      />
    );
  }
  return (
    <View style={[styles.noticeIcon, styles.noticeIconSystem]}>
      <Ionicons name="heart" size={20} color="#FF5571" />
    </View>
  );
}
function SpecialSheet({
  kind,
  close,
  notifications,
  likedBackIds,
  onLikeBack,
  onOpenChat,
  onOpenPlatinum,
  welcomeDiscount,
}: {
  kind: "notifications" | "admin" | null;
  close(): void;
  notifications: NotificationEvent[];
  likedBackIds: Set<string>;
  onLikeBack(actorUserId: string): void;
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
          <ScrollView
            contentContainerStyle={styles.sheetBody}
            showsVerticalScrollIndicator={false}
          >
            {kind === "notifications" ? (
              notifications.length ? (
                notifications.map((item) => {
                  const showChat =
                    item.kind === "match" ||
                    (item.actorUserId ? likedBackIds.has(item.actorUserId) : false);
                  return (
                    <NotificationCard
                      key={item.id}
                      item={item}
                      showChat={showChat}
                      onAction={() =>
                        item.actorUserId
                          ? showChat
                            ? onOpenChat(item.actorUserId)
                            : onLikeBack(item.actorUserId)
                          : undefined
                      }
                    />
                  );
                })
              ) : (
                <Text style={styles.empty}>
                  Likes, crushes and account updates will appear here.
                </Text>
              )
            ) : (
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
            )}
          </ScrollView>
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
    paddingHorizontal: 15,
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
    height: "82%",
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
  notice: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6E8ED",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#1C1C28",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  noticeMatch: {
    borderColor: "#E8D4E0",
    backgroundColor: "#FFFCFE",
  },
  noticeMatchUnread: {
    borderColor: "#DCC6D3",
    backgroundColor: "#FFF9FB",
  },
  noticeMatchAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: "#C94B73",
  },
  noticeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingLeft: 4,
  },
  noticeKind: {
    fontFamily: theme.typography.semibold,
    fontSize: 10,
    letterSpacing: 1.1,
    color: "#7A8190",
  },
  noticeMetaInline: {
    fontFamily: theme.typography.regular,
    fontSize: 10.5,
    color: "#9AA3AF",
  },
  noticeMain: {
    gap: 12,
    paddingLeft: 4,
  },
  noticeTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  noticeContent: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  noticeNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  noticeName: {
    fontFamily: theme.typography.bold,
    fontSize: 15,
    color: "#1F2430",
    flexShrink: 1,
  },
  noticeVibePill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#F3F4F7",
    borderWidth: 1,
    borderColor: "#E2E5EB",
  },
  noticeVibeText: {
    fontFamily: theme.typography.semibold,
    fontSize: 10.5,
    color: "#5C6470",
  },
  noticeLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  noticeLocation: {
    fontFamily: theme.typography.regular,
    fontSize: 11.5,
    color: "#7A8190",
    flex: 1,
  },
  noticeUnread: { borderColor: "#D8DCE4", backgroundColor: "#FAFBFD" },
  noticeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeIconVerified: { backgroundColor: "#EAF3FF" },
  noticeIconSystem: { backgroundColor: "#F9F0FE" },
  noticeAvatar: { width: 48, height: 48, borderRadius: 24 },
  noticeAvatarMatch: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "#DCC6D3",
  },
  noticeTitle: { fontFamily: theme.typography.semibold, fontSize: 13.5, color: "#2B3140", marginTop: 4 },
  noticeTitleMatch: { fontFamily: theme.typography.bold, fontSize: 14, color: "#8E3A5B" },
  noticeText: { fontFamily: theme.typography.regular, fontSize: 12.5, color: "#5F6673", marginTop: 3, lineHeight: 18 },
  noticeMeta: { fontFamily: theme.typography.regular, fontSize: 10.5, color: "#9A94A0", marginTop: 6 },
  noticeAction: {
    alignSelf: "flex-start",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "#1F2430",
  },
  noticeActionChat: { backgroundColor: "#8E3A5B" },
  noticeActionText: { fontFamily: theme.typography.semibold, fontSize: 11.5, color: "white", letterSpacing: 0.2 },
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
