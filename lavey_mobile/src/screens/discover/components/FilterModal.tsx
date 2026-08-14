import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LineSelectField } from "../../../components/common/LineSelectField";
import { theme } from "../../../constants/theme";
import {
  AGE_RANGE_OPTIONS,
  DISTANCE_OPTIONS,
  ageRangeKeyFromFilters,
  filtersFromAgeRangeKey,
  type AgeRangeKey,
} from "./filterOptions";

export type GenderFilter = "woman" | "man" | "nonbinary";

export type Filters = {
  verifiedOnly: boolean;
  hasProfilePhoto: boolean;
  maxDistanceKm: number;
  ageMin: number;
  ageMax: number;
  genders: GenderFilter[];
};

export function FilterModal({
  visible,
  filters,
  onChange,
  onClose,
  onApply,
}: {
  visible: boolean;
  filters: Filters;
  onChange(value: Filters): void;
  onClose(): void;
  onApply(): void;
}) {
  const ageKey = ageRangeKeyFromFilters(filters);

  const toggleGender = (gender: GenderFilter) =>
    onChange({
      ...filters,
      genders: filters.genders.includes(gender)
        ? filters.genders.filter((item) => item !== gender)
        : [...filters.genders, gender],
    });

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <Pressable style={styles.close} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={18} color="#8B8990" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            <LineSelectField
              label="Maximum distance"
              value={filters.maxDistanceKm}
              options={DISTANCE_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
              onChange={(maxDistanceKm) => onChange({ ...filters, maxDistanceKm })}
            />

            <LineSelectField
              label="Age range"
              value={ageKey}
              options={AGE_RANGE_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
              onChange={(key: AgeRangeKey) => onChange({ ...filters, ...filtersFromAgeRangeKey(key) })}
            />

            <Toggle
              label="Only with profile photos"
              hint="Hide profiles without a profile photo"
              value={filters.hasProfilePhoto}
              onChange={(hasProfilePhoto) => onChange({ ...filters, hasProfilePhoto })}
            />
            <Toggle
              label="Verified only"
              hint="Show people with the blue verified badge"
              value={filters.verifiedOnly}
              onChange={(verifiedOnly) => onChange({ ...filters, verifiedOnly })}
            />

            <Text style={styles.genderLabel}>Show me</Text>
            <View style={styles.genderRow}>
              {(["woman", "man", "nonbinary"] as GenderFilter[]).map((gender) => {
                const active = filters.genders.includes(gender);
                return (
                  <Pressable
                    key={gender}
                    onPress={() => toggleGender(gender)}
                    style={[styles.gender, active && styles.genderActive]}
                  >
                    <Ionicons
                      name={active ? "checkmark-circle" : "ellipse-outline"}
                      size={15}
                      color={active ? "#FFFFFF" : "#777"}
                    />
                    <Text style={[styles.genderText, active && styles.genderTextActive]}>
                      {gender === "nonbinary" ? "Non-binary" : gender[0].toUpperCase() + gender.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <Pressable style={styles.apply} onPress={onApply}>
            <Text style={styles.applyText}>Apply filters</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange(value: boolean): void;
}) {
  return (
    <View style={styles.toggle}>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: "#D9D9DC", true: "#101018" }} thumbColor="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,.48)" },
  sheet: {
    maxHeight: "88%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#ECEAEC",
  },
  title: { fontFamily: theme.typography.bold, fontSize: 19, color: "#101018" },
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
  body: { gap: 20, paddingVertical: 18 },
  genderLabel: {
    fontFamily: theme.typography.semibold,
    fontSize: 11,
    letterSpacing: 0.35,
    textTransform: "uppercase",
    color: "#8C8798",
    marginTop: 4,
  },
  genderRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  gender: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: "#F3F2F5",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E4E0E6",
  },
  genderActive: { backgroundColor: "#101018", borderColor: "#101018" },
  genderText: { fontFamily: theme.typography.semibold, fontSize: 12, color: "#5C5963" },
  genderTextActive: { color: "#FFFFFF" },
  toggle: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  toggleCopy: { flex: 1 },
  toggleLabel: { fontFamily: theme.typography.bold, fontSize: 13, color: "#101018" },
  hint: { fontFamily: theme.typography.regular, fontSize: 11, color: "#8C8798", marginTop: 2, lineHeight: 15 },
  apply: {
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#101018",
    marginTop: 8,
  },
  applyText: { fontFamily: theme.typography.bold, fontSize: 15, color: "#FFFFFF" },
});
