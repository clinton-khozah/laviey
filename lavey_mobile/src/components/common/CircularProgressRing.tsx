import { StyleSheet, Text, View } from "react-native";
import { theme } from "../../constants/theme";

type CircularProgressRingProps = {
  percent: number;
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  progressColor?: string;
  labelColor?: string;
};

/**
 * Pure React Native progress ring — no react-native-svg, so it works without a native rebuild.
 */
export function CircularProgressRing({
  percent,
  size = 48,
  strokeWidth = 3.5,
  trackColor = "#ECEAEE",
  progressColor = "#7c3aed",
  labelColor = "#101018",
}: CircularProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const half = size / 2;

  const firstHalfDegrees = Math.min(clamped, 50) * 3.6;
  const secondHalfDegrees = clamped > 50 ? (clamped - 50) * 3.6 : 0;

  const ringSegmentStyle = {
    width: size,
    height: size,
    borderRadius: half,
    borderWidth: strokeWidth,
    borderColor: "transparent",
    borderTopColor: progressColor,
    borderRightColor: progressColor,
  } as const;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: half,
          borderWidth: strokeWidth,
          borderColor: trackColor,
        }}
      />

      <View style={[StyleSheet.absoluteFill, { transform: [{ rotate: "-90deg" }] }]}>
        <View style={{ width: half, height: size, overflow: "hidden", position: "absolute", left: half }}>
          <View
            style={[
              ringSegmentStyle,
              {
                position: "absolute",
                left: -half,
                transform: [{ rotate: `${firstHalfDegrees - 180}deg` }],
              },
            ]}
          />
        </View>

        {clamped > 50 ? (
          <View style={{ width: half, height: size, overflow: "hidden", position: "absolute", left: 0 }}>
            <View
              style={[
                ringSegmentStyle,
                {
                  position: "absolute",
                  left: 0,
                  transform: [{ rotate: `${secondHalfDegrees - 180}deg` }],
                },
              ]}
            />
          </View>
        ) : null}
      </View>

      <Text style={[styles.label, { color: labelColor }]}>{clamped}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: theme.typography.bold,
    fontSize: 11,
  },
});
