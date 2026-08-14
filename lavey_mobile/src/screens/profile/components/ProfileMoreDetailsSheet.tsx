import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../../constants/theme";
import type { Profile } from "../../../types";
import { profileDetailRows } from "../../../utils/profileIdentityLabels";
import {
  formatProfileActivityStatus,
  isProfileActivityOnline,
} from "../../../utils/profileActivityStatus";

type DetailIcon = keyof typeof Ionicons.glyphMap;

const ROW_ICONS: Record<string, DetailIcon> = {
  activity: "pulse-outline",
  about: "reader-outline",
  gender: "person-outline",
  orientation: "git-network-outline",
  interested: "people-outline",
  purpose: "compass-outline",
  religion: "book-outline",
  location: "location-outline",
  distance: "navigate-outline",
  languages: "language-outline",
  interests: "pricetags-outline",
  occupation: "briefcase-outline",
  education: "school-outline",
  hometown: "home-outline",
  themeSong: "musical-notes-outline",
  match: "heart-outline",
  verified: "shield-checkmark-outline",
};

function DetailRow({
  icon,
  label,
  value,
  valueColor,
  leadingDot,
}: {
  icon: DetailIcon;
  label: string;
  value: string;
  valueColor?: string;
  leadingDot?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={18} color="#6B5E7A" />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueRow}>
          {leadingDot ? <View style={styles.onlineDot} /> : null}
          <Text style={[styles.value, valueColor ? { color: valueColor } : null]}>{value}</Text>
        </View>
      </View>
    </View>
  );
}

export function ProfileMoreDetailsSheet({
  visible,
  profile,
  onClose,
}: {
  visible: boolean;
  profile: Profile | null;
  onClose(): void;
}) {
  const insets = useSafeAreaInsets();

  if (!profile) return null;

  const rows = profileDetailRows(profile).filter((row) => row.value.trim().length > 0);
  const activityStatus = formatProfileActivityStatus(profile.lastActiveAt, profile.isOnline);
  const activityOnline = isProfileActivityOnline(profile.lastActiveAt, profile.isOnline);
  const bio = profile.bio?.trim();

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Profile details</Text>
              <Text style={styles.subtitle}>
                {profile.name}
                {profile.age ? `, ${profile.age}` : ""}
              </Text>
            </View>
            <Pressable style={styles.headerClose} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={18} color="#7A7580" />
            </Pressable>
          </View>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {activityStatus ? (
              <DetailRow
                icon={ROW_ICONS.activity}
                label="Activity"
                value={activityStatus}
                valueColor={activityOnline ? "#2BA84A" : undefined}
                leadingDot={activityOnline}
              />
            ) : null}

            {bio ? (
              <DetailRow icon={ROW_ICONS.about} label="About" value={bio} />
            ) : null}

            {rows.map((row) => (
              <DetailRow
                key={row.key}
                icon={ROW_ICONS[row.key] ?? "information-circle-outline"}
                label={row.label}
                value={row.value}
                valueColor={row.key === "match" ? theme.colors.coral : row.key === "verified" ? "#2686EA" : undefined}
              />
            ))}

            {!activityStatus && !bio && rows.length === 0 ? (
              <Text style={styles.empty}>No additional details to show.</Text>
            ) : null}
          </ScrollView>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,.48)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    maxHeight: "84%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E0E4",
    alignSelf: "center",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ECECEC",
  },
  headerCopy: { flex: 1, paddingRight: 12 },
  title: {
    fontFamily: theme.typography.bold,
    fontSize: 18,
    color: "#19171E",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: theme.typography.medium,
    fontSize: 13,
    color: "#8F8A93",
    marginTop: 3,
  },
  headerClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F2F4",
  },
  list: { maxHeight: 440 },
  listContent: { paddingBottom: 4 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F0EEF2",
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6F4F8",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EBE8EE",
  },
  rowBody: { flex: 1, paddingTop: 1 },
  label: {
    fontFamily: theme.typography.medium,
    fontSize: 10.5,
    color: "#9A949E",
    textTransform: "uppercase",
    letterSpacing: 0.55,
    marginBottom: 3,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  value: {
    flex: 1,
    fontFamily: theme.typography.semibold,
    fontSize: 14.5,
    color: "#221F26",
    lineHeight: 20,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#3ECF63",
  },
  empty: {
    fontFamily: theme.typography.regular,
    fontSize: 13,
    color: "#918D96",
    textAlign: "center",
    paddingVertical: 28,
  },
  closeBtn: {
    marginTop: 14,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F1F3",
  },
  closeBtnText: {
    fontFamily: theme.typography.semibold,
    fontSize: 14,
    color: "#3E3A44",
  },
});
