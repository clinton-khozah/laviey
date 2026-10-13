import { Alert, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AudioModule, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { styles } from "./VoicePlaybackBar.styles";

function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remain = total % 60;
  return `${minutes}:${remain.toString().padStart(2, "0")}`;
}

export function VoicePlaybackBar({ url, mine }: { url: string; mine: boolean }) {
  const player = useAudioPlayer(url, { downloadFirst: true });
  const status = useAudioPlayerStatus(player);
  const duration = status.duration > 0 ? status.duration : player.duration;
  const position = status.playing || status.currentTime > 0 ? status.currentTime : player.currentTime;
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;
  const shown = status.playing || position > 0.2 ? position : duration;

  const playVoice = async () => {
    try {
      await AudioModule.setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (!player.isLoaded) player.replace(url);
      if (status.playing) {
        player.pause();
        return;
      }
      const atEnd = duration > 0 && position >= duration - 0.2;
      await player.seekTo(atEnd ? 0 : position);
      player.play();
    } catch (error) {
      Alert.alert("Could not play", error instanceof Error ? error.message : "Please try again.");
    }
  };

  return (
    <Pressable style={styles.row} onPress={() => void playVoice()}>
      <View style={[styles.play, mine && styles.playMine]}>
        <Ionicons name={status.playing ? "pause" : "play"} size={15} color={mine ? "#9D3264" : "#726C79"} />
      </View>
      <View style={styles.trackWrap}>
        <View style={[styles.track, mine && styles.trackMine]}>
          <View style={[styles.fill, mine && styles.fillMine, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <Text style={[styles.time, mine && styles.timeMine]}>{formatClock(shown)}</Text>
      </View>
    </Pressable>
  );
}
