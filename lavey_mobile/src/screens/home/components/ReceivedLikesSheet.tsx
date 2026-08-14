import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SlidePanelModal } from "../../../components/common/SlidePanelModal";
import { theme } from "../../../constants/theme";
import type { Profile } from "../../../types";

export function ReceivedLikesSheet({
  visible,
  profiles,
  likedBackIds,
  loading,
  onClose,
  onLikeBack,
  onOpenChat,
  onViewProfile,
}: {
  visible: boolean;
  profiles: Profile[];
  likedBackIds: Set<string>;
  loading: boolean;
  onClose(): void;
  onLikeBack(profile: Profile): Promise<void>;
  onOpenChat(profile: Profile): void;
  onViewProfile(profile: Profile): void;
}) {
  const { width } = useWindowDimensions();
  const gap = 10;
  const horizontalPad = 16;
  const cardWidth = (width - horizontalPad * 2 - gap) / 2;
  const cardHeight = cardWidth * 1.28;
  const [busyId, setBusyId] = useState<string | null>(null);

  const likeBack = async (profile: Profile) => {
    setBusyId(profile.id);
    try {
      await onLikeBack(profile);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SlidePanelModal visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={onClose} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#101018" />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>People who liked you</Text>
          <Text style={styles.subtitle}>{profiles.length ? `${profiles.length} waiting` : "Keep swiping to get more"}</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loading} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={profiles.length ? styles.column : undefined}
          contentContainerStyle={profiles.length ? styles.list : styles.listEmpty}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const reciprocated = likedBackIds.has(item.id);
            return (
              <Pressable style={[styles.card, { width: cardWidth, height: cardHeight }]} onPress={() => onViewProfile(item)}>
                <Image source={{ uri: item.avatar }} style={StyleSheet.absoluteFill} contentFit="cover" />
                <LinearGradient colors={["transparent", "rgba(0,0,0,.72)"]} style={styles.cardGradient} />
                <View style={styles.cardHeart}>
                  <Ionicons name="heart" size={12} color="#FFFFFF" />
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}, {item.age}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.distance}
                  </Text>
                </View>
                <Pressable
                  style={[styles.actionBtn, reciprocated && styles.actionBtnChat]}
                  disabled={busyId === item.id}
                  onPress={(event) => {
                    event.stopPropagation();
                    if (reciprocated) onOpenChat(item);
                    else void likeBack(item);
                  }}
                >
                  {busyId === item.id ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.actionText}>{reciprocated ? "Chat" : "Like back"}</Text>
                  )}
                </Pressable>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="heart-outline" size={32} color="#7c3aed" />
              </View>
              <Text style={styles.emptyTitle}>No likes yet</Text>
              <Text style={styles.emptyCopy}>When someone likes you, they will appear here in a lovely grid.</Text>
            </View>
          }
        />
      )}
    </SlidePanelModal>
  );
}

const styles = StyleSheet.create({
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
  loading: { marginTop: 40 },
  list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 28 },
  listEmpty: { flexGrow: 1, justifyContent: "center" },
  column: { gap: 10, marginBottom: 10 },
  card: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#ECEAEE",
  },
  cardGradient: { ...StyleSheet.absoluteFillObject },
  cardHeart: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 83, 110, .92)",
  },
  cardFooter: { position: "absolute", left: 10, right: 10, bottom: 46 },
  name: { fontFamily: theme.typography.bold, fontSize: 14, color: "#FFFFFF" },
  meta: { fontFamily: theme.typography.regular, fontSize: 11, color: "rgba(255,255,255,.82)", marginTop: 2 },
  actionBtn: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,.22)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,.35)",
  },
  actionBtnChat: { backgroundColor: "#101018", borderColor: "#101018" },
  actionText: { fontFamily: theme.typography.bold, fontSize: 11, color: "#FFFFFF" },
  emptyWrap: { alignItems: "center", paddingHorizontal: 32, paddingVertical: 48, gap: 8 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3EEFF",
    marginBottom: 6,
  },
  emptyTitle: { fontFamily: theme.typography.bold, fontSize: 18, color: "#101018" },
  emptyCopy: { fontFamily: theme.typography.regular, fontSize: 13, color: "#8C8798", textAlign: "center", lineHeight: 19 },
});
