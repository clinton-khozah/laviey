import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { contentApi } from '../../api/services';
import { theme } from '../../constants/theme';
import { useAppearance } from '../../context/AppearanceContext';
import { useAppData } from '../../context/AppDataContext';
import type { MainTabParamList } from '../../components/navigation/BottomTabNavigator';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import type { ThemeSong } from '../../types';
import { BackToForYouButton } from '../../components/navigation/BackToForYouButton';

const DARK = '#101018';

export function MatchesScreen({ navigation }: BottomTabScreenProps<MainTabParamList, 'Matches'>) {
  const { mode } = useAppearance();
  const { profile } = useAppData();
  const [uri, setUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [posted, setPosted] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [checkingPhoto, setCheckingPhoto] = useState(false);
  const [compliment, setCompliment] = useState<string | null>(null);
  const [loadingCompliment, setLoadingCompliment] = useState(false);
  const [themeSong, setThemeSong] = useState<ThemeSong | null>(null);
  const displayNameRef = useRef('');
  const complimentRequestRef = useRef(0);

  useEffect(() => {
    if (profile) {
      displayNameRef.current = profile.displayName;
      setThemeSong(profile.themeSong ?? null);
    }
  }, [profile]);

  const openThemeSongPicker = () => {
    navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate('SpotifyThemeSong');
  };

  const fetchCompliment = async (pickedUri: string) => {
    const requestId = complimentRequestRef.current + 1;
    complimentRequestRef.current = requestId;
    setLoadingCompliment(true);
    setCompliment(null);
    try {
      const result = await contentApi.photoCompliment(pickedUri, displayNameRef.current);
      if (complimentRequestRef.current !== requestId) return;
      setCompliment(result.compliment);
    } catch {
      if (complimentRequestRef.current !== requestId) return;
      setCompliment(null);
    } finally {
      if (complimentRequestRef.current === requestId) setLoadingCompliment(false);
    }
  };

  const choose = async (camera = false) => {
    const permission = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return Alert.alert('Permission needed', `Allow ${camera ? 'camera' : 'photo'} access to create a post.`);
    }
    const result = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: true, aspect: [3, 4] })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: true, aspect: [3, 4] });
    if (result.canceled) return;

    const pickedUri = result.assets[0].uri;
    complimentRequestRef.current += 1;
    setCompliment(null);
    setPublishError(null);
    setCheckingPhoto(true);
    try {
      const check = await contentApi.checkPhoto(pickedUri);
      if (!check.allowed) {
        Alert.alert(
          "Couldn't use this photo",
          "This photo looks too explicit to post. A little cheeky is fine — just nothing fully explicit.",
        );
        return;
      }
      setUri(pickedUri);
      void fetchCompliment(pickedUri);
    } catch {
      // AI unavailable — fail open, same as the backend does.
      setUri(pickedUri);
      void fetchCompliment(pickedUri);
    } finally {
      setCheckingPhoto(false);
    }
  };

  const clearPhoto = () => {
    setUri(null);
    setCompliment(null);
    setLoadingCompliment(false);
    setPublishError(null);
    complimentRequestRef.current += 1;
  };

  const useComplimentAsCaption = () => {
    if (!compliment) return;
    setCaption(compliment.slice(0, 120));
  };

  const publish = async () => {
    if (!uri) return;
    setPublishing(true);
    setPublishError(null);
    try {
      await contentApi.createPost(uri, caption.trim() || undefined);
      clearPhoto();
      setCaption('');
      setPosted(true);
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  if (mode !== 'web') {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.classicTop}>
          <BackToForYouButton variant="light" />
          <Text style={styles.title}>Create post</Text>
        </View>
        <Pressable style={styles.classicChoose} onPress={() => void choose()}>
          <Text>Choose a photo</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <BackToForYouButton variant="light" />
        </View>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>New post</Text>
          <Text style={styles.title}>Post a picture</Text>
          <Text style={styles.subtitle}>Portrait photos work best — clear, well-lit, and you in frame.</Text>
        </View>

        <Pressable
          style={[styles.preview, uri && styles.previewFilled]}
          onPress={() => !uri && !checkingPhoto && void choose()}
          disabled={checkingPhoto}
        >
          {checkingPhoto ? (
            <View style={styles.empty}>
              <ActivityIndicator size="small" color={DARK} />
              <Text style={styles.hint}>Checking your photo…</Text>
            </View>
          ) : uri ? (
            <>
              <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <Pressable style={styles.clear} onPress={clearPhoto}>
                <Ionicons name="close" size={18} color={DARK} />
              </Pressable>
              <View style={styles.addedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                <Text style={styles.added}>Photo added</Text>
              </View>
            </>
          ) : (
            <View style={styles.empty}>
              <View style={styles.uploadIcon}>
                <Ionicons name="image-outline" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.emptyTitle}>Tap to add your photo</Text>
              <Text style={styles.hint}>3:4 portrait recommended</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.choices}>
          <Pressable style={styles.choice} onPress={() => void choose(true)}>
            <Ionicons name="camera-outline" size={20} color={DARK} />
            <Text style={styles.choiceText}>Camera</Text>
          </Pressable>
          <Pressable style={styles.choice} onPress={() => void choose()}>
            <Ionicons name="images-outline" size={20} color={DARK} />
            <Text style={styles.choiceText}>Gallery</Text>
          </Pressable>
        </View>

        <Pressable style={styles.songCard} onPress={openThemeSongPicker}>
          <View style={styles.spotifyIcon}>
            <FontAwesome6 name="spotify" size={22} color="#FFF" />
          </View>
          {themeSong?.albumArtUrl ? <Image source={{ uri: themeSong.albumArtUrl }} style={styles.songArt} /> : null}
          <View style={styles.songCopy}>
            <Text style={styles.songEyebrow}>Theme song · optional</Text>
            <Text style={styles.songTitle} numberOfLines={1}>{themeSong?.title ?? 'Add a song to your profile'}</Text>
            <Text style={styles.songArtist} numberOfLines={1}>{themeSong?.artist ?? 'Shows on your profile and posts'}</Text>
          </View>
          <View style={styles.songAction}>
            <Ionicons name={themeSong ? 'swap-horizontal' : 'add'} size={18} color={DARK} />
          </View>
        </Pressable>
        {themeSong ? <Text style={styles.songNote}>Updating this changes your profile theme song.</Text> : null}

        {uri && (loadingCompliment || compliment) ? (
          <View style={styles.complimentCard}>
            <View style={styles.complimentHead}>
              <Image source={require('../../../assets/heart-tight.png')} contentFit="contain" style={styles.complimentLogo} />
              <Text style={styles.complimentLabel}>Loviey noticed</Text>
            </View>
            {loadingCompliment ? (
              <Text style={styles.complimentTextLoading}>Scanning your pic for something nice…</Text>
            ) : (
              <>
                <Text style={styles.complimentText}>{compliment}</Text>
                <Pressable style={styles.complimentBtn} onPress={useComplimentAsCaption}>
                  <Text style={styles.complimentBtnText}>Use as caption</Text>
                </Pressable>
              </>
            )}
          </View>
        ) : null}

        <View style={styles.captionSection}>
          <Text style={styles.label}>Caption</Text>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={120}
            placeholder="Say something about this moment…"
            placeholderTextColor="#B0AAB4"
            style={styles.input}
          />
          <Text style={styles.count}>{caption.length}/120</Text>
        </View>

        <Pressable
          disabled={!uri || publishing}
          onPress={() => void publish()}
          style={[styles.publish, (!uri || publishing) && styles.publishDisabled]}
        >
          {publishing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="arrow-up-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.publishText}>Post photo</Text>
            </>
          )}
        </Pressable>
        {publishError ? <Text style={styles.publishError}>{publishError}</Text> : null}
      </ScrollView>

      <Modal visible={posted} transparent animationType="fade" onRequestClose={() => setPosted(false)}>
        <View style={styles.postedBackdrop}>
          <View style={styles.postedCard}>
            <Image source={require('../../../assets/heart-tight.png')} contentFit="contain" style={styles.postedLogo} />
            <Text style={styles.postedTitle}>Posted!</Text>
            <Text style={styles.postedSubtitle}>Your photo is now live on Lavey.</Text>
            <Pressable
              style={styles.postedBtn}
              onPress={() => {
                setPosted(false);
                navigation.navigate('Profile');
              }}
            >
              <Text style={styles.postedBtnText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { paddingBottom: 100 },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 4,
    alignItems: 'flex-start',
  },
  classicTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  hero: {
    paddingTop: 20,
    paddingBottom: 8,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  eyebrow: {
    fontFamily: theme.typography.medium,
    fontSize: 11,
    letterSpacing: 0.6,
    color: '#8F8994',
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 6,
    fontFamily: theme.typography.bold,
    fontSize: 26,
    color: DARK,
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: theme.typography.regular,
    fontSize: 13,
    lineHeight: 18,
    color: '#7A7580',
    textAlign: 'center',
    maxWidth: 300,
  },
  preview: {
    marginHorizontal: 24,
    marginTop: 20,
    height: 340,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D8D4DC',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewFilled: {
    borderStyle: 'solid',
    borderColor: '#E8E6EA',
  },
  empty: { alignItems: 'center', paddingHorizontal: 24 },
  uploadIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: DARK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 16,
    fontFamily: theme.typography.semibold,
    fontSize: 16,
    color: DARK,
  },
  hint: {
    color: '#9A949F',
    fontFamily: theme.typography.regular,
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  clear: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,.94)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E4E4E4',
  },
  addedBadge: {
    position: 'absolute',
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16,16,24,.78)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  added: {
    color: '#FFFFFF',
    fontFamily: theme.typography.medium,
    fontSize: 11,
  },
  choices: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 24,
    marginTop: 14,
  },
  choice: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E4E4E4',
  },
  choiceText: {
    fontFamily: theme.typography.semibold,
    fontSize: 13,
    color: DARK,
  },
  songCard: {
    minHeight: 72,
    marginHorizontal: 24,
    marginTop: 14,
    padding: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: DARK,
  },
  spotifyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1ED760',
  },
  songArt: { width: 40, height: 40, borderRadius: 10 },
  songCopy: { flex: 1 },
  songEyebrow: {
    color: '#A8A0B0',
    fontFamily: theme.typography.medium,
    fontSize: 10,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  songTitle: {
    marginTop: 3,
    color: '#FFFFFF',
    fontFamily: theme.typography.semibold,
    fontSize: 13,
  },
  songArtist: {
    marginTop: 2,
    color: '#A8A0B0',
    fontFamily: theme.typography.regular,
    fontSize: 11,
  },
  songAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  songNote: {
    marginHorizontal: 28,
    marginTop: 6,
    color: '#9A949F',
    fontFamily: theme.typography.regular,
    fontSize: 11,
    lineHeight: 15,
  },
  complimentCard: {
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ECECEC',
  },
  complimentHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  complimentLogo: { width: 18, height: 18 },
  complimentLabel: { fontFamily: theme.typography.bold, fontSize: 11, color: DARK },
  complimentTextLoading: {
    marginTop: 8,
    fontFamily: theme.typography.regular,
    fontSize: 13,
    color: '#8D8790',
  },
  complimentText: {
    marginTop: 8,
    fontFamily: theme.typography.regular,
    fontSize: 14,
    color: '#3A3640',
    lineHeight: 20,
  },
  complimentBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: DARK,
  },
  complimentBtnText: { fontFamily: theme.typography.semibold, fontSize: 12, color: '#FFFFFF' },
  captionSection: { marginHorizontal: 24, marginTop: 20 },
  label: {
    fontFamily: theme.typography.semibold,
    fontSize: 13,
    color: DARK,
    marginBottom: 8,
  },
  input: {
    minHeight: 96,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E4E4E4',
    padding: 14,
    fontFamily: theme.typography.regular,
    fontSize: 14,
    color: DARK,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  count: {
    marginTop: 6,
    textAlign: 'right',
    color: '#A09AA5',
    fontFamily: theme.typography.regular,
    fontSize: 11,
  },
  publish: {
    marginHorizontal: 24,
    marginTop: 18,
    height: 52,
    borderRadius: 16,
    backgroundColor: DARK,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  publishDisabled: { opacity: 0.42 },
  publishText: {
    color: '#FFFFFF',
    fontFamily: theme.typography.bold,
    fontSize: 15,
  },
  publishError: {
    marginHorizontal: 24,
    marginTop: 10,
    textAlign: 'center',
    fontFamily: theme.typography.medium,
    fontSize: 12.5,
    color: '#E23B3B',
  },
  classicChoose: { margin: 30, padding: 20, backgroundColor: '#FFFFFF' },
  postedBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16,16,24,.55)',
    paddingHorizontal: 40,
  },
  postedCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 30,
    paddingHorizontal: 26,
    alignItems: 'center',
  },
  postedLogo: { width: 56, height: 56, marginBottom: 14 },
  postedTitle: { fontFamily: theme.typography.bold, fontSize: 20, color: DARK },
  postedSubtitle: {
    marginTop: 6,
    fontFamily: theme.typography.regular,
    fontSize: 13,
    color: '#77717D',
    textAlign: 'center',
  },
  postedBtn: {
    marginTop: 20,
    alignSelf: 'stretch',
    height: 48,
    borderRadius: 16,
    backgroundColor: DARK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postedBtnText: { color: '#FFFFFF', fontFamily: theme.typography.bold, fontSize: 14 },
});
