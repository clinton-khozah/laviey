import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { matchApi } from "../../../api/services";
import { theme } from "../../../constants/theme";
import { useMatch } from "../../../context/MatchContext";
import type { Profile } from "../../../types";

const BRAND_HEART = require("../../../../assets/heart-tight.png");
const FALLBACK_GREETINGS = ["Hey! So happy we matched 😊", "Hi! Your vibe caught my attention", "Well, this is a lovely surprise ✨"];

type Props = {
  onSendGreeting(profile: Profile, greeting: string): Promise<void>;
  onOpenChat(profile: Profile): Promise<void>;
};

export function MatchAnimation({ onSendGreeting, onOpenChat }: Props) {
  const { match, dismissMatch } = useMatch();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const cardScale = useSharedValue(0.82);
  const leftX = useSharedValue(-150);
  const leftRotate = useSharedValue(-14);
  const rightX = useSharedValue(150);
  const rightRotate = useSharedValue(14);
  const logoScale = useSharedValue(0);
  const titleScale = useSharedValue(0.5);

  useEffect(() => {
    if (!match) return;
    cardScale.value = withSpring(1, { damping: 14, stiffness: 210 });
    leftX.value = withDelay(100, withSpring(20, { damping: 13, stiffness: 180 }));
    rightX.value = withDelay(100, withSpring(-20, { damping: 13, stiffness: 180 }));
    leftRotate.value = withDelay(100, withSpring(-5));
    rightRotate.value = withDelay(100, withSpring(5));
    logoScale.value = withDelay(430, withSequence(withSpring(1.28), withSpring(1)));
    titleScale.value = withDelay(520, withSequence(withSpring(1.1), withSpring(1)));

    let active = true;
    setSuggestions([]);
    setLoadingSuggestions(true);
    void matchApi
      .greetings(match.profile.name, match.profile.bio, match.profile.interests)
      .then((items) => active && setSuggestions(items.slice(0, 3)))
      .catch(() => active && setSuggestions(FALLBACK_GREETINGS))
      .finally(() => active && setLoadingSuggestions(false));
    return () => {
      active = false;
    };
  }, [cardScale, leftRotate, leftX, logoScale, match, rightRotate, rightX, titleScale]);

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));
  const leftStyle = useAnimatedStyle(() => ({ transform: [{ translateX: leftX.value }, { rotate: `${leftRotate.value}deg` }] }));
  const rightStyle = useAnimatedStyle(() => ({ transform: [{ translateX: rightX.value }, { rotate: `${rightRotate.value}deg` }] }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: logoScale.value }] }));
  const titleStyle = useAnimatedStyle(() => ({ transform: [{ scale: titleScale.value }] }));

  if (!match) return null;
  const theirAvatar = match.profileAvatar || match.profile.avatar;
  const myAvatar = match.myAvatar;
  const firstName = match.profile.name.trim().split(" ")[0] || match.profile.name;

  const sendGreeting = async (greeting: string) => {
    setSending(greeting);
    try {
      await onSendGreeting(match.profile, greeting);
      dismissMatch();
    } catch (error) {
      Alert.alert("Message not sent", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSending(null);
    }
  };

  const openChat = async () => {
    try {
      await onOpenChat(match.profile);
      dismissMatch();
    } catch (error) {
      Alert.alert("Chat not ready", error instanceof Error ? error.message : "Please try again.");
    }
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={dismissMatch} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, cardStyle]}>
          <LinearGradient colors={["rgba(255,83,110,.2)", "rgba(168,85,247,.08)", "transparent"]} style={styles.glow} />
          <Pressable style={styles.close} onPress={dismissMatch} accessibilityLabel="Close match popup">
            <Ionicons name="close" size={21} color="#B8B6C1" />
          </Pressable>

          <View style={styles.hero}>
            <Animated.View style={[styles.avatarWrap, styles.avatarLeft, leftStyle]}>
              <LinearGradient colors={["#FF536E", "#A855F7"]} style={styles.ring}>
                {myAvatar ? (
                  <Image source={{ uri: myAvatar }} style={styles.avatar} contentFit="cover" />
                ) : (
                  <View style={styles.avatarFallback}><Ionicons name="person" size={42} color="#FF7189" /></View>
                )}
              </LinearGradient>
              <Text style={styles.avatarLabel}>You</Text>
            </Animated.View>
            <Animated.View style={[styles.avatarWrap, styles.avatarRight, rightStyle]}>
              <LinearGradient colors={["#FF536E", "#A855F7"]} style={styles.ring}>
                <Image source={{ uri: theirAvatar }} style={styles.avatar} contentFit="cover" />
              </LinearGradient>
              <Text style={styles.avatarLabel}>{firstName}</Text>
            </Animated.View>
            <Animated.View style={[styles.logoBadge, logoStyle]}>
              <Image source={BRAND_HEART} style={styles.brandHeart} contentFit="contain" />
            </Animated.View>
          </View>

          <Animated.Text style={[styles.title, titleStyle]}>It&apos;s a match!</Animated.Text>
          <Animated.Text entering={FadeIn.delay(650).duration(300)} style={styles.subtitle}>
            You and {firstName} liked each other. Start something wonderful.
          </Animated.Text>

          <Pressable style={styles.messageButton} onPress={() => void openChat()}>
            <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" />
            <Text style={styles.messageButtonText}>Message {firstName} now</Text>
          </Pressable>

          <Animated.View entering={FadeIn.delay(760).duration(300)} style={styles.greetings}>
            <View style={styles.greetingHeading}>
              <View>
                <Text style={styles.messageTitle}>Message {firstName}</Text>
                <Text style={styles.messageHint}>Tap a suggestion to send it in Chat</Text>
              </View>
            </View>
            {loadingSuggestions ? (
              <View style={styles.suggestionLoading}><ActivityIndicator color="#FF647E" /><Text style={styles.loadingText}>Writing a few openers...</Text></View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionRow}>
                {(suggestions.length ? suggestions : FALLBACK_GREETINGS).map((suggestion) => (
                  <Pressable
                    key={suggestion}
                    disabled={Boolean(sending)}
                    onPress={() => void sendGreeting(suggestion)}
                    style={({ pressed }) => [styles.suggestion, pressed && styles.suggestionPressed]}
                  >
                    {sending === suggestion ? <ActivityIndicator size="small" color="#FF647E" /> : <Text style={styles.suggestionText}>{suggestion}</Text>}
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </Animated.View>

          <Pressable style={styles.laterButton} onPress={dismissMatch}>
            <Text style={styles.laterText}>Maybe later</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(244,244,248,.92)", alignItems: "center", justifyContent: "center", padding: 18 },
  card: { width: "100%", maxWidth: 380, maxHeight: "92%", borderRadius: 24, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(0,0,0,.08)", paddingHorizontal: 20, paddingTop: 26, paddingBottom: 18, alignItems: "center", overflow: "hidden", elevation: 20 },
  glow: { position: "absolute", top: 0, left: 0, right: 0, height: 210 },
  close: { position: "absolute", top: 12, right: 12, zIndex: 4, width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(0,0,0,.04)", alignItems: "center", justifyContent: "center" },
  hero: { width: 250, height: 142, alignItems: "center", justifyContent: "center" },
  avatarWrap: { position: "absolute", width: 112, alignItems: "center" },
  avatarLeft: { left: 10, zIndex: 2 },
  avatarRight: { right: 10, zIndex: 1 },
  ring: { width: 106, height: 106, borderRadius: 53, padding: 4, shadowColor: "#FF536E", shadowOpacity: 0.45, shadowRadius: 18, elevation: 8 },
  avatar: { width: "100%", height: "100%", borderRadius: 50, borderWidth: 3, borderColor: "#FFFFFF" },
  avatarFallback: { flex: 1, borderRadius: 50, borderWidth: 3, borderColor: "#FFFFFF", backgroundColor: "#F3E9EC", alignItems: "center", justifyContent: "center" },
  avatarLabel: { color: "rgba(18,18,26,.72)", fontFamily: theme.typography.semibold, fontSize: 11, marginTop: 5 },
  logoBadge: { position: "absolute", zIndex: 3, bottom: 14, width: 50, height: 50, borderRadius: 25, backgroundColor: "white", borderWidth: 4, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center", elevation: 12 },
  brandHeart: { width: 38, height: 38 },
  title: { color: "#FF647E", fontFamily: theme.typography.bold, fontSize: 30, marginTop: 2 },
  subtitle: { color: "#6B6771", fontFamily: theme.typography.regular, fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 6, maxWidth: 300 },
  messageButton: { alignSelf: "stretch", minHeight: 48, marginTop: 18, borderRadius: 24, backgroundColor: "#FF647E", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, shadowColor: "#FF536E", shadowOpacity: 0.24, shadowRadius: 10, elevation: 4 },
  messageButtonText: { color: "#FFFFFF", fontFamily: theme.typography.bold, fontSize: 14 },
  greetings: { alignSelf: "stretch", marginTop: 12, padding: 14, borderRadius: 15, backgroundColor: "rgba(0,0,0,.03)", borderWidth: 1, borderColor: "rgba(0,0,0,.08)" },
  greetingHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  messageTitle: { color: "#19171E", fontFamily: theme.typography.bold, fontSize: 16 },
  messageHint: { color: "#8B8991", fontFamily: theme.typography.regular, fontSize: 11, marginTop: 2 },
  suggestionLoading: { height: 52, flexDirection: "row", alignItems: "center", gap: 9 },
  loadingText: { color: "#6B6771", fontFamily: theme.typography.regular, fontSize: 12 },
  suggestionRow: { gap: 8, paddingTop: 12, paddingRight: 4 },
  suggestion: { minHeight: 42, maxWidth: 235, justifyContent: "center", paddingHorizontal: 13, paddingVertical: 9, borderRadius: 21, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(255,100,126,.3)" },
  suggestionPressed: { backgroundColor: "#FBEAEE", transform: [{ scale: 0.98 }] },
  suggestionText: { color: "#19171E", fontFamily: theme.typography.semibold, fontSize: 12, lineHeight: 17 },
  laterButton: { marginTop: 13, paddingHorizontal: 22, paddingVertical: 10 },
  laterText: { color: "#8B8991", fontFamily: theme.typography.semibold, fontSize: 13 },
});
