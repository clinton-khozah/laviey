import { useCallback, useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const AnimatedIonicons = Animated.createAnimatedComponent(Ionicons);

type Props = {
  kind: "like" | "crushy";
  onPress(): void;
  disabled?: boolean;
  large?: boolean;
  /** Whether this reaction has already been sent — drives the white -> red/pink fill. */
  active?: boolean;
  /** `overlay` = white heart on dark photos; `plain` = dark heart on light surfaces. */
  tone?: "overlay" | "plain";
};

export function AnimatedReactionButton({
  kind,
  onPress,
  disabled,
  large,
  active = false,
  tone = "overlay",
}: Props) {
  const scale = useSharedValue(1);
  const fill = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    fill.value = withTiming(active ? 1 : 0, { duration: 280 });
  }, [active, fill]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const heartProps = useAnimatedProps(() => ({
    color: large
      ? "white"
      : interpolateColor(
          fill.value,
          [0, 1],
          [tone === "plain" ? "#2A2A2A" : "#FFFFFF", "#FF3860"],
        ),
  }));

  const kissStyle = useAnimatedStyle(() => ({
    opacity: 0.7 + fill.value * 0.3,
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    if (disabled) return;
    if (kind === "like") fill.value = 1;
    // A clean pop on tap — no rotation wiggle, no springy overshoot.
    scale.value = withSequence(
      withTiming(0.85, { duration: 90 }),
      withTiming(1.22, { duration: 150 }),
      withTiming(1, { duration: 150 }),
    );
    onPress();
  }, [disabled, fill, kind, onPress, scale]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={kind === "like" ? "Like profile" : "Send crushy"}
      style={({ pressed }) => [styles.pressable, large && styles.largePressable, pressed && styles.pressed]}
    >
      {kind === "like" ? (
        <Animated.View style={[styles.icon, large && styles.largeIcon, tone === "plain" && styles.plainIcon, iconStyle]}>
          <AnimatedIonicons
            name={tone === "plain" && !active ? "heart-outline" : "heart"}
            size={large ? 34 : 26}
            animatedProps={heartProps}
          />
        </Animated.View>
      ) : (
        <Animated.Text style={[styles.kiss, kissStyle]}>💋</Animated.Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.82 },
  largePressable: { width: 68, height: 68 },
  icon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  largeIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#25B7A5",
    elevation: 4,
    shadowOpacity: 0,
  },
  plainIcon: {
    shadowOpacity: 0,
  },
  kiss: { fontSize: 26, lineHeight: 30 },
});
