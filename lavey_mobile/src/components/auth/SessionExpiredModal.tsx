import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { styles } from "./SessionExpiredModal.styles";

export function SessionExpiredModal({
  visible,
  signingIn,
  onSignIn,
}: {
  visible: boolean;
  signingIn?: boolean;
  onSignIn(): void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => undefined}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Your session has expired</Text>
          <Text style={styles.copy}>Sign in to continue to Lavey.</Text>
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.pressed, signingIn && styles.disabled]}
            disabled={signingIn}
            onPress={onSignIn}
            accessibilityRole="button"
          >
            {signingIn ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Sign in</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
