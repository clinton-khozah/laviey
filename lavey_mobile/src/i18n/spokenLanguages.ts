import type { AppLanguageCode } from "../api/services";

/** The 10 most spoken languages, shown in their own names. */
export const SPOKEN_LANGUAGES = [
  { code: "en", nativeLabel: "English" },
  { code: "zh", nativeLabel: "中文" },
  { code: "hi", nativeLabel: "हिन्दी" },
  { code: "es", nativeLabel: "Español" },
  { code: "fr", nativeLabel: "Français" },
  { code: "ar", nativeLabel: "العربية" },
  { code: "bn", nativeLabel: "বাংলা" },
  { code: "pt", nativeLabel: "Português" },
  { code: "ru", nativeLabel: "Русский" },
  { code: "ur", nativeLabel: "اردو" },
] as const;

export type SpokenLanguageCode = (typeof SPOKEN_LANGUAGES)[number]["code"];

const SPOKEN_CODES = new Set<string>(SPOKEN_LANGUAGES.map((item) => item.code));

export function isSpokenLanguage(code: string | null | undefined): code is SpokenLanguageCode {
  return !!code && SPOKEN_CODES.has(code);
}

export function spokenLanguageLabel(code: AppLanguageCode): string {
  return SPOKEN_LANGUAGES.find((item) => item.code === code)?.nativeLabel ?? "English";
}
