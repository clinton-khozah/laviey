import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

/** TikTok-style spinning sound disc — spins while this card's theme song is the one playing (or, on screens with no audio state to track, whenever a theme song is set). */
export function ThemeSongDisc({
  albumArtUrl,
  spinning,
  size = 34,
}: {
  albumArtUrl: string | null;
  spinning: boolean;
  size?: number;
}) {
  const rotation = useSharedValue(0);
  useEffect(() => {
    if (spinning) {
      rotation.value = withRepeat(withTiming(rotation.value + 360, { duration: 6000, easing: Easing.linear }), -1);
    } else {
      cancelAnimation(rotation);
    }
    return () => cancelAnimation(rotation);
  }, [spinning, rotation]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return (
    <Animated.View style={[styles.outer, { width: size, height: size, borderRadius: size / 2 }, style]}>
      {albumArtUrl ? (
        <Image source={{ uri: albumArtUrl }} style={[styles.image, { width: size * 0.76, height: size * 0.76, borderRadius: (size * 0.76) / 2 }]} />
      ) : (
        <View style={[styles.image, styles.fallback, { width: size * 0.76, height: size * 0.76, borderRadius: (size * 0.76) / 2 }]}>
          <Ionicons name="musical-notes" size={size * 0.38} color="white" />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderWidth: 2,
    borderColor: "rgba(255,255,255,.85)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1a1a",
  },
  image: {},
  fallback: { alignItems: "center", justifyContent: "center", backgroundColor: "#3a3a3a" },
});
