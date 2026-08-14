import { useMemo } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { theme } from "../../../constants/theme";
import { WheelPicker } from "./WheelPicker";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type BirthdateValue = { day: number; month: number; year: number };

function daysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function BirthdateScroller({
  value,
  onChange,
}: {
  value: BirthdateValue;
  onChange(value: BirthdateValue): void;
}) {
  const { width } = useWindowDimensions();
  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 90;
  const maxYear = currentYear - 18;

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = maxYear; y >= minYear; y -= 1) list.push(y);
    return list;
  }, [minYear, maxYear]);

  const dayCount = daysInMonth(value.month, value.year);
  const days = useMemo(
    () => Array.from({ length: dayCount }, (_, i) => String(i + 1)),
    [dayCount],
  );
  const yearIndex = Math.max(0, years.indexOf(value.year));
  const pickerWidth = Math.min((width - 56) / 3, 104);

  return (
    <View style={styles.row}>
      <View style={styles.col}>
        <WheelPicker
          items={days}
          selectedIndex={Math.min(value.day, dayCount) - 1}
          onChange={(index) => onChange({ ...value, day: index + 1 })}
          width={pickerWidth}
        />
        <Text style={styles.colLabel}>Day</Text>
      </View>
      <View style={styles.col}>
        <WheelPicker
          items={MONTHS}
          selectedIndex={value.month}
          onChange={(index) => {
            const nextDayCount = daysInMonth(index, value.year);
            onChange({ ...value, month: index, day: Math.min(value.day, nextDayCount) });
          }}
          width={pickerWidth}
        />
        <Text style={styles.colLabel}>Month</Text>
      </View>
      <View style={styles.col}>
        <WheelPicker
          items={years.map(String)}
          selectedIndex={yearIndex}
          onChange={(index) => {
            const nextYear = years[index] ?? value.year;
            const nextDayCount = daysInMonth(value.month, nextYear);
            onChange({ ...value, year: nextYear, day: Math.min(value.day, nextDayCount) });
          }}
          width={pickerWidth}
        />
        <Text style={styles.colLabel}>Year</Text>
      </View>
    </View>
  );
}

export function birthdateToISODate(value: BirthdateValue): string {
  const month = String(value.month + 1).padStart(2, "0");
  const day = String(value.day).padStart(2, "0");
  return `${value.year}-${month}-${day}`;
}

export function defaultBirthdateValue(): BirthdateValue {
  const year = new Date().getFullYear() - 25;
  return { day: 1, month: 0, year };
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  col: { alignItems: "center", gap: 8 },
  colLabel: {
    fontFamily: theme.typography.semibold,
    fontSize: 11,
    color: "rgba(255,255,255,.45)",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
