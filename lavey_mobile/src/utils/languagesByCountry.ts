/**
 * Maps a detected country to the option keys (from the "languages" onboarding
 * catalog — see lavey-backend sql/066_onboarding_languages.sql) most relevant
 * there, ordered by prevalence. Used to surface the right languages first
 * instead of always leading with the South Africa-heavy default order.
 */
const COUNTRY_LANGUAGE_KEYS: Record<string, string[]> = {
  "South Africa": [
    "zulu", "xhosa", "afrikaans", "english", "sotho",
    "tswana", "pedi", "tsonga", "venda", "ndebele", "swati",
  ],
  Mozambique: ["portuguese", "english"],
  Angola: ["portuguese", "english"],
  Portugal: ["portuguese", "english"],
  Brazil: ["portuguese", "english"],
  "Cape Verde": ["portuguese", "english"],
  "Guinea-Bissau": ["portuguese", "english"],
  "São Tomé and Príncipe": ["portuguese", "english"],
  France: ["french", "english"],
  Belgium: ["french", "english"],
  Switzerland: ["french", "english"],
  Madagascar: ["french", "english"],
  Senegal: ["french", "english"],
  Mali: ["french", "english"],
  "Ivory Coast": ["french", "english"],
  "Côte d’Ivoire": ["french", "english"],
  "Democratic Republic of the Congo": ["french", "english"],
  "Republic of the Congo": ["french", "english"],
  Cameroon: ["french", "english"],
  Spain: ["spanish", "english"],
  Mexico: ["spanish", "english"],
  Argentina: ["spanish", "english"],
  Colombia: ["spanish", "english"],
  Chile: ["spanish", "english"],
  Peru: ["spanish", "english"],
  Venezuela: ["spanish", "english"],
  "Equatorial Guinea": ["spanish", "english"],
  "United States": ["english", "spanish"],
  "United States of America": ["english", "spanish"],
};

/** Ordered list of language option keys most relevant to `country`, or `[]` if unknown. */
export function languageKeysForCountry(country?: string | null): string[] {
  if (!country) return [];
  return COUNTRY_LANGUAGE_KEYS[country.trim()] ?? [];
}

/**
 * Sorts language options so the ones relevant to `country` lead the list
 * (in the given priority order), the rest keep their original relative
 * order behind them, and an "other" catch-all option always stays last.
 */
export function sortLanguageOptionsForCountry<T extends { key: string }>(
  options: T[],
  country?: string | null,
): T[] {
  const priority = languageKeysForCountry(country);
  if (!priority.length) return options;
  const rank = new Map(priority.map((key, index) => [key, index]));
  return [...options].sort((a, b) => {
    if (a.key === "other") return 1;
    if (b.key === "other") return -1;
    const rankA = rank.has(a.key) ? rank.get(a.key)! : priority.length;
    const rankB = rank.has(b.key) ? rank.get(b.key)! : priority.length;
    return rankA - rankB;
  });
}
