import { useCallback, useEffect, useRef } from "react";
import { FlatList, type NativeScrollEvent, type NativeSyntheticEvent, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { theme } from "../../../constants/theme";

const ITEM_WIDTH = 56;
const ITEM_HEIGHT = 68;

function WheelItem({
  label,
  index,
  scrollX,
}: {
  label: string;
  index: number;
  scrollX: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const center = scrollX.value / ITEM_WIDTH;
    const distance = Math.abs(center - index);
    const scale = interpolate(distance, [0, 1, 2], [1.3, 0.94, 0.82], Extrapolation.CLAMP);
    const opacity = interpolate(distance, [0, 1, 2], [1, 0.5, 0.28], Extrapolation.CLAMP);
    return { transform: [{ scale }], opacity };
  });
  return (
    <View style={styles.itemSlot}>
      <Animated.Text style={[styles.itemText, style]}>{label}</Animated.Text>
    </View>
  );
}

export function WheelPicker({
  items,
  selectedIndex,
  onChange,
  width,
}: {
  items: string[];
  selectedIndex: number;
  onChange(index: number): void;
  width: number;
}) {
  const listRef = useRef<FlatList<string>>(null);
  const scrollX = useSharedValue(selectedIndex * ITEM_WIDTH);
  const didMountRef = useRef(false);
  const sidePadding = Math.max(0, (width - ITEM_WIDTH) / 2);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollX.value = event.nativeEvent.contentOffset.x;
    },
    [scrollX],
  );

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / ITEM_WIDTH);
      onChange(Math.max(0, Math.min(items.length - 1, index)));
    },
    [items.length, onChange],
  );

  useEffect(() => {
    listRef.current?.scrollToOffset({
      offset: selectedIndex * ITEM_WIDTH,
      animated: didMountRef.current,
    });
    scrollX.value = selectedIndex * ITEM_WIDTH;
    didMountRef.current = true;
  }, [selectedIndex, scrollX]);

  return (
    <View style={[styles.wrap, { width }]}>
      <View pointerEvents="none" style={styles.centerMarker} />
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(_, index) => String(index)}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        bounces={false}
        contentContainerStyle={{ paddingHorizontal: sidePadding }}
        getItemLayout={(_, index) => ({ length: ITEM_WIDTH, offset: ITEM_WIDTH * index, index })}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumEnd}
        renderItem={({ item, index }) => <WheelItem label={item} index={index} scrollX={scrollX} />}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["#FFFFFF", "rgba(255,255,255,0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.fade, styles.fadeLeft]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(255,255,255,0)", "#FFFFFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.fade, styles.fadeRight]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: ITEM_HEIGHT, justifyContent: "center" },
  itemSlot: { width: ITEM_WIDTH, height: ITEM_HEIGHT, alignItems: "center", justifyContent: "center" },
  itemText: { fontFamily: theme.typography.bold, fontSize: 20, color: "#19171E" },
  centerMarker: {
    position: "absolute",
    left: "50%",
    top: "50%",
    marginLeft: -29,
    marginTop: -29,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#F2F2F3",
    borderWidth: 1.5,
    borderColor: "#D7D7DC",
  },
  fade: { position: "absolute", top: 0, bottom: 0, width: 28 },
  fadeLeft: { left: 0 },
  fadeRight: { right: 0 },
});
