import { Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { styles } from "./NameInitialCircle.styles";

const PALETTES = [
  { page: ["#FFF4F8", "#F8D5E4"], circle: ["#FF9EBE", "#FF5C8A"] },
  { page: ["#F7F2FF", "#E6D6FF"], circle: ["#C89BFF", "#8B5CF6"] },
  { page: ["#FFF6F0", "#FFE1D0"], circle: ["#FFB48A", "#FF7A59"] },
  { page: ["#F3F8FF", "#D7E7FF"], circle: ["#8EBEFF", "#4C82F6"] },
  { page: ["#F3FFF7", "#D8F6E6"], circle: ["#67D0AA", "#2FA97A"] },
  { page: ["#FFF9EE", "#FFE8BE"], circle: ["#F6C453", "#E09A2B"] },
] as const;

function firstLetter(name: string): string {
  const word = name.trim().split(/\s+/)[0] ?? "";
  const letter = word.charAt(0).toUpperCase();
  return letter || "?";
}

function paletteFor(letter: string) {
  const code = letter.codePointAt(0) ?? 0;
  return PALETTES[code % PALETTES.length] ?? PALETTES[0];
}

export function NameInitialCircle({ name, size }: { name: string; size?: number }) {
  const letter = firstLetter(name);
  const palette = paletteFor(letter);
  if (size) {
    return (
      <LinearGradient
        colors={palette.circle}
        style={[styles.compact, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <Text style={[styles.compactLetter, { fontSize: size * 0.42, lineHeight: size * 0.48 }]}>{letter}</Text>
      </LinearGradient>
    );
  }
  return (
    <LinearGradient colors={palette.page} style={styles.fill}>
      <LinearGradient colors={palette.circle} style={styles.circle}>
        <Text style={styles.letter}>{letter}</Text>
      </LinearGradient>
    </LinearGradient>
  );
}
