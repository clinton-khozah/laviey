import { View, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import { SettingsPanel } from "./SettingsPanel";

export function SettingsScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Settings">) {
  return (
    <View style={styles.root}>
      <SettingsPanel onClose={() => navigation.goBack()} navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAFC" },
});
