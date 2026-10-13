import Svg, { Circle, Path, Rect } from "react-native-svg";
import { musicMarkColors, styles } from "./LaveyMusicMark.styles";
import { View } from "react-native";

/** Vinyl groove with a heart at the spindle. Not a third-party music logo. */
const HEART =
  "M20 23.2c-.3.2-3.7-2.1-5.2-4.1-1.1-1.5-1.2-3.1-.2-4.1 1-.9 2.3-.6 3 .4.4.5 1.1 1.5 1.6 1.5.5 0 1.2-1 1.6-1.5.7-1 2-1.3 3-.4 1 1 .9 2.6-.2 4.1-1.5 2-4.9 4.3-5.2 4.1z";

export function LaveyMusicMark({
  size = 40,
  tone = "light",
}: {
  size?: number;
  tone?: "light" | "dark";
}) {
  const tile = tone === "dark" ? musicMarkColors.tileDark : musicMarkColors.tile;
  const ink = tone === "dark" ? musicMarkColors.inkOnDark : musicMarkColors.ink;

  return (
    <View style={[styles.mark, { width: size, height: size }]} accessibilityElementsHidden>
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Rect width="40" height="40" rx="12" fill={tile} />
        <Circle cx="20" cy="20" r="13.2" stroke={ink} strokeWidth="1.6" fill="none" />
        <Circle cx="20" cy="20" r="8.4" stroke={ink} strokeWidth="1.15" fill="none" opacity={0.45} />
        <Path d={HEART} fill={ink} />
      </Svg>
    </View>
  );
}
