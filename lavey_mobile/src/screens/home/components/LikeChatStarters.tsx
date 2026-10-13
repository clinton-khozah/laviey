import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, Text, View } from "react-native";
import { matchApi } from "../../../api/services";
import type { Profile } from "../../../types";
import { styles } from "./LikeChatStarters.styles";

const FALLBACK_GREETINGS = [
  "Hey! So happy we matched",
  "Hi! Your vibe caught my attention",
  "Well, this is a lovely surprise",
];

export function LikeChatStarters({
  profile,
  onClose,
  onSend,
}: {
  profile: Profile | null;
  onClose(): void;
  onSend(profile: Profile, greeting: string): Promise<void>;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    setSuggestions([]);
    setLoading(true);
    void matchApi
      .greetings(profile.name, profile.bio, profile.interests)
      .then((items) => {
        if (!active) return;
        setSuggestions(items.slice(0, 3));
      })
      .catch(() => {
        if (active) setSuggestions(FALLBACK_GREETINGS);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [profile]);

  const send = async (greeting: string) => {
    if (!profile || sending) return;
    setSending(greeting);
    try {
      await onSend(profile, greeting);
    } catch (error) {
      Alert.alert("Message not sent", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSending(null);
    }
  };

  const firstName = profile?.name.trim().split(" ")[0] || "them";

  return (
    <Modal transparent visible={Boolean(profile)} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={sending ? undefined : onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>Start the chat</Text>
          <Text style={styles.subtitle}>A few openers for {firstName}. Tap one to send it.</Text>
          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color="#FF4B6E" />
              <Text style={styles.loadingText}>Writing a few openers...</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {(suggestions.length ? suggestions : FALLBACK_GREETINGS).map((suggestion) => (
                <Pressable
                  key={suggestion}
                  disabled={Boolean(sending)}
                  onPress={() => void send(suggestion)}
                  style={({ pressed }) => [styles.suggestion, pressed && styles.suggestionPressed]}
                >
                  {sending === suggestion ? (
                    <ActivityIndicator size="small" color="#FF4B6E" />
                  ) : (
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
