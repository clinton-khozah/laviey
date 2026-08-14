import { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { geoApi } from "../../../api/services";
import { theme } from "../../../constants/theme";
import { flagEmoji } from "../../../utils/flagEmoji";

type Country = { name: string; iso2: string };

export function CountryFilterSheet({
  visible,
  selected,
  onChange,
  onClose,
}: {
  visible: boolean;
  selected: string[];
  onChange(countries: string[]): void;
  onClose(): void;
}) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<string[]>(selected);

  const loadCountries = () => {
    setLoading(true);
    setError(null);
    void geoApi
      .countries()
      .then(setCountries)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load countries."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!visible) return;
    setDraft(selected);
    setQuery("");
    if (countries.length > 0) return;
    loadCountries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) => c.name.toLowerCase().includes(q));
  }, [countries, query]);

  const toggle = (name: string) => {
    setDraft((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>
              Countries{draft.length > 0 ? ` · ${draft.length}` : ""}
            </Text>
            <Pressable style={styles.close} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={20} color="#888" />
            </Pressable>
          </View>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color="#9A96A0" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search countries"
              placeholderTextColor="#B0ACB4"
              style={styles.searchInput}
              autoCapitalize="none"
            />
          </View>
          {draft.length > 0 ? (
            <Pressable onPress={() => setDraft([])} hitSlop={6} style={styles.clearRow}>
              <Text style={styles.clearText}>Clear selection</Text>
            </Pressable>
          ) : null}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.iso2}
            showsVerticalScrollIndicator={false}
            style={styles.list}
            refreshing={loading}
            renderItem={({ item }) => {
              const on = draft.includes(item.name);
              return (
                <Pressable style={styles.row} onPress={() => toggle(item.name)}>
                  <Text style={styles.flag}>{flagEmoji(item.iso2)}</Text>
                  <Text style={styles.name}>{item.name}</Text>
                  <View style={[styles.checkbox, on && styles.checkboxOn]}>
                    {on ? <Ionicons name="checkmark" size={13} color="white" /> : null}
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              loading ? null : error ? (
                <View style={styles.errorWrap}>
                  <Text style={styles.errorText}>{error}</Text>
                  <Pressable style={styles.retryBtn} onPress={loadCountries}>
                    <Text style={styles.retryText}>Try again</Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={styles.empty}>No countries match &quot;{query}&quot;</Text>
              )
            }
          />
          <Pressable
            style={styles.apply}
            onPress={() => {
              onChange(draft);
              onClose();
            }}
          >
            <Text style={styles.applyText}>
              {draft.length > 0 ? `Show ${draft.length} ${draft.length === 1 ? "country" : "countries"}` : "Show worldwide"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,.55)" },
  sheet: {
    height: "82%",
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#EEE",
    paddingBottom: 12,
  },
  title: { fontFamily: theme.typography.bold, fontSize: 19 },
  close: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F3F3",
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F2F2F3",
    borderRadius: 13,
    paddingHorizontal: 13,
    marginTop: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontFamily: theme.typography.regular,
    fontSize: 14,
    color: theme.colors.text,
  },
  clearRow: { alignSelf: "flex-end", marginTop: 10 },
  clearText: { fontFamily: theme.typography.semibold, fontSize: 12, color: "#FF6670" },
  list: { flex: 1, marginTop: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderColor: "#F3F2F4",
  },
  flag: { fontSize: 22 },
  name: { flex: 1, fontFamily: theme.typography.medium, fontSize: 14, color: theme.colors.text },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#D6D3D9",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { backgroundColor: "#FF6670", borderColor: "#FF6670" },
  empty: {
    textAlign: "center",
    marginTop: 40,
    fontFamily: theme.typography.regular,
    color: "#9A96A0",
    fontSize: 13,
  },
  errorWrap: { alignItems: "center", marginTop: 40, gap: 12, paddingHorizontal: 20 },
  errorText: {
    textAlign: "center",
    fontFamily: theme.typography.medium,
    color: "#C33",
    fontSize: 13,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: "#F2F2F3",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  retryText: { fontFamily: theme.typography.semibold, fontSize: 13, color: "#24212A" },
  apply: {
    height: 49,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6670",
    marginVertical: 14,
  },
  applyText: { color: "white", fontFamily: theme.typography.bold, fontSize: 15 },
});
