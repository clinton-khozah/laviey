import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../../../constants/theme";

export function CrushConfirmSheet({
  visible,
  profileName,
  sending,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  profileName: string;
  sending?: boolean;
  onCancel(): void;
  onConfirm(): void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={sending ? undefined : onCancel} />
        <View style={styles.card}>
          <Text style={styles.kiss}>💋</Text>
          <Text style={styles.title}>Send crushy?</Text>
          <Text style={styles.body}>
            You&apos;re about to send a crushy to {profileName}. They&apos;ll get a
            notification and can accept or pass.
          </Text>
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
              disabled={sending}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.confirm, pressed && styles.pressed, sending && styles.confirmBusy]}
              disabled={sending}
              onPress={onConfirm}
            >
              <Text style={styles.confirmText}>{sending ? "Sending…" : "Okay"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(10,10,14,.6)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 22,
    backgroundColor: "white",
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    alignItems: "center",
    elevation: 8,
  },
  kiss: { fontSize: 40, marginBottom: 4 },
  title: { fontFamily: theme.typography.bold, fontSize: 18, color: "#19171E" },
  body: {
    fontFamily: theme.typography.regular,
    fontSize: 13,
    color: "#6B6771",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 19,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 20, width: "100%" },
  pressed: { opacity: 0.82 },
  cancel: { flex: 1, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "#F2F1F3" },
  cancelText: { fontFamily: theme.typography.semibold, fontSize: 14, color: "#3E3A44" },
  confirm: { flex: 1, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "#FF5C7A" },
  confirmBusy: { opacity: 0.75 },
  confirmText: { fontFamily: theme.typography.bold, fontSize: 14, color: "white" },
});
