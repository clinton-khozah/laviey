import { Image, StyleSheet } from 'react-native';

interface GoogleLogoIconProps {
  size?: number;
}

const GOOGLE_LOGO = require('../../../assets/google-logo.png');

/** Official multicolor Google "G" mark for sign-in buttons. */
export function GoogleLogoIcon({ size = 19 }: GoogleLogoIconProps) {
  return (
    <Image
      source={GOOGLE_LOGO}
      style={[styles.icon, { width: size, height: size }]}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 19,
    height: 19,
  },
});
