import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

export function SplashScreen() {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.96);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
    scale.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
  }, [opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.brand, animatedStyle]} accessibilityLabel="Lavey loading">
        <Image source={require('../../../assets/heart-tight.png')} resizeMode="contain" style={styles.logo} fadeDuration={0} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  brand: { alignItems: 'center', justifyContent: 'center' },
  logo: { width: 128, height: 128 },
});
