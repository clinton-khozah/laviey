import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AppLanguageCode } from "../../api/services";
import { SPOKEN_LANGUAGES, type SpokenLanguageCode } from "../../i18n/spokenLanguages";

export function LanguagePickerButton({
  language,
  title,
  onSelect,
}: {
  language: AppLanguageCode;
  title: string;
  onSelect(code: SpokenLanguageCode): void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={10}
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        <Ionicons name="globe-outline" size={22} color="#18181B" />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.card} onPress={() => undefined}>
            <View style={styles.head}>
              <Text style={styles.title}>{title}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={22} color="#18181B" />
              </Pressable>
            </View>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {SPOKEN_LANGUAGES.map((item) => {
              const selected = item.code === language;
              return (
                <Pressable
                  key={item.code}
                  style={[styles.row, selected && styles.rowOn]}
                  onPress={() => {
                    setOpen(false);
                    onSelect(item.code);
                  }}
                >
                  <Text style={[styles.label, selected && styles.labelOn]}>{item.nativeLabel}</Text>
                  {selected ? <Ionicons name="checkmark" size={18} color="#18181B" /> : null}
                </Pressable>
              );
            })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F3F6",
  },
  backdrop: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(0,0,0,0.34)",
  },
  card: {
    maxHeight: "78%",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#18181B",
  },
  list: { flexGrow: 0 },
  row: {
    minHeight: 46,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FAFAFA",
  },
  rowOn: { backgroundColor: "#F3F2F4" },
  label: { fontSize: 16, color: "#3D3D46" },
  labelOn: { fontWeight: "600", color: "#18181B" },
});
