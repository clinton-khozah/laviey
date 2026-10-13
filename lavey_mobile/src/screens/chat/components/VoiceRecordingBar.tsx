import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";
import { styles } from "./VoiceRecordingBar.styles";

function formatDuration(durationMillis: number): string {
  const total = Math.max(0, Math.floor(durationMillis / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function VoiceRecordingBar({ durationMillis }: { durationMillis: number }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.row}>
      <View style={styles.pulseWrap}>
        <Animated.View
          style={[
            styles.pulse,
            {
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
              transform: [
                { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] }) },
              ],
            },
          ]}
        />
        <View style={styles.dot} />
      </View>
      <Text style={styles.label}>Recording</Text>
      <Text style={styles.time}>{formatDuration(durationMillis)}</Text>
    </View>
  );
}
