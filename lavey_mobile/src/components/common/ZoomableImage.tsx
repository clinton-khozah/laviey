import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import type { ImageContentFit } from "expo-image";

export function ZoomableImage({ uri, style, onPress, contentFit = "cover" }: { uri: string; style?: StyleProp<ViewStyle>; onPress?(): void; contentFit?: ImageContentFit }) {
  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);

  const pinch = Gesture.Pinch()
    .onStart(() => { startScale.value = scale.value; })
    .onUpdate((event) => { scale.value = Math.min(4, Math.max(1, startScale.value * event.scale)); })
    .onEnd(() => { if (scale.value < 1.03) scale.value = withSpring(1); });

  const reset = Gesture.Tap().numberOfTaps(2).onEnd(() => { scale.value = withSpring(1, { damping: 16 }); });
  const open = Gesture.Tap().numberOfTaps(1).onEnd(() => { if (onPress) runOnJS(onPress)(); });
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={[styles.frame, style]}>
      <GestureDetector gesture={Gesture.Simultaneous(pinch, Gesture.Exclusive(reset, open))}>
        <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit={contentFit} cachePolicy="memory-disk" />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({ frame: { overflow: "hidden", backgroundColor: "#17171C" } });
