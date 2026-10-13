import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useAuth } from "../../hooks/useAuth";

type SignInLoaderValue = {
  active: boolean;
  anchorY: number | null;
  start(): void;
  finish(): void;
  setAnchor(y: number): void;
};

const SignInLoaderContext = createContext<SignInLoaderValue | null>(null);

export function SignInLoaderProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [anchorY, setAnchorY] = useState<number | null>(null);
  const start = useCallback(() => setActive(true), []);
  const finish = useCallback(() => setActive(false), []);
  const setAnchor = useCallback((y: number) => setAnchorY(y), []);
  const value = useMemo(
    () => ({ active, anchorY, start, finish, setAnchor }),
    [active, anchorY, start, finish, setAnchor],
  );
  return <SignInLoaderContext.Provider value={value}>{children}</SignInLoaderContext.Provider>;
}

export function useSignInLoader() {
  const value = useContext(SignInLoaderContext);
  if (!value) {
    throw new Error("useSignInLoader must be used within SignInLoaderProvider");
  }
  return value;
}

/** Holds the login heart in its slid-down place until For You is ready. */
export function SignInHeartOverlay() {
  const { active, anchorY } = useSignInLoader();
  const { session } = useAuth();
  const pulse = useSharedValue(0);
  const show = active && Boolean(session) && anchorY !== null;

  useEffect(() => {
    if (!show) {
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 650, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 650, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [pulse, show]);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: 150 },
      { scale: 1.28 * (0.94 + pulse.value * 0.12) },
    ],
  }));

  if (!show || anchorY === null) return null;

  return (
    <View style={styles.cover} pointerEvents="auto">
      <Animated.Image
        source={require("../../../assets/heart-tight.png")}
        resizeMode="contain"
        style={[styles.heart, { top: anchorY }, heartStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    elevation: 40,
    backgroundColor: "#FFFFFF",
  },
  heart: {
    position: "absolute",
    alignSelf: "center",
    width: 96,
    height: 96,
  },
});
