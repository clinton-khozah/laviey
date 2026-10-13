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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E4E4E7",
    marginBottom: 12,
  },
  title: {
    fontFamily: theme.typography.bold,
    fontSize: 17,
    color: "#101018",
  },
  subtitle: {
    marginTop: 3,
    marginBottom: 14,
    fontFamily: theme.typography.regular,
    fontSize: 13,
    color: "#8C8798",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  emoji: {
    width: "16.66%",
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiPressed: {
    backgroundColor: "#FFF0F3",
    borderRadius: 12,
  },
  emojiText: {
    fontSize: 28,
  },
});
