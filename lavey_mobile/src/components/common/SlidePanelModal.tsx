import { useEffect, useRef, useState, type ReactNode } from "react";
import { Modal, StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const SLIDE_IN_MS = 320;
const SLIDE_OUT_MS = 280;
const SLIDE_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);

/** Full-screen panel that slides in from the left. */
export function SlidePanelModal({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose(): void;
  children: ReactNode;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const [presented, setPresented] = useState(false);
  const translateX = useSharedValue(-screenWidth);
  const closingRef = useRef(false);

  const finishDismiss = () => {
    closingRef.current = false;
    setPresented(false);
  };

  useEffect(() => {
    if (visible) {
      closingRef.current = false;
      setPresented(true);
      translateX.value = -screenWidth;
      translateX.value = withTiming(0, { duration: SLIDE_IN_MS, easing: SLIDE_EASING });
      return;
    }

    if (!visible && presented && !closingRef.current) {
      closingRef.current = true;
      translateX.value = withTiming(
        -screenWidth,
        { duration: SLIDE_OUT_MS, easing: SLIDE_EASING },
        (finished) => {
          if (finished) runOnJS(finishDismiss)();
        },
      );
    }
  }, [visible, presented, screenWidth, translateX]);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (!presented) return null;

  return (
    <Modal visible={presented} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.panel, slideStyle]}>
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          {children}
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: "#FAFAFC",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 4, height: 0 },
    elevation: 12,
  },
  safe: { flex: 1, backgroundColor: "#FAFAFC" },
});
