import { StyleSheet, View } from "react-native";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Green if active in the last 24h, orange up to a month, red beyond that. */
function presenceColor(lastActiveAt?: string): string | null {
  if (!lastActiveAt) return null;
  const last = new Date(lastActiveAt).getTime();
  if (Number.isNaN(last)) return null;
  const elapsed = Date.now() - last;
  if (elapsed < DAY_MS) return "#3ECF63";
  if (elapsed < 30 * DAY_MS) return "#FF9F43";
  return "#FF4D4D";
}

export function PresenceDot({ lastActiveAt, size = 11 }: { lastActiveAt?: string; size?: number }) {
  const color = presenceColor(lastActiveAt);
  if (!color) return null;
  return (
    <View
      style={[
        styles.dot,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color, borderWidth: size > 8 ? 1.5 : 1 },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: { borderColor: "white" },
});
