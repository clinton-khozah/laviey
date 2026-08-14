import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";
import { WebView } from "react-native-webview";

/**
 * Play/pause button for a Spotify track preview. Uses the real preview_url via expo-audio when
 * Spotify provides one; otherwise falls back to a hidden Spotify iframe embed player (Spotify's
 * 2024 API change means most tracks no longer return preview_url from the catalog API, so this
 * fallback is the common path, not the rare one). mediaPlaybackRequiresUserAction is disabled —
 * the WebView never receives a real touch itself, only the injected play() call from this button.
 */
export function SpotifyPreviewButton({
  spotifyId,
  previewUrl,
  size = 44,
}: {
  spotifyId: string;
  previewUrl: string | null;
  size?: number;
}) {
  const [playing, setPlaying] = useState(false);
  const webviewRef = useRef<WebView>(null);
  const player = useAudioPlayer();

  useEffect(() => () => { try { player.pause(); } catch { /* already released */ } }, [player]);

  const toggle = () => {
    if (previewUrl) {
      if (playing) player.pause();
      else {
        player.replace(previewUrl);
        player.play();
      }
      setPlaying((v) => !v);
      return;
    }
    webviewRef.current?.injectJavaScript("window.requestToggle && window.requestToggle(); true;");
    setPlaying((v) => !v);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playing ? "Pause song preview" : "Play song preview"}
        onPress={toggle}
        style={[styles.btn, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <Ionicons name={playing ? "pause" : "play"} size={size * 0.44} color="#211A28" />
      </Pressable>
      {!previewUrl ? (
        <WebView
          ref={webviewRef}
          source={{ html: embedHtml(spotifyId) }}
          style={styles.hidden}
          javaScriptEnabled
          domStorageEnabled
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
        />
      ) : null}
    </>
  );
}

function embedHtml(spotifyId: string): string {
  const safeId = spotifyId.replace(/[^A-Za-z0-9]/g, "");
  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; width: 1px; height: 1px; overflow: hidden; background: transparent; }
    #embed { width: 1px; height: 1px; overflow: hidden; opacity: 0; }
  </style>
</head>
<body>
  <div id="embed"></div>
  <script src="https://open.spotify.com/embed/iframe-api/v1" async></script>
  <script>
    let controller;
    let pendingPlay = false;
    window.requestToggle = () => {
      if (controller) controller.togglePlay();
      else pendingPlay = true;
    };
    window.onSpotifyIframeApiReady = IFrameAPI => {
      IFrameAPI.createController(
        document.getElementById('embed'),
        { width: 1, height: 1, uri: 'spotify:track:${safeId}', theme: 'dark' },
        instance => {
          controller = instance;
          if (pendingPlay) {
            pendingPlay = false;
            controller.play();
          }
        }
      );
    };
  </script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  btn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1ED760",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  hidden: { width: 1, height: 1, opacity: 0, position: "absolute" },
});
