import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { Image } from "expo-image";
import { theme } from "../../../constants/theme";
import type { OnlineDate } from "../../../types";

const DARK = "#101018";

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function shortName(date: OnlineDate): string {
  if (date.isHostedByYou) return "You";
  const first = date.hostName.trim().split(/\s+/)[0] ?? date.hostName;
  return first.length > 9 ? `${first.slice(0, 8)}…` : first;
}

function badgeFor(date: OnlineDate, actuallyLive: boolean): { label: string; live: boolean } {
  if (actuallyLive) return { label: "Live", live: true };
  if (date.status === "live" || date.status === "starting-soon") return { label: "Soon", live: false };
  return { label: "Later", live: false };
}

export function LiveMeetupsStrip({
  dates,
  liveMeetupIds,
  onSelect,
}: {
  dates: OnlineDate[];
  liveMeetupIds: Set<string>;
  onSelect(date: OnlineDate): void;
}) {
  const highlighted = dates.filter((date) => {
    const live = liveMeetupIds.has(date.id) || date.status === "live";
    const ended = date.status === "ended" || date.status === "expired";
    return live || !ended;
  }).slice(0, 12);

  if (highlighted.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Happening now</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {highlighted.map((date) => {
          const badge = badgeFor(date, liveMeetupIds.has(date.id));
          return (
            <Pressable key={date.id} style={styles.item} onPress={() => onSelect(date)}>
              <View style={[styles.ring, badge.live ? styles.ringLive : styles.ringUpcoming]}>
                {date.hostAvatar ? (
                  <Image source={{ uri: date.hostAvatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>{initial(date.hostName)}</Text>
                  </View>
                )}
              </View>
              <View style={[styles.badge, badge.live ? styles.badgeLive : styles.badgeMuted]}>
                <Text style={styles.badgeText} numberOfLines={1}>
                  {badge.label}
                </Text>
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {shortName(date)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 6 },
  label: {
    marginHorizontal: 20,
    marginBottom: 10,
    fontFamily: theme.typography.semibold,
    fontSize: 12,
    color: "#8C8798",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  scroll: { paddingHorizontal: 20, gap: 14 },
  item: { alignItems: "center", width: 64 },
  ring: {
    width: 56,
    height: 56,
    borderRadius: 28,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  ringLive: { borderWidth: 2, borderColor: "#E5484D" },
  ringUpcoming: { borderWidth: 1.5, borderColor: "#D8D4DC" },
  avatar: { width: "100%", height: "100%", borderRadius: 26 },
  avatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: DARK },
  avatarInitial: { color: "#FFFFFF", fontFamily: theme.typography.bold, fontSize: 16 },
  badge: {
    marginTop: -10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  badgeLive: { backgroundColor: "#E5484D" },
  badgeMuted: { backgroundColor: DARK },
  badgeText: { color: "#FFFFFF", fontFamily: theme.typography.bold, fontSize: 8, letterSpacing: 0.3 },
  name: { marginTop: 6, fontSize: 11, fontFamily: theme.typography.medium, color: "#5B5660", textAlign: "center" },
});
