import { useEffect } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { theme } from "../../../constants/theme";

const LOGO_MARK = require("../../../../assets/heart-tight.png");

function Dot({ delay }: { delay: number }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0, { duration: 800 })), -1),
    );
  }, [delay, t]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 1], [0.35, 1]),
    transform: [{ translateY: interpolate(t.value, [0, 1], [0, -4]) }],
  }));

  return <Animated.View style={[styles.dot, style]} />;
}

function LoadingDots() {
  return (
    <View style={styles.dotsRow}>
      <Dot delay={0} />
      <Dot delay={150} />
      <Dot delay={300} />
    </View>
  );
}

/**
 * Shown while the quiz submission is in flight — mirrors the web app's
 * "Wait — we're finding your best match!" overlay (logo + bouncing dots)
 * so people see the same moment on both platforms.
 */
export function OnboardingMatchingOverlay({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry(): void;
}) {
  const logoScale = useSharedValue(0.94);
  const titlePulse = useSharedValue(0);

  useEffect(() => {
    if (error) return;
    logoScale.value = withRepeat(
      withSequence(withTiming(1.06, { duration: 650 }), withTiming(0.94, { duration: 650 })),
      -1,
      true,
    );
    titlePulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 800 }), withTiming(0, { duration: 800 })),
      -1,
      true,
    );
  }, [error, logoScale, titlePulse]);

  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: logoScale.value }] }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(titlePulse.value, [0, 1], [1, 0.88]),
    transform: [{ scale: interpolate(titlePulse.value, [0, 1], [1, 1.02]) }],
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(180)}
      style={styles.root}
      pointerEvents="auto"
    >
      <View style={styles.backdrop} />
      <View style={styles.card}>
        {error ? (
          <>
            <Text style={styles.kicker}>We hit a snag</Text>
            <Text style={styles.title}>Couldn&apos;t finish matching</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.button} onPress={onRetry}>
              <Text style={styles.buttonText}>Try again</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Animated.View style={logoStyle}>
              <Image source={LOGO_MARK} style={styles.logo} resizeMode="contain" />
            </Animated.View>
            <Text style={styles.kicker}>Almost there</Text>
            <Animated.Text style={[styles.title, titleStyle]}>
              Wait — we&apos;re finding your best match!
            </Animated.Text>
            <Text style={styles.subtitle}>
              Your profile is set. Please wait while we find someone who aligns with what you&apos;re looking for.
            </Text>
            <LoadingDots />
          </>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
  },
  card: {
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  logo: { width: 84, height: 84, marginBottom: 18 },
  kicker: {
    fontFamily: theme.typography.bold,
    fontSize: 11,
    color: "#303034",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: theme.typography.bold,
    fontSize: 22,
    color: "#19171E",
    textAlign: "center",
    marginTop: 6,
  },
  subtitle: {
    fontFamily: theme.typography.regular,
    fontSize: 14,
    color: "#6B6771",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 22,
    height: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#303034",
  },
  errorText: {
    fontFamily: theme.typography.regular,
    fontSize: 13.5,
    color: "#E23B3B",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 19,
  },
  button: {
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 32,
    backgroundColor: "#303034",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  buttonText: { fontFamily: theme.typography.bold, fontSize: 15, color: "white" },
});
