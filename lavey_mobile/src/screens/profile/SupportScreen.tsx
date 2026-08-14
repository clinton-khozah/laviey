import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { supportApi, type SupportConversation, type SupportMessage } from "../../api/services";
import { theme } from "../../constants/theme";
import type { RootStackParamList } from "../../navigation/AppNavigator";

const POLL_MS = 12_000;
const logo = require("../../../assets/logo-tight.png");

export function SupportScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Support">) {
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const listRef = useRef<FlatList<SupportMessage>>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setConversation(await supportApi.conversation());
    } catch (error) {
      if (!silent) Alert.alert("Could not load support", error instanceof Error ? error.message : "Please try again.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(true), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (conversation?.messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [conversation?.messages.length]);

  const send = async (value = draft) => {
    const body = value.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      setConversation(await supportApi.send(body));
      setDraft("");
    } catch (error) {
      Alert.alert("Message not sent", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSending(false);
    }
  };

  const requestConsultant = async () => {
    if (escalating || conversation?.supportMode === "consultant") return;
    setEscalating(true);
    try {
      setConversation(await supportApi.consultant());
    } catch (error) {
      Alert.alert("Could not connect", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setEscalating(false);
    }
  };

  const config = conversation?.config;
  const consultantMode = conversation?.supportMode === "consultant";

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <Pressable style={styles.back} onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={24} color="#221F26" /></Pressable>
          <View style={styles.avatarWrap}>
            <Image source={logo} style={styles.avatar} contentFit="contain" />
            <View style={styles.verified}><Ionicons name="checkmark" size={10} color="white" /></View>
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.name}>{config?.displayName ?? "Lavey Support"}</Text>
            <Text style={styles.status}>{consultantMode ? "A consultant will reply soon" : config?.statusText ?? "AI help · Consultants available"}</Text>
          </View>
        </View>

        {loading && !conversation ? <View style={styles.center}><ActivityIndicator color="#8D46D8" /></View> : (
          <FlatList
            ref={listRef}
            data={conversation?.messages ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messages}
            ListFooterComponent={sending ? (
              <View style={styles.typing}>
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
              </View>
            ) : null}
            renderItem={({ item }) => (
              <View style={[styles.bubbleWrap, item.sender === "me" && styles.bubbleWrapMe]}>
                <View style={[styles.bubble, item.sender === "me" ? styles.bubbleMe : styles.bubbleSupport]}>
                  {item.isAi ? <View style={styles.aiLabel}><Ionicons name="sparkles" size={11} color="#8D46D8" /><Text style={styles.aiText}>LAVIEY AI</Text></View> : null}
                  <Text style={[styles.messageText, item.sender === "me" && styles.messageTextMe]}>{item.text}</Text>
                  <Text style={[styles.time, item.sender === "me" && styles.timeMe]}>{item.sentAt}</Text>
                </View>
              </View>
            )}
          />
        )}

        <View style={styles.bottom}>
          {(config?.quickTopics?.length ?? 0) > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topics}>
              {config!.quickTopics.map((topic) => (
                <Pressable key={topic} disabled={sending} onPress={() => void send(topic)} style={styles.topic}>
                  <Text style={styles.topicText}>{topic}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <Pressable disabled={consultantMode || escalating} onPress={() => void requestConsultant()} style={[styles.consultant, consultantMode && styles.consultantActive]}>
            <Ionicons name={consultantMode ? "checkmark-circle" : "headset-outline"} size={18} color={consultantMode ? "#2A827A" : "#8D46D8"} />
            <Text style={[styles.consultantText, consultantMode && styles.consultantTextActive]}>
              {consultantMode ? "Consultant requested · Conversation saved" : escalating ? "Connecting…" : "Talk to a consultant"}
            </Text>
          </Pressable>

          <View style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={`Message ${config?.displayName ?? "Lavey Support"}…`}
              placeholderTextColor="#AAA6AE"
              multiline
              style={styles.input}
            />
            <Pressable disabled={sending || !draft.trim()} onPress={() => void send()} style={[styles.send, (!draft.trim() || sending) && styles.sendDisabled]}>
              {sending ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="send" size={18} color="white" />}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F8FC" },
  header: { minHeight: 76, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: "white", borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#E5E2E8" },
  back: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#F3F1F5" },
  avatarWrap: { position: "relative" },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFF2F5" },
  verified: { position: "absolute", right: -1, bottom: -1, width: 17, height: 17, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#6C63FF", borderWidth: 2, borderColor: "white" },
  headerCopy: { flex: 1 },
  name: { fontFamily: theme.typography.bold, color: "#221F26", fontSize: 15 },
  status: { fontFamily: theme.typography.regular, color: "#85818A", fontSize: 10.5, marginTop: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  messages: { padding: 16, paddingBottom: 24, gap: 10 },
  bubbleWrap: { alignItems: "flex-start" },
  bubbleWrapMe: { alignItems: "flex-end" },
  bubble: { maxWidth: "82%", paddingHorizontal: 13, paddingVertical: 10, borderRadius: 17 },
  bubbleSupport: { backgroundColor: "white", borderWidth: 1, borderColor: "#E8E5EB", borderBottomLeftRadius: 5 },
  bubbleMe: { backgroundColor: "#8D46D8", borderBottomRightRadius: 5 },
  aiLabel: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 5 },
  aiText: { fontFamily: theme.typography.bold, fontSize: 9, letterSpacing: 0.5, color: "#8D46D8" },
  messageText: { fontFamily: theme.typography.regular, fontSize: 13, lineHeight: 19, color: "#342F38" },
  messageTextMe: { color: "white" },
  typing: { alignSelf: "flex-start", flexDirection: "row", gap: 5, paddingHorizontal: 15, paddingVertical: 13, borderRadius: 20, borderBottomLeftRadius: 6, backgroundColor: "white", borderWidth: 1, borderColor: "#E8E5EB" },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#9B97A0" },
  time: { marginTop: 5, fontFamily: theme.typography.regular, fontSize: 8.5, color: "#A09CA4" },
  timeMe: { color: "rgba(255,255,255,.68)", textAlign: "right" },
  bottom: { paddingTop: 9, paddingHorizontal: 12, paddingBottom: 9, backgroundColor: "white", borderTopWidth: StyleSheet.hairlineWidth, borderColor: "#E5E2E8" },
  topics: { gap: 7, paddingBottom: 9 },
  topic: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 17, backgroundColor: "#F3EAFE", borderWidth: 1, borderColor: "#DFC8F7" },
  topicText: { fontFamily: theme.typography.semibold, color: "#7B3CC0", fontSize: 10.5 },
  consultant: { minHeight: 38, borderRadius: 12, marginBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: "#F8F5FB", borderWidth: 1, borderColor: "#E5D8F3" },
  consultantActive: { backgroundColor: "#EFFAF8", borderColor: "#B8E5DF" },
  consultantText: { fontFamily: theme.typography.semibold, color: "#7B3CC0", fontSize: 11 },
  consultantTextActive: { color: "#2A827A" },
  composer: { minHeight: 48, flexDirection: "row", alignItems: "flex-end", gap: 8, paddingLeft: 13, paddingRight: 5, paddingVertical: 5, borderRadius: 24, backgroundColor: "#F3F1F5" },
  input: { flex: 1, maxHeight: 90, minHeight: 38, paddingTop: 9, fontFamily: theme.typography.regular, color: "#221F26", fontSize: 13 },
  send: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "#FF6372" },
  sendDisabled: { opacity: 0.45 },
});
