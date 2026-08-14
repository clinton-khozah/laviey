import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../constants/theme";

export function LanguageDetectionSheet({
  visible,
  languageLabel,
  applying,
  onAccept,
  onDismiss,
}: {
  visible: boolean;
  languageLabel: string;
  applying: boolean;
  onAccept(): void;
  onDismiss(): void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={applying ? undefined : onDismiss}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={applying ? undefined : onDismiss} />
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="language" size={30} color="#D63FBD" />
          </View>
          <Text style={styles.title}>Switch to {languageLabel}?</Text>
          <Text style={styles.body}>
            Looks like {languageLabel} might suit you better. Lavey is in English by default — you can
            always change this later in Settings.
          </Text>

          <Pressable
            style={({ pressed }) => [styles.allowWrap, pressed && styles.pressed]}
            disabled={applying}
            onPress={onAccept}
          >
            <LinearGradient
              colors={['#8A35ED', '#D63FBD', '#FF6526']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.allow}
            >
              <Text style={styles.allowText}>{applying ? 'Switching…' : `Switch to ${languageLabel}`}</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.dismiss, pressed && styles.pressed]}
            disabled={applying}
            onPress={onDismiss}
          >
            <Text style={styles.dismissText}>Keep English</Text>
          </Pressable>
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
    borderRadius: 24,
    backgroundColor: "white",
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: "center",
    elevation: 8,
    shadowColor: '#D63FBD',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(214,63,189,.12)',
    borderWidth: 1,
    borderColor: 'rgba(214,63,189,.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontFamily: theme.typography.bold, fontSize: 19, color: "#19171E", textAlign: 'center' },
  body: {
    fontFamily: theme.typography.regular,
    fontSize: 13.5,
    color: "#6B6771",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 20,
  },
  allowWrap: {
    width: '100%',
    marginTop: 22,
    borderRadius: 27,
    shadowColor: '#D63FBD',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  allow: { height: 52, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  allowText: { fontFamily: theme.typography.bold, fontSize: 15, color: 'white' },
  dismiss: { marginTop: 14, paddingVertical: 8 },
  dismissText: { fontFamily: theme.typography.semibold, fontSize: 13.5, color: '#9A9AA7' },
  pressed: { opacity: 0.85 },
});
