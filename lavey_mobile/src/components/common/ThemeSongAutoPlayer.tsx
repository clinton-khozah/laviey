import { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import { useAudioPlayer } from "expo-audio";
import { WebView } from "react-native-webview";

export interface AutoPlayTrack {
  spotifyId: string;
  previewUrl: string | null;
}

/**
 * Silently drives playback of whichever theme song is currently "active" (the card on screen).
 * Mount once per feed screen and just hand it the active track — swap `track` as the user
 * scrolls and it takes care of starting/stopping audio, including the hidden-WebView fallback
 * for tracks with no direct preview_url (the common case since Spotify's 2024 API change).
 *
 * The WebView + Spotify embed controller are created once and kept alive for the life of this
 * component — switching tracks calls the controller's own loadUri() instead of tearing down and
 * recreating the iframe each time, which is what made playback lag noticeably behind the scroll.
 */
export function ThemeSongAutoPlayer({ track }: { track: AutoPlayTrack | null }) {
  const player = useAudioPlayer();
  const webviewRef = useRef<WebView>(null);

  useEffect(() => {
    if (track?.previewUrl) {
      player.loop = true;
      player.replace(track.previewUrl);
      player.play();
      webviewRef.current?.injectJavaScript("window.stopTrack && window.stopTrack(); true;");
    } else if (track?.spotifyId) {
      player.pause();
      webviewRef.current?.injectJavaScript(`window.loadAndPlay && window.loadAndPlay(${JSON.stringify(track.spotifyId)}); true;`);
    } else {
      player.pause();
      webviewRef.current?.injectJavaScript("window.stopTrack && window.stopTrack(); true;");
    }
  }, [track?.spotifyId, track?.previewUrl, player]);

  useEffect(() => () => { try { player.pause(); } catch { /* already released */ } }, [player]);

  return (
    <WebView
      ref={webviewRef}
      source={{ html: persistentEmbedHtml }}
      style={styles.hidden}
      javaScriptEnabled
      domStorageEnabled
      mediaPlaybackRequiresUserAction={false}
      allowsInlineMediaPlayback
    />
  );
}

const persistentEmbedHtml = `<!doctype html>
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
    let api;
    let controller;
    let initializing = false;
    let pendingId = null;

    function createWith(id) {
      initializing = true;
      api.createController(
        document.getElementById('embed'),
        { width: 1, height: 1, uri: 'spotify:track:' + id, theme: 'dark' },
        instance => {
          controller = instance;
          initializing = false;
          const target = pendingId && pendingId !== id ? pendingId : id;
          pendingId = null;
          controller.loadUri('spotify:track:' + target);
          controller.play();
        }
      );
    }

    window.loadAndPlay = id => {
      if (controller) {
        controller.loadUri('spotify:track:' + id);
        controller.play();
      } else if (initializing) {
        pendingId = id;
      } else if (api) {
        createWith(id);
      } else {
        pendingId = id;
      }
    };
    window.stopTrack = () => { if (controller) controller.pause(); };

    window.onSpotifyIframeApiReady = IFrameAPI => {
      api = IFrameAPI;
      if (pendingId) createWith(pendingId);
    };
  </script>
</body>
</html>`;

const styles = StyleSheet.create({
  hidden: { width: 1, height: 1, opacity: 0, position: "absolute" },
});
