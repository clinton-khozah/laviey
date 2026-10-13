import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, Text, View } from "react-native";
import { styles } from "./CrushRequestModal.styles";

export function CrushRequestModal({
  visible,
  name,
  avatar,
  incoming,
  crush,
  busy,
  onAccept,
  onDecline,
  onClose,
}: {
  visible: boolean;
  name: string;
  avatar?: string;
  incoming: boolean;
  crush: boolean;
  busy?: boolean;
  onAccept(): void;
  onDecline(): void;
  onClose?(): void;
}) {
  if (!visible) return null;
  const person = name.trim() || "them";

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={incoming ? onDecline : onClose}>
      <View style={styles.backdrop}>
      <View style={styles.card}>
        {!incoming && onClose ? (
          <Pressable style={styles.close} onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={22} color="#171720" />
          </Pressable>
        ) : null}
        <View style={styles.avatarRing}>
          <Image source={avatar ? { uri: avatar } : undefined} style={styles.avatar} contentFit="cover" />
          <View style={styles.badge}>
            <Ionicons name={crush ? "flame" : "chatbubble-ellipses"} size={14} color="#FFFFFF" />
          </View>
        </View>
        <Text style={styles.eyebrow}>{crush ? "Crush" : "Chat request"}</Text>
        <Text style={styles.title}>
          {incoming ? (crush ? `${person} sent you a crush` : `${person} wants to chat`) : crush ? "Crush sent" : "Request sent"}
        </Text>
        <Text style={styles.copy}>
          {incoming
            ? "Accept to open the conversation, or decline."
            : `Waiting for ${person} to accept. You can chat once they approve.`}
        </Text>
        {incoming ? (
          <View style={styles.actions}>
            <Pressable
              disabled={busy}
              onPress={onDecline}
              style={({ pressed }) => [styles.decline, pressed && styles.pressed, busy && styles.busy]}
            >
              <Text style={styles.declineText}>Decline</Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={onAccept}
              style={({ pressed }) => [styles.accept, pressed && styles.pressed, busy && styles.busy]}
            >
              <Text style={styles.acceptText}>{busy ? "Please wait…" : crush ? "Accept crush" : "Accept"}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      </View>
    </Modal>
  );
}
