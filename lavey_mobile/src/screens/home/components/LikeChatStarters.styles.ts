import { StyleSheet } from "react-native";
import { theme } from "../../../constants/theme";

export const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(16, 16, 24, 0.46)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 28,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E4E4E7",
    marginBottom: 14,
  },
  title: {
    fontFamily: theme.typography.bold,
    fontSize: 18,
    color: "#101018",
  },
  subtitle: {
    marginTop: 4,
    fontFamily: theme.typography.regular,
    fontSize: 13,
    color: "#8C8798",
    lineHeight: 18,
  },
  loading: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontFamily: theme.typography.medium,
    fontSize: 13,
    color: "#8C8798",
  },
  list: {
    marginTop: 16,
    gap: 10,
  },
  suggestion: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F0D5DC",
    backgroundColor: "#FFF7F8",
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "center",
  },
  suggestionPressed: {
    backgroundColor: "#FBEAEE",
  },
  suggestionText: {
    fontFamily: theme.typography.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: "#19171E",
  },
});
