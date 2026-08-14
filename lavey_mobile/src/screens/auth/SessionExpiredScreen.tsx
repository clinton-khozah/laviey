import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../constants/theme';

export function SessionExpiredScreen({ onSignIn }: { onSignIn(): void }) {
  return (
    <View style={styles.root}>
      <Image source={require('../../../assets/heart-tight.png')} resizeMode="contain" style={styles.art} />
      <Text style={styles.title}>Sign in to continue</Text>
      <Text style={styles.copy}>Please sign in to continue.</Text>
      <Pressable onPress={onSignIn} style={({ pressed }) => [styles.buttonWrap, pressed && styles.buttonPressed]}>
        <View style={styles.button}>
          <Text style={styles.buttonText}>Sign in</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 30 },
  art: { width: 100, height: 100, marginBottom: 28 },
  title: { fontFamily: theme.typography.bold, fontSize: 29, color: '#11111B' },
  copy: { marginTop: 10, fontFamily: theme.typography.regular, fontSize: 15, color: '#423B47' },
  buttonWrap: { width: '72%', marginTop: 28, borderRadius: 10, overflow: 'hidden' },
  button: { height: 50, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#303034' },
  buttonPressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  buttonText: { color: 'white', fontFamily: theme.typography.semibold, fontSize: 14 },
});
