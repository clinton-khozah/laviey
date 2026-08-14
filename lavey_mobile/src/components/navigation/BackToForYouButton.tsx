import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { navigateToForYou } from "../../utils/navigateToForYou";

type BackToForYouButtonProps = {
  variant?: "light" | "dark" | "ghost";
  style?: StyleProp<ViewStyle>;
};

export function BackToForYouButton({ variant = "light", style }: BackToForYouButtonProps) {
  const navigation = useNavigation<NavigationProp<Record<string, unknown>>>();
  const palette = VARIANTS[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back to For You"
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed && styles.pressed,
        style,
      ]}
      onPress={() => navigateToForYou(navigation)}
    >
      <Ionicons name="chevron-back" size={22} color={palette.icon} />
    </Pressable>
  );
}

const VARIANTS = {
  light: { bg: "#FFFFFF", border: "#E6E8ED", icon: "#1F2430" },
  dark: { bg: "#FFFFFF", border: "rgba(255,255,255,0.22)", icon: "#101018" },
  ghost: { bg: "rgba(255,255,255,0.88)", border: "rgba(0,0,0,0.06)", icon: "#1F2430" },
} as const;

const styles = StyleSheet.create({
  base: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#101018",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.97 }],
  },
});
