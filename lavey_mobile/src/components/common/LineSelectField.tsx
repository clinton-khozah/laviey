import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../constants/theme";

export type LineSelectOption<T extends string | number> = {
  value: T;
  label: string;
};

export function LineSelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: LineSelectOption<T>[];
  onChange(value: T): void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((item) => item.value === value)?.label ?? String(value);

  return (
    <>
      <View style={styles.wrap}>
        <Text style={styles.label}>{label}</Text>
        <Pressable style={styles.field} onPress={() => setOpen(true)}>
          <Text style={styles.value}>{selected}</Text>
          <Ionicons name="chevron-down" size={16} color="#8C8798" />
        </Pressable>
        <View style={styles.line} />
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <Pressable style={styles.close} onPress={() => setOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={18} color="#8B8990" />
              </Pressable>
            </View>
            {options.map((item) => {
              const active = item.value === value;
              return (
                <Pressable
                  key={String(item.value)}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>{item.label}</Text>
                  {active ? <Ionicons name="checkmark" size={18} color="#101018" /> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    fontFamily: theme.typography.semibold,
    fontSize: 11,
    letterSpacing: 0.35,
    textTransform: "uppercase",
    color: "#8C8798",
  },
  field: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  value: { fontFamily: theme.typography.bold, fontSize: 16, color: "#101018" },
  line: { height: StyleSheet.hairlineWidth, backgroundColor: "#D8D4DC" },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(16,16,24,.45)" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sheetTitle: {
    flex: 1,
    fontFamily: theme.typography.bold,
    fontSize: 16,
    color: "#101018",
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F4F5",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E4E0E6",
  },
  option: {
    minHeight: 48,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#F0EEF2",
  },
  optionActive: { backgroundColor: "#FAFAFC" },
  optionText: { fontFamily: theme.typography.medium, fontSize: 15, color: "#5C5963" },
  optionTextActive: { fontFamily: theme.typography.bold, color: "#101018" },
});
