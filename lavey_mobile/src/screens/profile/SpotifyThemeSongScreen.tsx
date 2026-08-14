import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { profileApi, spotifyApi } from "../../api/services";
import { theme } from "../../constants/theme";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import type { ThemeSong } from "../../types";

type Track = { spotifyId: string; title: string; artist: string; albumArtUrl: string | null; previewUrl: string | null };
const DEBOUNCE_MS = 400;
const DARK = "#101018";
const PAGE_BG = "#F3F2F5";

export function SpotifyThemeSongScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "SpotifyThemeSong">) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [location, setLocation] = useState<string | null>(null);
  const [searching, setSearching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<ThemeSong | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [embeddedTrack, setEmbeddedTrack] = useState<Track | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spotifyWebPlayer = useRef<WebView>(null);
  const player = useAudioPlayer();

  const load = useCallback(async (term?: string) => {
    setSearching(true);
    try {
      const data = await spotifyApi.search(term);
      setResults(data.tracks);
      setLocation(data.locationLabel);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Music suggestions are unavailable right now.");
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void profileApi.me()
      .then((profile) => { if (mounted) setCurrent(profile.themeSong ?? null); })
      .catch(() => undefined);
    void load();
    return () => {
      mounted = false;
      try { player.pause(); } catch { /* Player may already be released during navigation. */ }
    };
  }, [load]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!query.trim()) return;
    debounce.current = setTimeout(() => void load(query), DEBOUNCE_MS);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [load, query]);

  const togglePreview = (track: Track) => {
    setEmbeddedTrack(track);
    if (!track.previewUrl) return;
    if (previewingId === track.spotifyId) {
      player.pause();
      setPreviewingId(null);
    } else {
      player.replace(track.previewUrl);
      player.play();
      setPreviewingId(track.spotifyId);
    }
  };

  const closePlayer = () => {
    try { player.pause(); } catch { /* Player may already be released. */ }
    setPreviewingId(null);
    setEmbeddedTrack(null);
  };

  const playFromModal = () => {
    if (!embeddedTrack) return;
    if (embeddedTrack.previewUrl) {
      togglePreview(embeddedTrack);
      return;
    }
    spotifyWebPlayer.current?.injectJavaScript("window.requestToggle && window.requestToggle(); true;");
    setPreviewingId((currentId) => currentId === embeddedTrack.spotifyId ? null : embeddedTrack.spotifyId);
  };

  const selectTrack = async (track: Track) => {
    setSavingId(track.spotifyId);
    try {
      const profile = await profileApi.setThemeSong({
        spotifyId: String(track.spotifyId),
        title: String(track.title || "Untitled track").slice(0, 200),
        artist: String(track.artist || "Unknown artist").slice(0, 200),
        previewUrl: track.previewUrl || null,
        albumArtUrl: track.albumArtUrl || null,
      });
      setCurrent(profile.themeSong ?? null);
      try { player.pause(); } catch { /* Player may already be released. */ }
      setPreviewingId(null);
      setEmbeddedTrack(null);
      navigation.goBack();
    } catch (e) {
      Alert.alert("Couldn't set theme song", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setSavingId(null);
    }
  };

  const header = (
    <>
      <LinearGradient colors={["#3D1F5C", "#7B2D5B", "#C44569"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="musical-notes" size={22} color="#FFFFFF" />
        </View>
        <Text style={styles.eyebrow}>Your profile sound</Text>
        <Text style={styles.heroTitle}>Find your theme song</Text>
        <Text style={styles.heroCopy}>Choose the track people hear when they discover you.</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#8C8798" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Song, artist or mood"
            placeholderTextColor="#A09AA5"
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={() => void load(query)}
          />
          {query ? (
            <Pressable onPress={() => { setQuery(""); void load(); }} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#A09AA5" />
            </Pressable>
          ) : null}
        </View>
      </LinearGradient>

      {current ? (
        <View style={styles.currentCard}>
          {current.albumArtUrl ? (
            <Image source={{ uri: current.albumArtUrl }} style={styles.currentArt} />
          ) : (
            <View style={[styles.currentArt, styles.fallback]}>
              <Ionicons name="musical-note" size={20} color="#FFFFFF" />
            </View>
          )}
          <View style={styles.trackCopy}>
            <Text style={styles.currentLabel}>On your profile</Text>
            <Text style={styles.currentTitle} numberOfLines={1}>{current.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{current.artist}</Text>
          </View>
          <Pressable
            style={styles.remove}
            onPress={async () => setCurrent((await profileApi.clearThemeSong()).themeSong ?? null)}
          >
            <Ionicons name="trash-outline" size={17} color="#888888" />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.sectionHeading}>
        <View style={styles.sectionHeadingCopy}>
          <Text style={styles.sectionTitle}>{query ? "Search results" : "Popular near you"}</Text>
          <Text style={styles.sectionSub}>
            {location ? `Inspired by listeners in ${location}` : "Fresh picks and popular searches"}
          </Text>
        </View>
      </View>
      {error ? (
        <View style={styles.error}>
          <Ionicons name="cloud-offline-outline" size={18} color={theme.colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void load(query)}>
            <Text style={styles.retry}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
      {!error && results.length ? (
        <Text style={styles.resultLabel}>{query ? `Top matches for “${query}”` : "Recommended tracks"}</Text>
      ) : null}
    </>
  );

  return (
    <SafeAreaView style={styles.root} edges={["bottom"]}>
      <FlatList
        style={styles.list}
        data={results}
        keyExtractor={(item, index) => item.spotifyId || `track-${index}`}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        renderItem={({ item, index }) => {
          const selected = current?.spotifyId === item.spotifyId;
          return (
            <View style={styles.row}>
              <Text style={styles.rank}>{String(index + 1).padStart(2, "0")}</Text>
              {item.albumArtUrl ? <Image source={{ uri: item.albumArtUrl }} style={styles.art} /> : <View style={[styles.art, styles.fallback]}><Ionicons name="musical-note" size={18} color="#FFF" /></View>}
              <View style={styles.trackCopy}><Text style={styles.title} numberOfLines={1}>{item.title}</Text><Text style={styles.artist} numberOfLines={1}>{item.artist}</Text></View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Play ${item.title}`}
                hitSlop={8}
                onPress={() => togglePreview(item)}
                style={styles.play}
              >
                <Ionicons name={previewingId === item.spotifyId ? "pause" : "play"} size={15} color={DARK} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={selected ? `${item.title} is your theme song` : `Set ${item.title} as your theme song`}
                disabled={Boolean(savingId) || selected}
                hitSlop={8}
                onPress={() => void selectTrack(item)}
                style={[styles.addBtn, selected && styles.addBtnSelected]}
              >
                {savingId === item.spotifyId ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name={selected ? "checkmark" : "add"} size={18} color={selected ? "#FFFFFF" : DARK} />
                )}
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={
          searching ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={DARK} size="small" />
              <Text style={styles.loadingText}>Loading tracks…</Text>
            </View>
          ) : error ? null : (
            <Text style={styles.empty}>No songs found. Try an artist or mood.</Text>
          )
        }
      />
      <Modal visible={Boolean(embeddedTrack)} animationType="slide" transparent onRequestClose={closePlayer}>
        <Pressable style={styles.playerBackdrop} onPress={closePlayer}>
          <Pressable style={styles.playerSheet} onPress={() => undefined}>
            <View style={styles.playerHandle} />
            <Pressable style={styles.playerClose} onPress={closePlayer}><Ionicons name="close" size={18} color={DARK} /></Pressable>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.playerScroll}>
            <View style={styles.playerHero}>
              <View style={styles.artGlow}>
                {embeddedTrack?.albumArtUrl
                  ? <Image source={{ uri: embeddedTrack.albumArtUrl }} style={styles.playerArt} />
                  : <View style={[styles.playerArt, styles.fallback]}><Ionicons name="musical-notes" size={52} color="#FFFFFF" /></View>}
              </View>
              <View style={styles.spotifyBadge}><Ionicons name="musical-note" size={13} color="#1ED760" /><Text style={styles.spotifyBadgeText}>Spotify preview</Text></View>
              <Text style={styles.playerTitle} numberOfLines={2}>{embeddedTrack?.title}</Text>
              <Text style={styles.playerArtist} numberOfLines={1}>{embeddedTrack?.artist}</Text>
              {embeddedTrack ? (
                <View style={styles.directControls}>
                  <View style={styles.progressTrack}><View style={styles.progressFill} /></View>
                  <View style={styles.timeRow}><Text style={styles.timeText}>Preview</Text><Text style={styles.timeText}>30 sec</Text></View>
                  <Pressable accessibilityRole="button" accessibilityLabel={previewingId === embeddedTrack.spotifyId ? "Pause song preview" : "Play song preview"} style={styles.mainPlay} onPress={playFromModal}>
                    <Ionicons name={previewingId === embeddedTrack.spotifyId ? "pause" : "play"} size={24} color={DARK} />
                  </Pressable>
                  <Text style={styles.playLabel}>{previewingId === embeddedTrack.spotifyId ? "Pause" : "Play preview"}</Text>
                </View>
              ) : null}
            </View>
            {embeddedTrack && !embeddedTrack.previewUrl ? (
              <>
                <WebView
                  ref={spotifyWebPlayer}
                  source={{ html: spotifyEmbedHtml(embeddedTrack.spotifyId) }}
                  style={styles.webPlayer}
                  javaScriptEnabled
                  domStorageEnabled
                  mediaPlaybackRequiresUserAction={false}
                  allowsInlineMediaPlayback
                />
                <Text style={styles.previewHint}>Playback stays inside Lavey. Use the play button above.</Text>
              </>
            ) : <Text style={styles.previewHint}>Tap play to hear a short preview of this track.</Text>}
            <Pressable style={styles.setFromPlayer} disabled={savingId === embeddedTrack?.spotifyId} onPress={() => embeddedTrack && void selectTrack(embeddedTrack)}>
              {savingId === embeddedTrack?.spotifyId ? <ActivityIndicator color="#FFFFFF" /> : <><Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" /><Text style={styles.setFromPlayerText}>Use as theme song</Text></>}
            </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE_BG },
  list: { flex: 1 },
  content: { flexGrow: 1, paddingBottom: 30 },
  hero: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  eyebrow: {
    color: "rgba(255,255,255,.78)",
    fontFamily: theme.typography.medium,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontFamily: theme.typography.bold,
    fontSize: 24,
    marginTop: 4,
    letterSpacing: -0.3,
  },
  heroCopy: {
    color: "rgba(255,255,255,.72)",
    fontFamily: theme.typography.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 16,
  },
  searchBox: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: DARK,
    fontFamily: theme.typography.medium,
    fontSize: 14,
  },
  currentCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ECECEC",
  },
  currentArt: { width: 54, height: 54, borderRadius: 12 },
  currentLabel: {
    fontFamily: theme.typography.medium,
    fontSize: 10,
    letterSpacing: 0.3,
    color: "#9A949F",
    textTransform: "uppercase",
  },
  currentTitle: {
    fontFamily: theme.typography.semibold,
    fontSize: 14,
    color: DARK,
    marginTop: 2,
  },
  remove: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F2F4",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeading: {
    marginHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionHeadingCopy: { flex: 1 },
  sectionTitle: {
    fontFamily: theme.typography.bold,
    fontSize: 18,
    color: DARK,
    letterSpacing: -0.2,
  },
  sectionSub: {
    fontFamily: theme.typography.regular,
    fontSize: 12,
    color: "#8C8798",
    marginTop: 3,
  },
  resultLabel: {
    marginHorizontal: 18,
    marginTop: 4,
    marginBottom: 6,
    fontFamily: theme.typography.semibold,
    fontSize: 12,
    color: "#8C8798",
  },
  row: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ECECEC",
  },
  rank: {
    width: 22,
    fontFamily: theme.typography.medium,
    color: "#B2ACB8",
    fontSize: 11,
  },
  art: { width: 48, height: 48, borderRadius: 10 },
  fallback: { backgroundColor: DARK, alignItems: "center", justifyContent: "center" },
  trackCopy: { flex: 1 },
  title: { fontFamily: theme.typography.semibold, fontSize: 14, color: DARK },
  artist: { fontFamily: theme.typography.regular, fontSize: 12, color: "#8C8798", marginTop: 2 },
  play: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F2F4",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D8D4DC",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnSelected: {
    backgroundColor: DARK,
    borderColor: DARK,
  },
  error: {
    marginHorizontal: 16,
    padding: 13,
    borderRadius: 14,
    backgroundColor: "#FFF0F0",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: { flex: 1, color: theme.colors.danger, fontFamily: theme.typography.medium, fontSize: 12 },
  retry: { color: theme.colors.danger, fontFamily: theme.typography.bold, fontSize: 12 },
  empty: {
    textAlign: "center",
    margin: 30,
    color: "#8C8798",
    fontFamily: theme.typography.regular,
    fontSize: 13,
  },
  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    gap: 10,
  },
  loadingText: {
    color: "#8C8798",
    fontFamily: theme.typography.medium,
    fontSize: 13,
  },
  playerBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(16,16,24,.55)" },
  playerSheet: {
    maxHeight: "92%",
    padding: 12,
    paddingBottom: 14,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  playerScroll: { paddingBottom: 14 },
  playerHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E0E4",
    marginBottom: 8,
  },
  playerClose: {
    position: "absolute",
    zIndex: 5,
    right: 16,
    top: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F2F4",
  },
  playerHero: {
    alignItems: "center",
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 22,
    backgroundColor: DARK,
  },
  artGlow: {
    padding: 4,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,.1)",
  },
  playerArt: { width: 140, height: 140, borderRadius: 16 },
  spotifyBadge: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,.12)",
  },
  spotifyBadgeText: {
    color: "#EDE7F3",
    fontFamily: theme.typography.medium,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  playerTitle: {
    marginTop: 10,
    color: "#FFFFFF",
    textAlign: "center",
    fontFamily: theme.typography.bold,
    fontSize: 20,
    lineHeight: 26,
  },
  playerArtist: {
    marginTop: 4,
    color: "rgba(255,255,255,.72)",
    fontFamily: theme.typography.regular,
    fontSize: 13,
  },
  directControls: { width: "100%", alignItems: "center", marginTop: 16 },
  progressTrack: {
    width: "100%",
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,.2)",
    overflow: "hidden",
  },
  progressFill: { width: "32%", height: 3, borderRadius: 2, backgroundColor: "#FFFFFF" },
  timeRow: { width: "100%", flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  timeText: { color: "rgba(255,255,255,.55)", fontFamily: theme.typography.regular, fontSize: 10 },
  mainPlay: {
    width: 52,
    height: 52,
    marginTop: 8,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  playLabel: {
    marginTop: 6,
    color: "rgba(255,255,255,.8)",
    fontFamily: theme.typography.medium,
    fontSize: 11,
  },
  webPlayer: { width: 1, height: 1, opacity: 0, alignSelf: "center" },
  previewHint: {
    marginTop: 12,
    textAlign: "center",
    color: "#8C8798",
    fontFamily: theme.typography.regular,
    fontSize: 12,
  },
  setFromPlayer: {
    height: 50,
    marginTop: 14,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: DARK,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  setFromPlayerText: { color: "#FFFFFF", fontFamily: theme.typography.bold, fontSize: 14 },
});

function spotifyEmbedHtml(spotifyId: string): string {
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
          window.spotifyController = instance;
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
