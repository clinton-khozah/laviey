import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { useLogoReady } from "../../utils/deferLogo";
export function LoadingIndicator({
  fullScreen = false,
  transparent = false,
  compact = false,
}: {
  fullScreen?: boolean;
  label?: string;
  transparent?: boolean;
  compact?: boolean;
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  const logoReady = useLogoReady();
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const heart = (
    <Animated.View
      style={{
        opacity: pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.72, 1],
        }),
        transform: [
          {
            scale: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.94, 1.06],
            }),
          },
        ],
      }}
    >
      {logoReady ? (
        <Image
          source={require("../../../assets/heart-tight.png")}
          contentFit="contain"
          style={fullScreen ? styles.heartLarge : styles.heart}
        />
      ) : (
        <View style={fullScreen ? styles.heartLarge : styles.heart} />
      )}
    </Animated.View>
  );

  if (compact) return heart;

  return (
    <View style={[styles.wrap, fullScreen && styles.full, transparent && styles.transparent]}>
      {heart}
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    width: "100%",
    alignSelf: "stretch",
    minHeight: 110,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FDE7F0",
    zIndex: 100,
    elevation: 100,
  },
  full: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#FDE7F0",
  },
  transparent: { backgroundColor: "transparent" },
  heart: { width: 45, height: 45 },
  heartLarge: { width: 168, height: 168 },
});
