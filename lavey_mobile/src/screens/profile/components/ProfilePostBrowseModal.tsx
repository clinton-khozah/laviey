import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ViewToken,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../../constants/theme";
import type { ProfilePost } from "../../../types";

export function ProfilePostBrowseModal({
  visible,
  posts,
  startIndex,
  onClose,
}: {
  visible: boolean;
  posts: ProfilePost[];
  startIndex: number;
  onClose(): void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ProfilePost>>(null);
  const activeIndexRef = useRef(startIndex);
  const [activeIndex, setActiveIndex] = useState(startIndex);

  useEffect(() => {
    if (!visible) return;
    activeIndexRef.current = startIndex;
    setActiveIndex(startIndex);
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: startIndex, animated: false });
    });
  }, [visible, startIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (!first || first.index === null || first.index === activeIndexRef.current) return;
    activeIndexRef.current = first.index;
    setActiveIndex(first.index);
  }).current;

  const goTo = (index: number) => {
    if (index < 0 || index >= posts.length) return;
    listRef.current?.scrollToIndex({ index, animated: true });
    activeIndexRef.current = index;
    setActiveIndex(index);
  };

  if (!visible || posts.length === 0) return null;

  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < posts.length - 1;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <FlatList
          ref={listRef}
          data={posts}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={startIndex}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          onViewableItemsChanged={onViewableItemsChanged}
          renderItem={({ item }) => (
            <View style={[styles.page, { width, height }]}>
              <Image source={{ uri: item.poster || item.src }} style={StyleSheet.absoluteFill} contentFit="cover" />
              {item.caption ? (
                <View style={styles.overlay} pointerEvents="none">
                  <Text style={styles.caption} numberOfLines={4}>
                    {item.caption}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        />

        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable style={styles.iconBtn} onPress={onClose} hitSlop={10} accessibilityLabel="Close post">
            <Ionicons name="chevron-down" size={24} color="white" />
          </Pressable>
          {posts.length > 1 ? (
            <Text style={styles.counter}>
              {activeIndex + 1} / {posts.length}
            </Text>
          ) : null}
        </View>

        {posts.length > 1 ? (
          <>
            {canGoPrev ? (
              <Pressable
                style={[styles.navBtn, styles.navBtnLeft, { top: height / 2 - 22 }]}
                onPress={() => goTo(activeIndex - 1)}
                hitSlop={12}
                accessibilityLabel="Previous post"
              >
                <Ionicons name="chevron-back" size={28} color="white" />
              </Pressable>
            ) : null}
            {canGoNext ? (
              <Pressable
                style={[styles.navBtn, styles.navBtnRight, { top: height / 2 - 22 }]}
                onPress={() => goTo(activeIndex + 1)}
                hitSlop={12}
                accessibilityLabel="Next post"
              >
                <Ionicons name="chevron-forward" size={28} color="white" />
              </Pressable>
            ) : null}
          </>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "black" },
  page: { backgroundColor: "#111" },
  overlay: { position: "absolute", left: 16, right: 16, bottom: 44 },
  caption: { color: "white", fontFamily: theme.typography.medium, fontSize: 14, lineHeight: 19 },
  topBar: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(20,20,24,.58)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    color: "white",
    fontFamily: theme.typography.semibold,
    fontSize: 12,
    backgroundColor: "rgba(20,20,24,.58)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    overflow: "hidden",
  },
  navBtn: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(20,20,24,.52)",
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnLeft: { left: 10 },
  navBtnRight: { right: 10 },
});
