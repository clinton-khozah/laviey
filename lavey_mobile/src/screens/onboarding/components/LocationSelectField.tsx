import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../constants/theme";
import { UnderlineSelectTrigger } from "./FormUnderline";

export function LocationSelectField({
  label,
  placeholder,
  value,
  options,
  loading = false,
  disabled = false,
  onSelect,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  options: string[];
  loading?: boolean;
  disabled?: boolean;
  onSelect(value: string): void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <>
      <UnderlineSelectTrigger
        label={label}
        placeholder={placeholder}
        value={value}
        loading={loading}
        disabled={disabled}
        active={open}
        onPress={() => {
          setQuery("");
          setOpen(true);
        }}
      />

      <Modal transparent visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <Pressable style={styles.close} onPress={() => setOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={18} color="#8B8990" />
              </Pressable>
            </View>
            <View style={styles.searchWrap}>
              <View style={styles.searchRow}>
                <Ionicons name="search" size={16} color="#B4B0BA" />
                <TextInput
                  style={styles.searchInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder={`Search ${label.toLowerCase()}`}
                  placeholderTextColor="#B8B4BE"
                  selectionColor="#303034"
                  autoFocus
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                />
              </View>
              <View
                style={[
                  styles.searchLine,
                  (searchFocused || query.length > 0) && styles.searchLineActive,
                ]}
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const selected = item === value;
                return (
                  <Pressable
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => {
                      onSelect(item);
                      setOpen(false);
                    }}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{item}</Text>
                    {selected ? <Ionicons name="checkmark" size={18} color="#303034" /> : null}
                  </Pressable>
                );
              }}
              ListEmptyComponent={<Text style={styles.emptyText}>No matches</Text>}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(20,18,24,.5)" },
  sheet: {
    maxHeight: "75%",
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E0E4",
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: "#ECEAEC",
  },
  sheetTitle: { fontFamily: theme.typography.bold, fontSize: 17, color: "#19171E" },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F4F5",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  searchWrap: {
    marginTop: 14,
    marginBottom: 6,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 2,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: theme.typography.semibold,
    fontSize: 16,
    color: "#141218",
    paddingVertical: 0,
    backgroundColor: "transparent",
  },
  searchLine: {
    height: 1.5,
    backgroundColor: "#D8D4DC",
    borderRadius: 1,
  },
  searchLineActive: {
    backgroundColor: "#303034",
  },
  list: { marginTop: 4 },
  listContent: { paddingBottom: 12 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderBottomWidth: 1,
    borderColor: "#F2F0F3",
  },
  optionSelected: { backgroundColor: "#FDF3FA", borderColor: "transparent" },
  optionText: { fontFamily: theme.typography.medium, fontSize: 15, color: "#28242C" },
  optionTextSelected: { fontFamily: theme.typography.semibold, color: "#303034" },
  emptyText: {
    textAlign: "center",
    marginTop: 30,
    fontFamily: theme.typography.regular,
    fontSize: 13.5,
    color: "#9B98A1",
  },
});
