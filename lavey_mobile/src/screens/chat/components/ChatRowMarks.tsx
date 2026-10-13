import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "./ChatRowMarks.styles";

export function ChatRowMarks({ pinned, muted }: { pinned: boolean; muted: boolean }) {
  if (!pinned && !muted) return null;
  return (
    <View style={styles.row}>
      {muted ? <Ionicons name="notifications-off" size={15} color="#8C8798" /> : null}
      {pinned ? <Ionicons name="pin" size={15} color="#F5C518" /> : null}
    </View>
  );
}
