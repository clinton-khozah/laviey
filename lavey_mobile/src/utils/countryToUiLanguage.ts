import type { AppLanguageCode } from "../api/services";

/**
 * Country (free-text, as captured by OnboardingLocationStep's on-device reverse-geocode)
 * → suggested UI language, for the one-time automatic detection prompt only.
 *
 * Deliberately limited to languages with solid translation-model coverage today
 * (see appLanguages.ts on the backend). South Africa is intentionally NOT included —
 * English is already the country's common language and guessing a single official
 * language among 11 risks being wrong for most South African users; SA users can still
 * manually pick Afrikaans/isiZulu/isiXhosa/Sesotho in Settings.
 */
const COUNTRY_UI_LANGUAGE: Record<string, AppLanguageCode> = {
  Spain: "es",
  Mexico: "es",
  Argentina: "es",
  Chile: "es",
  Colombia: "es",
  Peru: "es",
  "Costa Rica": "es",
  Uruguay: "es",
  Ecuador: "es",
  Venezuela: "es",
  France: "fr",
  Belgium: "fr",
  Germany: "de",
  Austria: "de",
  Switzerland: "de",
  Portugal: "pt",
  Brazil: "pt",
  Japan: "ja",
  "South Korea": "ko",
  China: "zh",
  Taiwan: "zh",
};

export function suggestedLanguageForCountry(country?: string | null): AppLanguageCode | null {
  if (!country?.trim()) return null;
  return COUNTRY_UI_LANGUAGE[country.trim()] ?? null;
}
