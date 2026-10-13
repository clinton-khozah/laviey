import { StyleSheet } from "react-native";
import { theme } from "../../../constants/theme";

export const styles = StyleSheet.create({
  row: {
    flex: 1,
    minHeight: 26,
    marginVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pulseWrap: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  pulse: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(215, 38, 74, 0.28)",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#D7264A",
  },
  label: {
    flex: 1,
    fontFamily: theme.typography.medium,
    fontSize: 14,
    color: "#D7264A",
  },
  time: {
    fontFamily: theme.typography.semibold,
    fontSize: 14,
    color: "#3D3940",
    fontVariant: ["tabular-nums"],
  },
});
