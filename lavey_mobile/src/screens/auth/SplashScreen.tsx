import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useLogoReady } from '../../utils/deferLogo';

export function SplashScreen() {
  const logoReady = useLogoReady();
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
        {logoReady ? (
          <Image source={require('../../../assets/app-heart-icon.png')} resizeMode="contain" style={styles.logo} fadeDuration={0} />
        ) : (
          <View style={styles.logo} />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  brand: { alignItems: 'center', justifyContent: 'center' },
  logo: { width: 168, height: 168 },
});
