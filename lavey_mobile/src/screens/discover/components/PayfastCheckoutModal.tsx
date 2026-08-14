import { useMemo } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { theme } from "../../../constants/theme";
import type { PayfastCheckoutResponse } from "../../../types";

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * PayFast only accepts a signed POST of hidden form fields (see lavey_frontend's
 * submitPayfastCheckout) — a WebView loading a local auto-submitting form is the
 * mobile equivalent of the web app's hidden-form-and-submit() trick.
 */
export function PayfastCheckoutModal({
  visible,
  checkout,
  onClose,
  onFinished,
}: {
  visible: boolean;
  checkout: PayfastCheckoutResponse | null;
  onClose(): void;
  onFinished(outcome: "success" | "cancel"): void;
}) {
  const html = useMemo(() => {
    if (!checkout) return "";
    const inputs = Object.entries(checkout.fields)
      .map(([name, value]) => `<input type="hidden" name="${escapeAttr(name)}" value="${escapeAttr(value)}" />`)
      .join("");
    return `<!doctype html><html><body onload="document.forms[0].submit()"><form method="POST" action="${escapeAttr(checkout.actionUrl)}">${inputs}</form></body></html>`;
  }, [checkout]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>Secure checkout</Text>
          <Pressable style={styles.close} onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={20} color="#888" />
          </Pressable>
        </View>
        {checkout ? (
          <WebView
            source={{ html }}
            style={styles.webview}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loading}>
                <ActivityIndicator color={theme.colors.coral} />
              </View>
            )}
            onShouldStartLoadWithRequest={(request) => {
              if (request.url.includes("/subscription/success")) {
                onFinished("success");
                return false;
              }
              if (request.url.includes("/subscription/cancel")) {
                onFinished("cancel");
                return false;
              }
              return true;
            }}
          />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "white" },
  header: {
    height: 58,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#EEE",
  },
  title: { fontFamily: theme.typography.bold, fontSize: 17 },
  close: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#F4F4F5", alignItems: "center", justifyContent: "center" },
  webview: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
