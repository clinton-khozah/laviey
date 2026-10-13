import { Modal, Pressable, Text, View } from "react-native";
import { styles } from "./ComposerEmojiSheet.styles";

const EMOJIS = [
  "❤️", "😍", "😂", "😊", "😘", "🥰",
  "😉", "😭", "😅", "🥺", "😎", "😌",
  "👍", "🔥", "✨", "💕", "🌹", "💋",
  "🎉", "💯", "🙏", "👋", "🤔", "💪",
];

export function ComposerEmojiSheet({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose(): void;
  onPick(emoji: string): void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>Add an emoji</Text>
          <Text style={styles.subtitle}>Tap one to put it in your message.</Text>
          <View style={styles.grid}>
            {EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                accessibilityLabel={`Insert ${emoji}`}
                onPress={() => onPick(emoji)}
                style={({ pressed }) => [styles.emoji, pressed && styles.emojiPressed]}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
