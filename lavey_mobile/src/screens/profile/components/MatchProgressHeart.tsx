import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MATCH_HEART_SIZE, styles } from "./MatchProgressHeart.styles";

export function MatchProgressHeart({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  const fillHeight = (MATCH_HEART_SIZE * clamped) / 100;
  return (
    <View style={styles.heart}>
      <Ionicons name="heart" size={MATCH_HEART_SIZE} color="#E4E4E7" />
      {fillHeight > 0 ? (
        <View style={[styles.fill, { height: fillHeight }]}>
          <Ionicons name="heart" size={MATCH_HEART_SIZE} color="#FF4B6E" style={styles.icon} />
        </View>
      ) : null}
    </View>
  );
}
