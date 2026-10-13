import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../../constants/theme";
import { useT } from "../../hooks/useTranslatedStrings";

const INK = "#171720";
const BODY =
  "Your profile, matches, and messages remain saved. You will need to sign in again to use Lavey on this device.";

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
  const t = useT();

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={loading ? undefined : onCancel}>
        <Pressable style={styles.card} onPress={() => undefined}>
          <View style={styles.rule} />
          <Text style={styles.eyebrow}>{t("ACCOUNT")}</Text>
          <Text style={styles.title}>{t("Sign out")}</Text>
          <Text style={styles.copy}>{t(BODY)}</Text>
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
              disabled={loading}
              onPress={onCancel}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>{t("Cancel")}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.confirmBtn, pressed && styles.pressed, loading && styles.disabled]}
              disabled={loading}
              onPress={onConfirm}
              accessibilityRole="button"
            >
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.confirmText}>{t("Sign out")}</Text>}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: "rgba(12, 12, 16, 0.62)",
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    paddingTop: 22,
    paddingHorizontal: 22,
    paddingBottom: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadow,
  },
  rule: {
    width: 36,
    height: 2,
    borderRadius: 1,
    backgroundColor: INK,
    marginBottom: 16,
  },
  eyebrow: {
    fontFamily: theme.typography.medium,
    fontSize: 11,
    letterSpacing: 1.6,
    color: theme.colors.textMuted,
  },
  title: {
    marginTop: 8,
    fontFamily: theme.typography.bold,
    fontSize: 22,
    lineHeight: 28,
    color: INK,
  },
  copy: {
    marginTop: 10,
    fontFamily: theme.typography.regular,
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.textSecondary,
  },
  actions: {
    marginTop: 22,
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: "#D8D8E0",
  },
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: INK,
  },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.7 },
  cancelText: {
    fontFamily: theme.typography.semibold,
    fontSize: 15,
    color: INK,
  },
  confirmText: {
    fontFamily: theme.typography.semibold,
    fontSize: 15,
    color: "#FFFFFF",
  },
});
