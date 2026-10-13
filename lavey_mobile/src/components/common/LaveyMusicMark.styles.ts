import { StyleSheet } from "react-native";

export const musicMarkColors = {
  tile: "#F4F4F5",
  tileDark: "#303034",
  ink: "#303034",
  inkOnDark: "#FFFFFF",
} as const;

export const styles = StyleSheet.create({
  mark: {
    alignItems: "center",
    justifyContent: "center",
  },
});
