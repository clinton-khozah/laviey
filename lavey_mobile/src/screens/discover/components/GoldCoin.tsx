import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

/** A realistic-looking gold coin (layered gradients + dashed rim), matching the web app's chat-credit coin design. */
export function GoldCoin({ size = 56, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  const rim = size * 0.06;
  const faceSize = size * 0.62;
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2 }, styles.wrap, style]}>
      <LinearGradient
        colors={["#fff2a6", "#f9c83d", "#c57909", "#f4b92b", "#8f5004"]}
        locations={[0, 0.24, 0.63, 0.82, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: size / 2, borderWidth: rim, borderColor: "#9b5c08" }]}
      />
      <LinearGradient
        colors={["rgba(255,255,255,.85)", "rgba(255,255,255,0)"]}
        start={{ x: 0.1, y: 0.05 }}
        end={{ x: 0.6, y: 0.55 }}
        style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.dashedRing,
          { borderRadius: (size - rim * 2) / 2, top: rim * 1.5, left: rim * 1.5, right: rim * 1.5, bottom: rim * 1.5 },
        ]}
      />
      <LinearGradient
        colors={["#ffe87a", "#dda016"]}
        start={{ x: 0.3, y: 0.2 }}
        end={{ x: 0.9, y: 0.9 }}
        style={[
          styles.face,
          { width: faceSize, height: faceSize, borderRadius: faceSize / 2 },
        ]}
      >
        <Ionicons name="chatbubble-ellipses" size={faceSize * 0.5} color="#875006" />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3d2301",
    shadowOpacity: 0.35,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  dashedRing: {
    position: "absolute",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(112,61,2,.62)",
  },
  face: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(130,75,3,.55)",
  },
});
