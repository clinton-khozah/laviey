import { useMemo } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { theme } from "../../../constants/theme";
import { WheelPicker } from "./WheelPicker";

const MIN_AGE = 18;
const MAX_AGE = 99;

export function AgeScroller({
  age,
  onChange,
}: {
  age: number;
  onChange(age: number): void;
}) {
  const { width } = useWindowDimensions();
  const ages = useMemo(
    () => Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => String(MIN_AGE + i)),
    [],
  );
  const pickerWidth = Math.min(width - 80, 220);

  return (
    <View style={styles.wrap}>
      <WheelPicker
        items={ages}
        selectedIndex={Math.max(0, Math.min(ages.length - 1, age - MIN_AGE))}
        onChange={(index) => onChange(MIN_AGE + index)}
        width={pickerWidth}
      />
      <Text style={styles.label}>years old</Text>
    </View>
  );
}

/** Synthesizes a DOB using today's month/day so the computed age always matches exactly. */
export function ageToISODate(age: number): string {
  const today = new Date();
  const year = today.getFullYear() - age;
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const DEFAULT_AGE = 25;

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 6 },
  label: {
    fontFamily: theme.typography.semibold,
    fontSize: 12,
    color: "#8F8B93",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
