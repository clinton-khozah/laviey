import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { mediaDevices, RTCView, type MediaStream } from "react-native-webrtc";
import { chatApi } from "../../api/services";
import { theme } from "../../constants/theme";
import type { ChatVideoCall } from "../../types";
import type { RootStackParamList } from "../../navigation/AppNavigator";

export function VideoCallScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, "VideoCall">) {
  const { conversationId, conversation, incoming, callId, autoAnswer } = route.params;
  const [call, setCall] = useState<ChatVideoCall | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [answering, setAnswering] = useState(false);

  useEffect(() => {
    if (incoming) return;
    let mounted = true;
    void (async () => {
      try {
        const local = await mediaDevices.getUserMedia({ audio: true, video: { facingMode: "user" } });
        if (!mounted) {
          local.getTracks().forEach((track) => track.stop());
          return;
        }
        setStream(local);
        setCall(await chatApi.startCall(conversationId));
      } catch (e) {
        Alert.alert("Could not start video call", e instanceof Error ? e.message : "Check camera and microphone permissions.");
        navigation.goBack();
      }
    })();
    return () => {
      mounted = false;
    };
  }, [conversationId, incoming, navigation]);

  useEffect(() => {
    if (!incoming) return;
    let mounted = true;
    void chatApi.activeCall().then((next) => {
      if (!mounted) return;
      setCall(next && next.conversationId === conversationId ? next : next);
    }).catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [conversationId, incoming]);

  const answer = async () => {
    if (answering) return;
    setAnswering(true);
    try {
      const active = call ?? (await chatApi.activeCall());
      const id = callId || active?.id;
      if (!id) throw new Error("This call has already ended.");
      const local = stream ?? (await mediaDevices.getUserMedia({ audio: true, video: { facingMode: "user" } }));
      setStream(local);
      setCall(await chatApi.updateCall(id, "answer"));
    } catch (e) {
      Alert.alert("Could not answer", e instanceof Error ? e.message : "Please try again.");
      navigation.goBack();
    } finally {
      setAnswering(false);
    }
  };

  useEffect(() => {
    if (incoming && autoAnswer) void answer();
    // Answer once when the notification action opens this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAnswer, incoming]);

  useEffect(() => {
    if (!call) return;
    const poll = setInterval(() => {
      void chatApi.activeCall().then((next) => {
        if (next && next.id === call.id) setCall(next);
        if (!next || ["ended", "declined", "missed"].includes(next.status)) {
          if (!incoming || call.status === "active") navigation.goBack();
        }
      }).catch(() => undefined);
    }, 2500);
    return () => clearInterval(poll);
  }, [call, incoming, navigation]);

  useEffect(() => () => {
    stream?.getTracks().forEach((track) => track.stop());
  }, [stream]);

  const decline = async () => {
    const id = callId || call?.id;
    if (id) await chatApi.updateCall(id, "decline").catch(() => undefined);
    stream?.getTracks().forEach((track) => track.stop());
    navigation.goBack();
  };

  const end = async () => {
    if (call) await chatApi.updateCall(call.id, "end").catch(() => undefined);
    stream?.getTracks().forEach((track) => track.stop());
    navigation.goBack();
  };

  const toggleMic = () => {
    stream?.getAudioTracks().forEach((track) => {
      track.enabled = muted;
    });
    setMuted(!muted);
  };

  const toggleCamera = () => {
    stream?.getVideoTracks().forEach((track) => {
      track.enabled = cameraOff;
    });
    setCameraOff(!cameraOff);
  };

  const name = conversation?.participantName || call?.participantName || "Your match";
  const avatar = conversation?.participantAvatar || call?.participantAvatar;
  const waitingToAnswer = Boolean(incoming) && call?.status !== "active";
  const otherOnline = Boolean(conversation?.isOnline);
  const phase = call?.status === "active" ? "connected" : waitingToAnswer ? "incoming" : otherOnline ? "ringing" : "calling";
  const statusLabel = phase === "connected" ? "Connected" : phase === "incoming" ? "Incoming call" : phase === "ringing" ? "Ringing…" : "Calling…";
  const headline = phase === "connected" ? `Connected with ${name}` : phase === "incoming" ? `${name} is calling` : phase === "ringing" ? `Ringing ${name}…` : `Calling ${name}…`;
  const detail = phase === "connected" ? "Your private call is live" : phase === "incoming" ? "Answer to join" : phase === "ringing" ? "They can answer from the notification" : "They are not online right now";

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.ringing}>{statusLabel}</Text>
        </View>
        <Text style={styles.private}>PRIVATE</Text>
      </View>
      {stream && !cameraOff ? (
        <View style={styles.self}>
          <RTCView streamURL={stream.toURL()} style={StyleSheet.absoluteFill} objectFit="cover" mirror />
        </View>
      ) : null}
      <View style={styles.waiting}>
        {avatar ? <Image source={{ uri: avatar }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text>{name[0]}</Text></View>}
        <Text style={styles.calling}>{headline}</Text>
        <Text style={styles.waitCopy}>{detail}</Text>
      </View>
      <View style={styles.controls}>
        {waitingToAnswer ? (
          <>
            <Pressable style={styles.decline} onPress={() => void decline()}>
              <Ionicons name="call" size={26} color="white" style={{ transform: [{ rotate: "135deg" }] }} />
            </Pressable>
            <Pressable style={styles.answer} onPress={() => void answer()}>
              <Ionicons name="call" size={28} color="white" />
            </Pressable>
          </>
        ) : (
          <>
            <Pressable style={styles.control} onPress={toggleMic}>
              <Ionicons name={muted ? "mic-off" : "mic"} size={24} color="white" />
            </Pressable>
            <Pressable style={styles.end} onPress={() => void end()}>
              <Ionicons name="call" size={27} color="white" style={{ transform: [{ rotate: "135deg" }] }} />
            </Pressable>
            <Pressable style={styles.control} onPress={toggleCamera}>
              <Ionicons name={cameraOff ? "videocam-off" : "videocam"} size={24} color="white" />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#08080B" },
  header: { paddingTop: 20, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between" },
  name: { color: "white", fontFamily: theme.typography.bold, fontSize: 20 },
  ringing: { color: "#C9C6CE", fontSize: 11, marginTop: 2 },
  private: { color: "white", backgroundColor: "#27272B", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7, fontFamily: theme.typography.bold, fontSize: 9 },
  self: { position: "absolute", right: 16, top: 90, width: 116, height: 170, borderRadius: 18, overflow: "hidden", borderWidth: 2, borderColor: "#AAA8B0", backgroundColor: "#18181D" },
  waiting: { position: "absolute", top: "37%", alignSelf: "center", alignItems: "center" },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: "white" },
  avatarFallback: { width: 120, height: 120, borderRadius: 60, backgroundColor: "#DDD", alignItems: "center", justifyContent: "center" },
  calling: { color: "white", fontFamily: theme.typography.bold, fontSize: 19, marginTop: 30 },
  waitCopy: { color: "#CFC8E7", fontFamily: theme.typography.regular, marginTop: 5 },
  controls: { position: "absolute", bottom: 28, alignSelf: "center", flexDirection: "row", gap: 27, alignItems: "center" },
  control: { width: 61, height: 61, borderRadius: 31, backgroundColor: "#303034", borderWidth: 1, borderColor: "#555", alignItems: "center", justifyContent: "center" },
  end: { width: 74, height: 74, borderRadius: 38, backgroundColor: "#F3424B", alignItems: "center", justifyContent: "center" },
  decline: { width: 74, height: 74, borderRadius: 38, backgroundColor: "#F3424B", alignItems: "center", justifyContent: "center" },
  answer: { width: 74, height: 74, borderRadius: 38, backgroundColor: "#22A45D", alignItems: "center", justifyContent: "center" },
});
