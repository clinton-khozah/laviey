import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { theme } from "../../../constants/theme";

const FILL_COLORS = ["#A735E8", "#C83DE0", "#FF7455"] as const;

export function CircleProgress({
  progress,
  currentStep,
  totalSteps,
}: {
  /** 0..1 */
  progress: number;
  currentStep: number;
  totalSteps: number;
}) {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(Math.max(0, Math.min(1, progress)), {
      duration: 480,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, animatedProgress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%`,
  }));

  const pct = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0;

  return (
    <View style={styles.root}>
      <View style={styles.labelRow}>
        <Text style={styles.stepLabel}>
          Step {currentStep} of {totalSteps}
        </Text>
        <Text style={styles.pctLabel}>{pct}%</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fillWrap, fillStyle]}>
          <LinearGradient
            colors={[...FILL_COLORS]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.fill}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    gap: 7,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepLabel: {
    fontFamily: theme.typography.bold,
    fontSize: 10.5,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: "#8F8B93",
  },
  pctLabel: {
    fontFamily: theme.typography.semibold,
    fontSize: 10.5,
    letterSpacing: 0.3,
    color: "#B4B0BA",
  },
  track: {
    height: 5,
    borderRadius: 999,
    backgroundColor: "#EBE8EE",
    overflow: "hidden",
  },
  fillWrap: {
    height: "100%",
    minWidth: 5,
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: {
    flex: 1,
    borderRadius: 999,
    shadowColor: "#A735E8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
});
