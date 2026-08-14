import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../constants/theme";

export function NotificationPermissionSheet({
  visible,
  requesting,
  onAllow,
  onDismiss,
}: {
  visible: boolean;
  requesting: boolean;
  onAllow(): void;
  onDismiss(): void;
}) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={requesting ? undefined : onDismiss}
    >
      <Pressable style={styles.backdrop} onPress={requesting ? undefined : onDismiss}>
        <Pressable style={styles.card} accessibilityViewIsModal onPress={(e) => e.stopPropagation()}>
          <View style={styles.iconWrap}>
            <Ionicons name="notifications-outline" size={18} color="#303034" />
          </View>
          <Text style={styles.title}>Enable notifications</Text>
          <Text style={styles.body}>
            Get notified about matches, messages, and account updates.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.allow, pressed && styles.pressed]}
            disabled={requesting}
            onPress={onAllow}
          >
            {requesting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.allowText}>Allow</Text>
            )}
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.dismiss, pressed && styles.pressed]}
            disabled={requesting}
            onPress={onDismiss}
          >
            <Text style={styles.dismissText}>Not now</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(18, 18, 20, 0.38)",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ECEAEE",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F6F5F7",
    borderWidth: 1,
    borderColor: "#E8E6EA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  title: {
    fontFamily: theme.typography.bold,
    fontSize: 15,
    color: "#19171E",
    textAlign: "center",
  },
  body: {
    fontFamily: theme.typography.regular,
    fontSize: 12,
    color: "#6B6771",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 17,
    maxWidth: 250,
  },
  allow: {
    width: "100%",
    height: 40,
    borderRadius: 10,
    backgroundColor: "#303034",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  allowText: { fontFamily: theme.typography.semibold, fontSize: 13, color: "#FFFFFF" },
  dismiss: { marginTop: 6, paddingVertical: 8, paddingHorizontal: 16 },
  dismissText: { fontFamily: theme.typography.medium, fontSize: 12, color: "#8F8B93" },
  pressed: { opacity: 0.86 },
});
