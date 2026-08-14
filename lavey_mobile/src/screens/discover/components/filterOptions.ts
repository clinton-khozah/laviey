import type { Filters } from "./FilterModal";

export const DISTANCE_OPTIONS = [
  { value: 5, label: "5 km" },
  { value: 10, label: "10 km" },
  { value: 25, label: "25 km" },
  { value: 50, label: "50 km" },
  { value: 75, label: "75 km" },
  { value: 100, label: "100 km" },
  { value: 500, label: "Anyone globally" },
] as const;

export type AgeRangeKey = "18-24" | "25-34" | "35-44" | "45-54" | "55+" | "any";

export const AGE_RANGE_OPTIONS: { value: AgeRangeKey; label: string; ageMin: number; ageMax: number }[] = [
  { value: "18-24", label: "18 – 24", ageMin: 18, ageMax: 24 },
  { value: "25-34", label: "25 – 34", ageMin: 25, ageMax: 34 },
  { value: "35-44", label: "35 – 44", ageMin: 35, ageMax: 44 },
  { value: "45-54", label: "45 – 54", ageMin: 45, ageMax: 54 },
  { value: "55+", label: "55+", ageMin: 55, ageMax: 70 },
  { value: "any", label: "Any age", ageMin: 18, ageMax: 70 },
];

export function ageRangeKeyFromFilters(filters: Pick<Filters, "ageMin" | "ageMax">): AgeRangeKey {
  const match = AGE_RANGE_OPTIONS.find(
    (item) => item.ageMin === filters.ageMin && item.ageMax === filters.ageMax,
  );
  return match?.value ?? "any";
}

export function filtersFromAgeRangeKey(key: AgeRangeKey): { ageMin: number; ageMax: number } {
  const item = AGE_RANGE_OPTIONS.find((option) => option.value === key) ?? AGE_RANGE_OPTIONS[5];
  return { ageMin: item.ageMin, ageMax: item.ageMax };
}
