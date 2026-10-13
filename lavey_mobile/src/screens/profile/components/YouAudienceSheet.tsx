import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { SlidePanelModal } from "../../../components/common/SlidePanelModal";
import { theme } from "../../../constants/theme";
import { useT } from "../../../hooks/useTranslatedStrings";
import { discoverApi, peekAudienceLists, prefetchAudience, subscribeAudience, type AudienceLists, type AudiencePerson } from "../../../api/services";
import type { Profile } from "../../../types";
import { formatProfileActivityStatus, isProfileActivityOnline } from "../../../utils/profileActivityStatus";
import { hasCustomProfileAvatar } from "../../../utils/discoverProfileReady";

const TABS = [
  { key: "viewed", label: "Views" },
  { key: "crushes", label: "Crush" },
  { key: "likes", label: "Likes" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const EMPTY: Record<TabKey, string> = {
  viewed: "No one has viewed you yet.",
  crushes: "No crushes yet.",
  likes: "No likes yet.",
};

export function YouAudienceSheet({
  visible,
  onClose,
  onOpenProfile,
}: {
  visible: boolean;
  onClose(): void;
  onOpenProfile(profile: Profile): void;
}) {
  const t = useT();
  const [tab, setTab] = useState<TabKey>("viewed");
  const [lists, setLists] = useState<AudienceLists | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setTab("viewed");
    const cached = peekAudienceLists();
    if (cached) {
      setLists(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    const unsubscribe = subscribeAudience((next) => {
      if (cancelled) return;
      setLists(next);
      setLoading(false);
    });
    void prefetchAudience().catch(() => {
      if (!cancelled && !peekAudienceLists()) {
        setLists({ viewed: [], crushes: [], likes: [] });
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [visible]);

  const people = lists?.[tab] ?? [];

  const openPerson = (person: AudiencePerson) => {
    const stub: Profile = {
      id: person.id,
      name: person.name?.trim() || "Member",
      age: person.age,
      bio: "",
      distance: "",
      verified: person.verified,
      vibeScore: person.vibeScore ?? 0,
      interests: [],
      avatar: person.avatar,
      posts: [],
      lastActiveAt: person.lastActiveAt ?? undefined,
      isOnline: person.isOnline,
    };
    onOpenProfile(stub);
    void discoverApi.profile(person.id).then(onOpenProfile).catch(() => undefined);
  };

  return (
    <SlidePanelModal visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={onClose} hitSlop={8} accessibilityRole="button">
          <Ionicons name="chevron-back" size={24} color="#171720" />
        </Pressable>
        <Text style={styles.title}>{t("Your activity")}</Text>
        <View style={styles.back} />
      </View>

      <View style={styles.tabs}>
        {TABS.map((item) => {
          const selected = tab === item.key;
          const count = lists?.[item.key].length ?? 0;
          return (
            <Pressable key={item.key} onPress={() => setTab(item.key)}>
              <Text style={[styles.tab, selected && styles.tabActive]}>
                {t(item.label)} {count}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color="#171720" />
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={people.length ? styles.listContent : styles.emptyWrap}
        >
          {people.length === 0 ? (
            <Text style={styles.empty}>{t(EMPTY[tab])}</Text>
          ) : (
            people.map((item) => {
              const activityStatus = formatProfileActivityStatus(item.lastActiveAt ?? undefined, item.isOnline);
              const activityOnline = isProfileActivityOnline(item.lastActiveAt ?? undefined, item.isOnline);
              return (
              <Pressable key={item.id} style={styles.row} onPress={() => void openPerson(item)}>
                {hasCustomProfileAvatar(item.avatar) ? (
                  <Image source={{ uri: item.avatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarLetter}>{(item.name?.trim().charAt(0) || "?").toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.copy}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name?.trim() || "Member"}
                    {item.age > 0 ? `, ${item.age}` : ""}
                  </Text>
                  {activityStatus ? (
                    <View style={styles.statusRow}>
                      {activityOnline ? <View style={styles.statusDot} /> : null}
                      <Text style={[styles.status, activityOnline && styles.statusOnline]}>{activityStatus}</Text>
                    </View>
                  ) : null}
                  {typeof item.vibeScore === "number" ? (
                    <Text style={styles.match}>{item.vibeScore}% match</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color="#C4C0C8" />
              </Pressable>
              );
            })
          )}
        </ScrollView>
      )}
    </SlidePanelModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: theme.typography.bold,
    fontSize: 18,
    color: "#171720",
  },
  tabs: {
    alignSelf: "center",
    flexDirection: "row",
    backgroundColor: "#ECEBF0",
    padding: 3,
    borderRadius: 21,
    marginBottom: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    fontFamily: theme.typography.medium,
    fontSize: 12,
    color: "#625D66",
  },
  tabActive: { backgroundColor: "#E2D3F7", borderRadius: 17, color: "#8D3EE7" },
  loader: { marginTop: 48 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 8, paddingBottom: 28 },
  emptyWrap: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  empty: {
    fontFamily: theme.typography.regular,
    fontSize: 14,
    lineHeight: 21,
    color: "#8C8798",
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F3F2F5",
  },
  avatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "#E2D3F7" },
  avatarLetter: { fontFamily: theme.typography.bold, fontSize: 18, color: "#8D3EE7" },
  copy: { flex: 1, gap: 2 },
  name: {
    fontFamily: theme.typography.semibold,
    fontSize: 16,
    color: "#171720",
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2BA84A" },
  status: { fontFamily: theme.typography.regular, fontSize: 12, color: "#8C8798" },
  statusOnline: { color: "#2BA84A" },
  match: { fontFamily: theme.typography.medium, fontSize: 12, color: "#8D3EE7" },
});
