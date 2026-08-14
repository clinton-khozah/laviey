import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NavigationProp } from "@react-navigation/native";
import { chatApi, contentApi, discoverApi } from "../../api/services";
import { CircularProgressRing } from "../../components/common/CircularProgressRing";
import { LoadingIndicator } from "../../components/common/LoadingIndicator";
import { theme } from "../../constants/theme";
import { useAppearance } from "../../context/AppearanceContext";
import { useAppData } from "../../context/AppDataContext";
import type { Profile, ProfilePost, UserProfile } from "../../types";
import type { MainTabParamList } from "../../components/navigation/BottomTabNavigator";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import { PostViewerModal } from "./components/PostViewerModal";
import { PlatinumModal } from "../../components/subscription/PlatinumModal";
import { ProfileFeedModal } from "../home/components/ProfileFeedModal";
import { SettingsModal } from "./SettingsModal";
import { PresenceDot } from "../../components/common/PresenceDot";
import { useAccessMode } from "../../context/AccessModeContext";
import { BackToForYouButton } from "../../components/navigation/BackToForYouButton";
import * as ImagePicker from "expo-image-picker";

const DARK = "#101018";
const MUTED = "#8C8798";
const QUIZ_PROGRESS_COLORS = ["#7c3aed", "#ff8a5c"] as const;

