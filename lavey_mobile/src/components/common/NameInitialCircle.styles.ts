import { StyleSheet } from "react-native";
import { theme } from "../../constants/theme";

export const styles = StyleSheet.create({
  fill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 72,
  },
  circle: {
    width: 196,
    height: 196,
    borderRadius: 98,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3A2448",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  letter: {
    color: "#FFFFFF",
    fontFamily: theme.typography.bold,
    fontSize: 78,
    lineHeight: 88,
  },
  compact: {
    alignItems: "center",
    justifyContent: "center",
  },
  compactLetter: {
    color: "#FFFFFF",
    fontFamily: theme.typography.bold,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },
});
