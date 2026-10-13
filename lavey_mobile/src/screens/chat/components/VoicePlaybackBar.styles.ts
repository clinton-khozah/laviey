import { StyleSheet } from "react-native";
import { theme } from "../../../constants/theme";

export const styles = StyleSheet.create({
  row: {
    minWidth: 210,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  play: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F0EDF2",
    alignItems: "center",
    justifyContent: "center",
  },
  playMine: { backgroundColor: "rgba(255,255,255,.7)" },
  trackWrap: { flex: 1, gap: 4 },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D7D3DA",
    overflow: "hidden",
  },
  trackMine: { backgroundColor: "rgba(126,36,78,.2)" },
  fill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#8C3AE0",
  },
  fillMine: { backgroundColor: "#9D3264" },
  time: {
    fontFamily: theme.typography.medium,
    fontSize: 11,
    color: "#3D3940",
  },
  timeMine: { color: "#7E244E" },
});
