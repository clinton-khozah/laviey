import { useEffect, useRef, useState } from "react";
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions, type ViewToken } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { contentApi } from "../../../api/services";
import { theme } from "../../../constants/theme";
import type { ProfilePost } from "../../../types";

/** Ignore accidental flicks that barely register as a view. */
const MIN_COUNTABLE_DWELL_MS = 300;

type MenuAction = "hide" | "onlyMe" | "copyLink" | "delete";

export function PostViewerModal({
  visible,
  posts,
  startIndex,
  onClose,
  onPostRemoved,
}: {
  visible: boolean;
  posts: ProfilePost[];
  startIndex: number;
  onClose(): void;
  /** Called after a post is deleted or hidden, so the caller can refresh its list. */
  onPostRemoved(): void;
}) {
  const { width, height } = useWindowDimensions();
  const activeIndexRef = useRef(startIndex);
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const viewStartRef = useRef(Date.now());
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const flushDwell = (index: number) => {
    const post = posts[index];
    if (!post) return;
    const dwellMs = Date.now() - viewStartRef.current;
    if (dwellMs < MIN_COUNTABLE_DWELL_MS) return;
    void contentApi.recordView(post.id, dwellMs);
  };

  useEffect(() => {
    if (!visible) return;
    activeIndexRef.current = startIndex;
    setActiveIndex(startIndex);
    viewStartRef.current = Date.now();
    setMenuOpen(false);
    setToast(null);
  }, [visible, startIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (!first || first.index === null || first.index === activeIndexRef.current) return;
    flushDwell(activeIndexRef.current);
    activeIndexRef.current = first.index;
    setActiveIndex(first.index);
    viewStartRef.current = Date.now();
    setMenuOpen(false);
  }).current;

  const handleClose = () => {
    flushDwell(activeIndexRef.current);
    onClose();
  };

  const activePost = posts[activeIndex] ?? null;

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 1600);
  };

  const runDelete = async () => {
    if (!activePost) return;
    setBusy(true);
    try {
      await contentApi.deletePost(activePost.id);
      onPostRemoved();
      onClose();
    } catch (e) {
      Alert.alert("Couldn't delete", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleAction = async (action: MenuAction) => {
    if (!activePost || busy) return;
    setMenuOpen(false);

    if (action === "delete") {
      Alert.alert(
        "Delete this post?",
        "This will permanently remove it from your profile. This can't be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => void runDelete() },
        ],
      );
      return;
    }

    if (action === "copyLink") {
      try {
        const Clipboard = await import("expo-clipboard");
        await Clipboard.setStringAsync(activePost.src);
        showToast("Link copied");
      } catch {
        showToast("Copying isn't available yet — update the app to enable it.");
      }
      return;
    }

    // "hide" and "onlyMe" both take the post off the profile — matches the web app's current behavior.
    setBusy(true);
    try {
      await contentApi.visibility(activePost.id, false);
      onPostRemoved();
      onClose();
    } catch (e) {
      Alert.alert("Couldn't update", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={handleClose}>
      <View style={styles.root}>
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          initialScrollIndex={startIndex}
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          onViewableItemsChanged={onViewableItemsChanged}
          renderItem={({ item }) => (
            <View style={[styles.page, { width, height }]}>
              <Image source={{ uri: item.poster || item.src }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <View style={styles.overlay} pointerEvents="none">
                {item.caption ? (
                  <Text style={styles.caption} numberOfLines={3}>
                    {item.caption}
                  </Text>
                ) : null}
                <View style={styles.statsRow}>
                  <View style={styles.statChip}>
                    <Ionicons name="eye" size={14} color="white" />
                    <Text style={styles.statText}>{item.viewCount ?? 0}</Text>
                  </View>
                  <View style={styles.statChip}>
                    <Ionicons name="heart" size={14} color="white" />
                    <Text style={styles.statText}>{item.likeCount ?? 0}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        />

        <View style={styles.topBar}>
          <Pressable style={styles.iconBtn} onPress={handleClose} hitSlop={10}>
            <Ionicons name="close" size={24} color="white" />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => setMenuOpen((v) => !v)} hitSlop={10} disabled={busy}>
            <Ionicons name="ellipsis-vertical" size={20} color="white" />
          </Pressable>
        </View>

        {menuOpen ? (
          <>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
            <View style={styles.menu}>
              <MenuRow icon="eye-off-outline" label="Hide from profile" onPress={() => void handleAction("hide")} />
              <MenuRow icon="lock-closed-outline" label="Only me" onPress={() => void handleAction("onlyMe")} />
              <MenuRow icon="link-outline" label="Copy link" onPress={() => void handleAction("copyLink")} />
              <MenuRow icon="trash-outline" label="Delete post" danger onPress={() => void handleAction("delete")} />
            </View>
          </>
        ) : null}

        {toast ? (
          <View style={styles.toast} pointerEvents="none">
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress(): void;
  danger?: boolean;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]} onPress={onPress}>
      <Ionicons name={icon} size={18} color={danger ? "#FF4D4D" : "#3E3A44"} />
      <Text style={[styles.menuRowText, danger && styles.menuRowTextDanger]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "black" },
  page: { backgroundColor: "#111" },
  overlay: { position: "absolute", left: 16, right: 16, bottom: 44 },
  caption: { color: "white", fontFamily: theme.typography.medium, fontSize: 14, marginBottom: 10, lineHeight: 19 },
  statsRow: { flexDirection: "row", gap: 10 },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,.45)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statText: { color: "white", fontFamily: theme.typography.semibold, fontSize: 12 },
  topBar: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  menu: {
    position: "absolute",
    top: 96,
    right: 16,
    width: 210,
    backgroundColor: "white",
    borderRadius: 16,
    paddingVertical: 6,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  menuRowPressed: { backgroundColor: "#F4F2F6" },
  menuRowText: { fontFamily: theme.typography.medium, fontSize: 13.5, color: "#3E3A44" },
  menuRowTextDanger: { color: "#FF4D4D" },
  toast: {
    position: "absolute",
    bottom: 120,
    alignSelf: "center",
    backgroundColor: "rgba(20,16,24,.85)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  toastText: { color: "white", fontFamily: theme.typography.semibold, fontSize: 12.5 },
});