export function ProfileScreen({
  navigation,
}: BottomTabScreenProps<MainTabParamList, "Profile">) {
  const { mode } = useAppearance();
  const { allFree } = useAccessMode();
  const web = mode === "web";
  const rootNavigation = navigation.getParent<NavigationProp<RootStackParamList>>();
  const { width: screenWidth } = useWindowDimensions();
  // Percentage width + aspectRatio inside a flexWrap row can fail to lay out under Fabric —
  // compute pixel dimensions explicitly instead so the grid tiles reliably render.
  const tileWidth = (screenWidth - 14 * 2 - 6 * 2) / 3;
  const tileHeight = tileWidth / 0.72;
  const {
    profile,
    setProfile,
    refreshProfile,
    likers: profileLikers,
    likedBackIds,
    likersLoading: profileLikersLoading,
    refreshLikers: refetchProfileLikers,
  } = useAppData();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [platinumOpen, setPlatinumOpen] = useState(false);
  const [tab, setTab] = useState<"posts" | "likes">("posts");
  const [postLikers, setPostLikers] = useState<Array<{ userId: string; name: string; avatar: string; postThumbnail: string; likedBack: boolean }>>([]);
  const [postLikersLoading, setPostLikersLoading] = useState(false);
  const [likeBackBusyId, setLikeBackBusyId] = useState<string | null>(null);
  const [extraProfiles, setExtraProfiles] = useState<Record<string, Profile>>({});
  const [likesPreviewProfile, setLikesPreviewProfile] = useState<Profile | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [postUploading, setPostUploading] = useState(false);
  const addPostFromGallery = useCallback(async () => {
    if (postUploading || !profile || profile.posts.length >= 5) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Gallery access needed", "Allow photo access to add a post.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    setPostUploading(true);
    try {
      const post = await contentApi.createPost(result.assets[0].uri);
      setProfile(profile ? { ...profile, posts: [...profile.posts, post] } : profile);
    } catch (error) {
      Alert.alert("Could not upload post", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setPostUploading(false);
    }
  }, [postUploading, profile]);
  useEffect(() => {
    if (tab !== "likes") return;
    setPostLikersLoading(true);
    void contentApi
      .receivedPostLikes()
      .then(setPostLikers)
      .catch(() => setPostLikers([]))
      .finally(() => setPostLikersLoading(false));
  }, [tab]);
  // Post-likers only carry {userId, name, avatar, postThumbnail} — fetch the full profile for
  // anyone not already covered by the profile-likers list, so their card can show a vibe match
  // and presence dot, and so tapping it can open the full "view more info" sheet.
  useEffect(() => {
    const profileLikerIds = new Set(profileLikers.map((p) => p.id));
    const missing = postLikers.filter((p) => !profileLikerIds.has(p.userId) && !(p.userId in extraProfiles));
    if (!missing.length) return;
    void Promise.all(
      missing.map((p) =>
        discoverApi
          .profile(p.userId)
          .then((full) => [p.userId, full] as const)
          .catch(() => null),
      ),
    ).then((results) => {
      setExtraProfiles((prev) => {
        const next = { ...prev };
        for (const r of results) if (r) next[r[0]] = r[1];
        return next;
      });
    });
  }, [postLikers, profileLikers, extraProfiles]);
  const likers = useMemo(() => {
    const rows = new Map<string, { profile: Profile; photo: string; likedBack: boolean }>();
    for (const p of profileLikers) {
      rows.set(p.id, { profile: p, photo: p.avatar, likedBack: likedBackIds.has(p.id) });
    }
    for (const p of postLikers) {
      if (rows.has(p.userId)) continue;
      const full = extraProfiles[p.userId];
      if (!full) continue;
      rows.set(p.userId, { profile: full, photo: p.postThumbnail || full.avatar, likedBack: p.likedBack });
    }
    return Array.from(rows.values());
  }, [profileLikers, postLikers, likedBackIds, extraProfiles]);
  const likersLoading = profileLikersLoading || postLikersLoading;
  const completion = useMemo(() => {
    if (!profile) return null;
    const hasAvatar = Boolean(profile.avatarUrl);
    const hasDisplayName = Boolean(profile.displayName?.trim());
    const hasBio = (profile.bio?.trim().length ?? 0) >= 20;
    const hasInterests = profile.interests.length > 0;
    const hasPhotos = profile.posts.length > 0;
    const items: Array<{ id: string; label: string; cta: string; done: boolean }> = [
      { id: "photo", label: "Add a profile photo", cta: "Add photo", done: hasAvatar },
      { id: "verification", label: "Verify your identity", cta: "Verify", done: profile.verified },
      { id: "details", label: "Add your name, bio & interests", cta: "Edit profile", done: hasDisplayName && hasBio && hasInterests },
      { id: "gallery", label: "Add a few gallery photos", cta: "Add photos", done: hasPhotos },
    ];
    const completedCount = items.filter((i) => i.done).length;
    return { items, percent: Math.round((completedCount / items.length) * 100) };
  }, [profile]);
  const totalViews = useMemo(() => {
    if (!profile) return 0;
    const postViews = profile.posts.reduce((sum, p) => sum + (p.viewCount ?? 0), 0);
    return profile.stats.profileViews + postViews;
  }, [profile]);
  const likeBack = useCallback(
    async (userId: string) => {
      setLikeBackBusyId(userId);
      try {
        const result = await discoverApi.like(userId);
        if (result.matched) Alert.alert("It's a match! ❤️", "You can chat with them now.");
        void refetchProfileLikers(true);
        setPostLikers((prev) => prev.map((p) => (p.userId === userId ? { ...p, likedBack: true } : p)));
        void refreshProfile(true);
      } catch (e) {
        Alert.alert("Couldn't like back", e instanceof Error ? e.message : "Please try again.");
      } finally {
        setLikeBackBusyId(null);
      }
    },
    [refetchProfileLikers, refreshProfile],
  );
  const openChatWith = useCallback(
    async (userId: string) => {
      try {
        const { conversationId } = await chatApi.conversationByProfile(userId);
        if (!conversationId) throw new Error("Your match chat is still being prepared. Please try again.");
        navigation.getParent()?.navigate("ChatDetail", { conversationId });
      } catch (e) {
        Alert.alert("Couldn't open chat", e instanceof Error ? e.message : "Please try again.");
      }
    },
    [navigation],
  );
  if (!profile) return <LoadingIndicator fullScreen />;
  if (web)
    return (
      <SafeAreaView style={styles.webRoot}>
        <View style={styles.webTopBar}>
          <BackToForYouButton variant="light" />
          <View style={styles.webTopActions}>
            {!allFree ? (
              <Pressable style={styles.upgradePressableInline} onPress={() => setPlatinumOpen(true)}>
                <View style={styles.upgrade}>
                  <Ionicons name="diamond-outline" size={12} color={DARK} />
                  <Text style={styles.upgradeText}>Platinum</Text>
                </View>
              </Pressable>
            ) : null}
            <Pressable
              style={styles.settingsInline}
              onPress={() => setSettingsOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="More options"
            >
              <Ionicons name="ellipsis-horizontal" size={22} color={DARK} />
            </Pressable>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.webContent}>
          <View style={styles.avatarRing}>
            <Image
              source={{ uri: profile.avatarUrl }}
              style={styles.webAvatar}
            />
            {profile.verified ? (
              <View style={styles.verified}>
                <Ionicons name="checkmark" size={20} color="white" />
              </View>
            ) : (
              <Pressable
                style={styles.unverified}
                onPress={() => navigation.getParent()?.navigate("VerifyIdentity", { profile })}
              >
                <Ionicons name="shield-checkmark-outline" size={13} color="white" />
                <Text style={styles.unverifiedText}>Verify</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.webName}>{profile.displayName}</Text>
          {profile.bio?.trim() ? <Text style={styles.webBio}>{profile.bio}</Text> : (
            <Pressable style={styles.bioMissing} onPress={() => navigation.getParent()?.navigate("EditProfile", { profile })}>
              <Ionicons name="create-outline" size={14} color={MUTED} />
              <Text style={styles.bioMissingText}>Add a short bio</Text>
            </Pressable>
          )}
          <View style={styles.stats}>
            {[
              [profile.stats.crushesReceived, "CRUSHES"],
              [profile.stats.matches, "MATCHES"],
              [totalViews, "VIEWS"],
            ].map(([n, l]) => (
              <View style={styles.stat} key={String(l)}>
                <Text style={styles.statN}>{n}</Text>
                <Text style={styles.statL}>{l}</Text>
              </View>
            ))}
          </View>
          {completion && completion.percent < 100 ? (
            <View style={styles.completionCard}>
              <View style={styles.completionHead}>
                <View style={styles.completionHeadText}>
                  <Text style={styles.completionEyebrow}>Profile completion</Text>
                  <Text style={styles.completionTitle}>{completion.percent}% complete</Text>
                  <Text style={styles.completionCopy}>
                    A finished profile helps you get better matches.
                  </Text>
                </View>
                <CircularProgressRing percent={completion.percent} />
              </View>
              <View style={styles.completionBarTrack}>
                <LinearGradient
                  colors={[...QUIZ_PROGRESS_COLORS]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={[styles.completionBarFill, { width: `${completion.percent}%` }]}
                />
              </View>
              {completion.items
                .filter((item) => !item.done)
                .map((item) => (
                  <View key={item.id} style={styles.completionRow}>
                    <Text style={styles.completionRowLabel}>{item.label}</Text>
                    <Pressable
                      style={styles.completionCta}
                      onPress={() => item.id === "gallery"
                        ? void addPostFromGallery()
                        : navigation.getParent()?.navigate(item.id === "verification" ? "VerifyIdentity" : "EditProfile", { profile })}
                    >
                      <Text style={styles.completionCtaText}>{item.cta}</Text>
                    </Pressable>
                  </View>
                ))}
            </View>
          ) : null}
          <View style={styles.switcher}>
            <Pressable onPress={() => setTab("posts")} style={[styles.switchTab, tab === "posts" && styles.switchTabActive]}>
              <Ionicons name="grid-outline" size={14} color={tab === "posts" ? DARK : MUTED} />
              <Text style={[styles.switchTabText, tab === "posts" && styles.switchTabTextActive]}>
                Posts · {profile.posts.length}
              </Text>
            </Pressable>
            <Pressable onPress={() => setTab("likes")} style={[styles.switchTab, tab === "likes" && styles.switchTabActive]}>
              <Ionicons name="heart-outline" size={14} color={tab === "likes" ? DARK : MUTED} />
              <Text style={[styles.switchTabText, tab === "likes" && styles.switchTabTextActive]}>Likes</Text>
            </Pressable>
          </View>
          <Animated.View key={tab} entering={FadeIn.duration(220)} exiting={FadeOut.duration(140)} layout={LinearTransition.duration(200)}>
            {tab === "posts" ? (
              <>
                <View style={[styles.posts, styles.gridTop]}>
                  {profile.posts.map((p, index) => (
                    <Pressable key={p.id} onPress={() => setViewerIndex(index)} style={[styles.postTile, { width: tileWidth, height: tileHeight }]}>
                      <Image
                        source={{ uri: p.poster || p.src }}
                        style={styles.post}
                      />
                      <PostMetricsOverlay post={p} />
                    </Pressable>
                  ))}
                  {profile.posts.length < 5 ? (
                    <Pressable style={[styles.addPost, { width: tileWidth, height: tileHeight }]} disabled={postUploading} onPress={() => void addPostFromGallery()}>
                      <View style={styles.addCircle}>{postUploading ? <ActivityIndicator size="small" color={DARK} /> : <Ionicons name="add" size={22} color={DARK} />}</View>
                      <Text style={styles.addText}>{postUploading ? "Uploading…" : "Add post"}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </>
            ) : likersLoading ? (
              <LoadingIndicator transparent />
            ) : likers.length === 0 ? (
              <View style={styles.likesEmpty}>
                <Ionicons name="heart-outline" size={30} color="#C9C5CF" />
                <Text style={styles.likesEmptyText}>No likes yet</Text>
              </View>
            ) : (
              <View style={[styles.posts, styles.gridTop]}>
                {likers.map((liker) => (
                  <Pressable
                    key={liker.profile.id}
                    style={[styles.likeCard, { width: tileWidth, height: tileHeight }]}
                    onPress={() => setLikesPreviewProfile(liker.profile)}
                  >
                    <Image source={{ uri: liker.photo }} style={styles.likeCardPhoto} />
                    <View style={styles.likeCardHeartBadge}>
                      <Ionicons name="heart" size={12} color="#FF3860" />
                    </View>
                    <LinearGradient colors={["transparent", "rgba(7,6,10,.88)"]} style={styles.likeCardGradient}>
                      <View style={styles.likeCardNameRow}>
                        <PresenceDot lastActiveAt={liker.profile.lastActiveAt} size={8} />
                        <Text style={styles.likeCardName} numberOfLines={1}>{liker.profile.name}, {liker.profile.age}</Text>
                      </View>
                      <View style={styles.likeCardMatch}>
                        <Ionicons name="heart" size={9} color="#FF6372" />
                        <Text style={styles.likeCardMatchText}>{liker.profile.vibeScore}% match</Text>
                      </View>
                      <Pressable
                        style={[styles.likeCardBtn, liker.likedBack && styles.likeCardBtnChat]}
                        disabled={likeBackBusyId === liker.profile.id}
                        onPress={() => (liker.likedBack ? void openChatWith(liker.profile.id) : void likeBack(liker.profile.id))}
                      >
                        {likeBackBusyId === liker.profile.id ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text style={styles.likeCardBtnText}>{liker.likedBack ? "Chat" : "Like back"}</Text>
                        )}
                      </Pressable>
                    </LinearGradient>
                  </Pressable>
                ))}
              </View>
            )}
          </Animated.View>
        </ScrollView>
        <PostViewerModal
          visible={viewerIndex !== null}
          posts={profile.posts}
          startIndex={viewerIndex ?? 0}
          onClose={() => setViewerIndex(null)}
          onPostRemoved={() => void refreshProfile(true)}
        />
        {!allFree ? <PlatinumModal visible={platinumOpen} close={() => setPlatinumOpen(false)} /> : null}
        {likesPreviewProfile ? (
          <ProfileFeedModal
            profile={likesPreviewProfile}
            visible
            profileLiked={
              likedBackIds.has(likesPreviewProfile.id) ||
              postLikers.find((p) => p.userId === likesPreviewProfile.id)?.likedBack === true
            }
            onClose={() => setLikesPreviewProfile(null)}
            onLikeProfile={() => void likeBack(likesPreviewProfile.id)}
          />
        ) : null}
        {rootNavigation ? (
          <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} navigation={rootNavigation} />
        ) : null}
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.top}>
          <BackToForYouButton variant="light" />
          <Text style={styles.title}>Profile</Text>
          <Pressable
            onPress={() => setSettingsOpen(true)}
          >
            <Ionicons name="settings-outline" size={23} />
          </Pressable>
        </View>
        <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
        <View style={styles.classicNameRow}>
          <Text style={styles.name}>{profile.displayName}</Text>
          {profile.verified ? (
            <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
          ) : (
            <Pressable
              style={styles.classicUnverified}
              onPress={() => navigation.getParent()?.navigate("VerifyIdentity", { profile })}
            >
              <Text style={styles.classicUnverifiedText}>Verify</Text>
            </Pressable>
          )}
        </View>
        {profile.bio?.trim() ? <Text style={styles.bio}>{profile.bio}</Text> : (
          <Pressable style={styles.bioMissing} onPress={() => navigation.getParent()?.navigate("EditProfile", { profile })}>
            <Ionicons name="create-outline" size={13} color="#7C3AED" />
            <Text style={styles.bioMissingText}>Add a bio so people can get to know you</Text>
          </Pressable>
        )}
        <View style={styles.posts}>
          {profile.posts.map((p, index) => (
            <Pressable key={p.id} onPress={() => setViewerIndex(index)} style={[styles.postTile, { width: tileWidth, height: tileHeight }]}>
              <Image
                source={{ uri: p.poster || p.src }}
                style={styles.post}
              />
              <PostMetricsOverlay post={p} />
            </Pressable>
          ))}
          {profile.posts.length < 5 ? (
            <Pressable style={[styles.addPost, { width: tileWidth, height: tileHeight }]} disabled={postUploading} onPress={() => void addPostFromGallery()}>
              <View style={styles.addCircle}>{postUploading ? <ActivityIndicator size="small" color="#7135E8" /> : <Ionicons name="images-outline" size={20} color="#7135E8" />}</View>
              <Text style={styles.addText}>{postUploading ? "Uploading…" : "Add post"}</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
      <PostViewerModal
        visible={viewerIndex !== null}
        posts={profile.posts}
        startIndex={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
        onPostRemoved={() => void refreshProfile(true)}
      />
      {rootNavigation ? (
        <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} navigation={rootNavigation} />
      ) : null}
    </SafeAreaView>
  );
}

function compactCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(value);
}

function PostMetricsOverlay({ post }: { post: ProfilePost }) {
  return (
    <LinearGradient colors={["transparent", "rgba(7,6,10,.82)"]} style={styles.metricsGradient}>
      <View style={styles.metric}>
        <Ionicons name="eye" size={12} color="#FFF" />
        <Text style={styles.metricNumber}>{compactCount(post.viewCount ?? 0)}</Text>
      </View>
      <View style={styles.metric}>
        <Ionicons name="play" size={11} color="#FFF" />
        <Text style={styles.metricNumber}>{compactCount(post.impressionCount ?? post.viewCount ?? 0)}</Text>
      </View>
    </LinearGradient>
  );
}
const styles = StyleSheet.create({
  webRoot: { flex: 1, backgroundColor: "#FAFAFA" },
  webTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 4,
    zIndex: 5,
  },
  webTopActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  settingsInline: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E4E0E6",
    alignItems: "center",
    justifyContent: "center",
  },
  upgradePressableInline: {},
  settings: {
    position: "absolute",
    zIndex: 3,
    right: 18,
    top: 13,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E4E0E6",
    alignItems: "center",
    justifyContent: "center",
  },
  upgradePressable: { position: "absolute", top: 14, left: 18, zIndex: 4 },
  upgrade: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E4E0E6",
  },
  upgradeText: { fontFamily: theme.typography.semibold, fontSize: 11, color: DARK },
  webContent: { paddingTop: 52, alignItems: "center", paddingBottom: 95 },
  avatarRing: {
    width: 118,
    height: 118,
    borderRadius: 59,
    padding: 3,
    borderWidth: 2,
    borderColor: DARK,
    backgroundColor: "#FFFFFF",
  },
  webAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "white",
  },
  verified: {
    position: "absolute",
    right: -11,
    bottom: 13,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#2686EA",
    borderWidth: 3,
    borderColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  unverified: {
    position: "absolute",
    right: -10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: DARK,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  unverifiedText: { fontFamily: theme.typography.semibold, fontSize: 10, color: "#FFFFFF" },
  webName: {
    marginTop: 18,
    fontFamily: theme.typography.bold,
    fontSize: 22,
    color: DARK,
    letterSpacing: -0.3,
  },
  webBio: {
    fontFamily: theme.typography.regular,
    color: "#5B5660",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    alignSelf: "center",
    width: "86%",
    marginTop: 8,
  },
  bioMissing: {
    marginTop: 10,
    maxWidth: "86%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E4E0E6",
  },
  bioMissingText: { flexShrink: 1, textAlign: "center", fontFamily: theme.typography.medium, fontSize: 12, color: MUTED },
  stats: {
    marginTop: 22,
    width: "88%",
    maxWidth: 340,
    minHeight: 72,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ECEAEE",
    flexDirection: "row",
    alignItems: "center",
  },
  stat: {
    flex: 1,
    alignItems: "center",
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: "#ECEAEE",
  },
  statN: { fontFamily: theme.typography.bold, fontSize: 20, color: DARK },
  statL: {
    fontFamily: theme.typography.medium,
    fontSize: 10,
    color: MUTED,
    letterSpacing: 0.4,
    marginTop: 2,
  },
  completionCard: {
    marginTop: 18,
    width: "90%",
    maxWidth: 340,
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ECEAEE",
  },
  completionHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  completionHeadText: { flex: 1 },
  completionEyebrow: {
    fontFamily: theme.typography.semibold,
    fontSize: 11,
    color: MUTED,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  completionTitle: { fontFamily: theme.typography.bold, fontSize: 16, color: DARK, marginTop: 4 },
  completionCopy: {
    fontFamily: theme.typography.regular,
    fontSize: 12,
    color: MUTED,
    marginTop: 4,
    lineHeight: 17,
  },
  completionBarTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "#ECEAEE",
    marginTop: 14,
    overflow: "hidden",
  },
  completionBarFill: {
    height: "100%",
    borderRadius: 3,
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 5,
    elevation: 2,
  },
  completionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 10,
  },
  completionRowLabel: { flex: 1, fontFamily: theme.typography.medium, fontSize: 13, color: DARK },
  completionCta: {
    backgroundColor: DARK,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  completionCtaText: { fontFamily: theme.typography.semibold, fontSize: 11, color: "#FFFFFF" },
  switcher: {
    marginTop: 22,
    flexDirection: "row",
    borderRadius: 20,
    padding: 3,
    backgroundColor: "#ECEBF0",
    gap: 4,
  },
  switchTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 17,
  },
  switchTabActive: { backgroundColor: "#FFFFFF" },
  switchTabText: { fontFamily: theme.typography.medium, fontSize: 12, color: MUTED },
  switchTabTextActive: { fontFamily: theme.typography.semibold, color: DARK },
  posts: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 14,
  },
  postTile: { borderRadius: 12, overflow: "hidden", backgroundColor: "#E9E6EC" },
  likesLoading: { marginTop: 30 },
  gridTop: { marginTop: 17 },
  likesEmpty: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 10 },
  likesEmptyText: { fontFamily: theme.typography.regular, fontSize: 13, color: "#8B8991" },
  likeCard: { borderRadius: 12, overflow: "hidden", backgroundColor: "#E9E6EC" },
  likeCardPhoto: { width: "100%", height: "100%", position: "absolute" },
  likeCardHeartBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(20,16,24,.55)",
  },
  likeCardGradient: { position: "absolute", left: 0, right: 0, bottom: 0, top: "42%", padding: 8, justifyContent: "flex-end" },
  likeCardNameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  likeCardName: { flex: 1, color: "white", fontFamily: theme.typography.bold, fontSize: 11.5 },
  likeCardMatch: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  likeCardMatchText: { color: "white", fontFamily: theme.typography.semibold, fontSize: 9 },
  likeCardBtn: {
    marginTop: 7,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF536E",
  },
  likeCardBtnChat: { backgroundColor: theme.colors.primary },
  likeCardBtnText: { fontFamily: theme.typography.bold, fontSize: 10.5, color: "white" },
  post: { width: "100%", height: "100%", borderRadius: 10, backgroundColor: "#DDD" },
  metricsGradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: 48, paddingHorizontal: 8, paddingBottom: 7, flexDirection: "row", alignItems: "flex-end", gap: 10 },
  metric: { flexDirection: "row", alignItems: "center", gap: 3 },
  metricNumber: { color: "#FFF", fontFamily: theme.typography.bold, fontSize: 9.5, textShadowColor: "rgba(0,0,0,.55)", textShadowRadius: 3 },
  addPost: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderStyle: "dashed", borderColor: "#D8D4DC", alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  addCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: "#D8D4DC", alignItems: "center", justifyContent: "center", backgroundColor: "#FAFAFA" },
  addText: { marginTop: 7, fontFamily: theme.typography.medium, fontSize: 11, color: MUTED },
  root: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  title: { flex: 1, fontFamily: theme.typography.bold, fontSize: 28, textAlign: "center" },
  avatar: { width: 100, height: 100, borderRadius: 50, alignSelf: "center" },
  name: {
    fontFamily: theme.typography.bold,
    fontSize: 22,
  },
  classicNameRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 4 },
  classicUnverified: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: theme.colors.primarySoft,
  },
  classicUnverifiedText: { fontFamily: theme.typography.bold, fontSize: 10.5, color: theme.colors.primary },
  bio: {
    width: "86%",
    alignSelf: "center",
    textAlign: "center",
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    marginBottom: 14,
    paddingHorizontal: 8,
  },
});
