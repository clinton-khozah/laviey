/** Converts an ISO 3166-1 alpha-2 code (e.g. "ZA") to its flag emoji via regional indicator symbols. */
export function flagEmoji(iso2: string): string {
  const code = iso2.trim().toUpperCase();
  if (code.length !== 2) return "🌍";
  const points = [...code].map((char) => 0x1f1e6 + (char.charCodeAt(0) - 65));
  return String.fromCodePoint(...points);
}
