import { StyleSheet } from "react-native";
import { theme } from "../../constants/theme";

export const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: "rgba(12, 12, 16, 0.62)",
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    paddingTop: 22,
    paddingHorizontal: 22,
    paddingBottom: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadow,
  },
  title: {
    fontFamily: theme.typography.bold,
    fontSize: 22,
    color: "#171720",
  },
  copy: {
    marginTop: 8,
    fontFamily: theme.typography.regular,
    fontSize: 15,
    lineHeight: 22,
    color: "#423B47",
  },
  button: {
    marginTop: 22,
    height: 50,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#303034",
  },
  pressed: { opacity: 0.86 },
  disabled: { opacity: 0.7 },
  buttonText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.semibold,
    fontSize: 15,
  },
});
