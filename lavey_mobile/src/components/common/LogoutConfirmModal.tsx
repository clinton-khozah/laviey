import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../constants/theme";

export function LogoutConfirmModal({
  visible,
  loading,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  loading?: boolean;
  onConfirm(): void;
  onCancel(): void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="log-out-outline" size={26} color="#101018" />
          </View>
          <Text style={styles.title}>Log out of Lavey?</Text>
          <Text style={styles.copy}>
            You'll need to sign in again to access your account. Everything stays saved until you return.
          </Text>

          <Pressable
            style={[styles.logoutBtn, loading && styles.btnDisabled]}
            disabled={loading}
            onPress={onConfirm}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.logoutText}>Log out</Text>
            )}
          </Pressable>

          <Pressable style={styles.stayBtn} disabled={loading} onPress={onCancel}>
            <Text style={styles.stayText}>Stay signed in</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: "rgba(16,16,24,.55)",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E4E0E6",
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F2F5",
    marginBottom: 16,
  },
  title: {
    fontFamily: theme.typography.bold,
    fontSize: 20,
    color: "#101018",
    textAlign: "center",
  },
  copy: {
    marginTop: 10,
    fontFamily: theme.typography.regular,
    fontSize: 14,
    lineHeight: 21,
    color: "#8C8798",
    textAlign: "center",
    maxWidth: 280,
  },
  logoutBtn: {
    marginTop: 22,
    width: "100%",
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5484D",
  },
  btnDisabled: { opacity: 0.7 },
  logoutText: { fontFamily: theme.typography.bold, fontSize: 15, color: "#FFFFFF" },
  stayBtn: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  stayText: { fontFamily: theme.typography.semibold, fontSize: 14, color: "#101018" },
});
