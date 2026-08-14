import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function ProfileAvatarViewerModal({
  visible,
  avatarUrl,
  onClose,
}: {
  visible: boolean;
  avatarUrl: string | null;
  onClose(): void;
}) {
  const insets = useSafeAreaInsets();

  if (!visible || !avatarUrl) return null;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Image source={{ uri: avatarUrl }} style={StyleSheet.absoluteFill} contentFit="contain" />
        <Pressable
          style={[styles.close, { top: insets.top + 10 }]}
          onPress={onClose}
          hitSlop={10}
          accessibilityLabel="Close photo"
        >
          <Ionicons name="chevron-back" size={26} color="white" />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0E0E12",
  },
  close: {
    position: "absolute",
    left: 16,
    padding: 4,
  },
});
