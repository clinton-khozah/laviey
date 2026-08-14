import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { theme } from "../../../constants/theme";

export function VibePointsBadge({ points }: { points: number }) {
  const scale = useSharedValue(1);
  const spin = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.26, { duration: 120 }),
      withSpring(1, { damping: 8, stiffness: 220 }),
    );
    spin.value = withSequence(
      withTiming(1, { duration: 0 }),
      withTiming(0, { duration: 420 }),
    );
  }, [points, scale, spin]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${spin.value * 360}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.wrap, style]}>
      <LinearGradient
        colors={["#FFE38C", "#FFB23D", "#FF8A3D"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.coin}
      >
        <Text style={styles.icon}>🪙</Text>
        <Text style={styles.text}>{points}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    shadowColor: "#FF8A3D",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  coin: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF3D2",
  },
  icon: { fontSize: 15, marginBottom: -2 },
  text: { fontFamily: theme.typography.bold, fontSize: 12, color: "#7A3E00" },
});
