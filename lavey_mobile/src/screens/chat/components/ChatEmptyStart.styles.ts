import { StyleSheet } from "react-native";
import { theme } from "../../../constants/theme";

export const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 72,
    paddingBottom: 40,
  },
  mark: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FDE7F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: theme.typography.semibold,
    fontSize: 18,
    color: "#171720",
    textAlign: "center",
  },
  copy: {
    marginTop: 8,
    fontFamily: theme.typography.regular,
    fontSize: 14,
    lineHeight: 20,
    color: "#8C8798",
    textAlign: "center",
  },
  button: {
    marginTop: 18,
    minHeight: 44,
    paddingHorizontal: 22,
    borderRadius: 22,
    backgroundColor: "#000000",
    borderWidth: 2,
    borderColor: "#FF4B6E",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLabel: {
    fontFamily: theme.typography.semibold,
    fontSize: 14,
    color: "#FFFFFF",
  },
});
