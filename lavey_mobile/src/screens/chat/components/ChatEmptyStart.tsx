import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "./ChatEmptyStart.styles";

export function ChatEmptyStart({
  icon,
  title,
  copy,
  action,
  onStart,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  copy: string;
  action: string;
  onStart(): void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.mark}>
        <Ionicons name={icon} size={30} color="#D7264A" />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.copy}>{copy}</Text>
      <Pressable style={styles.button} onPress={onStart} accessibilityLabel={action}>
        <Text style={styles.buttonLabel}>{action}</Text>
      </Pressable>
    </View>
  );
}
