import { StyleSheet } from "react-native";

export const MATCH_HEART_SIZE = 18;

export const styles = StyleSheet.create({
  heart: {
    width: MATCH_HEART_SIZE,
    height: MATCH_HEART_SIZE,
  },
  fill: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  icon: {
    position: "absolute",
    left: 0,
    bottom: 0,
  },
});
