import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { reportApi, settingsApi, type UserSettings } from "../../../api/services";
import { ThemeSongAutoPlayer } from "../../../components/common/ThemeSongAutoPlayer";
import { useTranslatedStrings } from "../../../hooks/useTranslatedStrings";
import type { Profile, ProfilePost } from "../../../types";
import { ProfilePageView } from "../../profile/components/ProfilePageView";
import { ProfileAvatarViewerModal } from "../../profile/components/ProfileAvatarViewerModal";
import { ProfileMoreDetailsSheet } from "../../profile/components/ProfileMoreDetailsSheet";
import { ProfilePostBrowseModal } from "../../profile/components/ProfilePostBrowseModal";
import { AnimatedReactionButton } from "./AnimatedReactionButton";
import { ProfileOptionsSheet, type ProfileOptionAction } from "./ProfileOptionsSheet";
import { HOME_SCREEN_STRINGS } from "../homeScreen.strings";
import { theme } from "../../../constants/theme";

const SLIDE_IN_MS = 320;
const SLIDE_OUT_MS = 280;
const SLIDE_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);

export function ProfileFeedModal({
  profile,
  visible,
  onClose,
  profileLiked = false,
  onLikeProfile,
  onCrushRequest,
  crushSent = false,
  hideCrush = false,
  onChat,
  onProfileRemoved,
}: {
  profile: Profile | null;
  visible: boolean;
  onClose(): void;
  profileLiked?: boolean;
  likedPostIds?: Set<string>;
  onLikeProfile?(): void;
  onLikePost?(post: ProfilePost): void;
  onCrushRequest?(): void;
  crushSent?: boolean;
  hideCrush?: boolean;
  onChat?(): void;
  onProfileRemoved?(profileId: string): void;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const [language, setLanguage] = useState<UserSettings["language"]>("en");
  const { t } = useTranslatedStrings(HOME_SCREEN_STRINGS, language);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [themeSongPlaying, setThemeSongPlaying] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [presented, setPresented] = useState(false);
  const profileSnapshot = useRef<Profile | null>(null);
  const translateX = useSharedValue(screenWidth);
  const closingRef = useRef(false);

  const finishDismiss = () => {
    closingRef.current = false;
    setPresented(false);
    profileSnapshot.current = null;
  };

  useEffect(() => {
    if (visible && profile) {
      profileSnapshot.current = profile;
      closingRef.current = false;
      setPresented(true);
      translateX.value = screenWidth;
      translateX.value = withTiming(0, { duration: SLIDE_IN_MS, easing: SLIDE_EASING });
      return;
    }

    if (!visible && presented && !closingRef.current) {
      closingRef.current = true;
      translateX.value = withTiming(
        screenWidth,
        { duration: SLIDE_OUT_MS, easing: SLIDE_EASING },
        (finished) => {
          if (finished) runOnJS(finishDismiss)();
        },
      );
    }
  }, [visible, profile, presented, screenWidth, translateX]);

  useEffect(() => {
    if (!visible) return;
    setViewerIndex(null);
    setAvatarOpen(false);
    setThemeSongPlaying(false);
    setOptionsOpen(false);
    setDetailsOpen(false);
    void settingsApi.get().then((value) => setLanguage(value.language)).catch(() => undefined);
  }, [visible, profile?.id]);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const dismissAnimated = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    translateX.value = withTiming(
      screenWidth,
      { duration: SLIDE_OUT_MS, easing: SLIDE_EASING },
      (finished) => {
        if (finished) {
          runOnJS(finishDismiss)();
          runOnJS(onClose)();
        }
      },
    );
  }, [onClose, screenWidth, translateX]);

  const swipeSubmodalsOpen = optionsOpen || detailsOpen || viewerIndex !== null || avatarOpen;

  const dismissSwipe = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!swipeSubmodalsOpen)
        .activeOffsetX([24, 9999])
        .failOffsetY([-18, 18])
        .onUpdate((event) => {
          translateX.value = Math.max(0, event.translationX);
        })
        .onEnd((event) => {
          const shouldDismiss =
            event.translationX > screenWidth * 0.22 || event.velocityX > 650;
          if (shouldDismiss && event.translationX > 0) {
            runOnJS(dismissAnimated)();
            return;
          }
          translateX.value = withTiming(0, {
            duration: 200,
            easing: SLIDE_EASING,
          });
        }),
    [dismissAnimated, screenWidth, swipeSubmodalsOpen, translateX],
  );

  const activeProfile = profile ?? profileSnapshot.current;

  const posts = activeProfile
    ? activeProfile.posts.filter((p) => Boolean(p.src || p.poster))
    : [];

  const handleOptionAction = useCallback(
    async (action: ProfileOptionAction, target: Profile, reason?: string) => {
      if (action === "clear-display" || action === "view-profile") return;
      try {
        if (action === "report") {
          await reportApi.submit({
            subjectUserId: target.id,
            contentType: "profile_photo",
            reason: reason || "Other",
          });
          Alert.alert("Report submitted", `Thanks for letting us know about ${target.name}.`);
        } else {
          await settingsApi.block(target.id);
          Alert.alert("Blocked", `${target.name} has been blocked.`);
          onProfileRemoved?.(target.id);
          onClose();
        }
      } catch (e) {
        Alert.alert(
          "Something went wrong",
          e instanceof Error ? e.message : "Please try again.",
        );
        throw e;
      }
    },
    [onClose, onProfileRemoved],
  );

  if (!presented || !activeProfile) return null;

  return (
    <Modal visible={presented} animationType="none" transparent onRequestClose={onClose}>
      <GestureDetector gesture={dismissSwipe}>
        <Animated.View style={[styles.panel, slideStyle]}>
        <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
          <View style={styles.topBar}>
            <Pressable style={styles.topBtn} onPress={onClose} hitSlop={10} accessibilityLabel="Close profile">
              <Ionicons name="chevron-back" size={26} color="#101018" />
            </Pressable>
            <Pressable
              style={styles.topBtn}
              onPress={() => setOptionsOpen(true)}
              hitSlop={10}
              accessibilityLabel="More options"
            >
              <Ionicons name="ellipsis-vertical" size={22} color="#101018" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <ProfilePageView
              profile={activeProfile}
              onAvatarPress={() => setAvatarOpen(true)}
              onPostPress={setViewerIndex}
              onThemeSongPress={
                activeProfile.themeSong ? () => setThemeSongPlaying((playing) => !playing) : undefined
              }
              themeSongPlaying={themeSongPlaying}
            />
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.footerSide} onPress={onChat} hitSlop={8}>
              <Ionicons name="chatbox-outline" size={26} color="#2A2A2A" />
              <Text style={styles.footerLabel}>{t("Chat now")}</Text>
            </Pressable>
            {!hideCrush && onCrushRequest ? (
              <View style={styles.footerSide}>
                <AnimatedReactionButton
                  kind="crushy"
                  active={crushSent}
                  onPress={onCrushRequest}
                  disabled={crushSent}
                />
                <Text style={styles.footerLabel}>{crushSent ? t("Sent") : "crushy"}</Text>
              </View>
            ) : (
              <View style={styles.footerSideSpacer} />
            )}
            <View style={styles.footerSide}>
              <AnimatedReactionButton
                kind="like"
                tone="plain"
                active={profileLiked}
                onPress={onLikeProfile ?? (() => {})}
                disabled={profileLiked}
              />
              <Text style={[styles.footerLabel, profileLiked && styles.footerLabelActive]}>
                {profileLiked ? t("Liked") : t("Like")}
              </Text>
            </View>
          </View>

          <ProfileAvatarViewerModal
            visible={avatarOpen}
            avatarUrl={activeProfile.avatar}
            onClose={() => setAvatarOpen(false)}
          />

          <ProfilePostBrowseModal
            visible={viewerIndex !== null}
            posts={posts}
            startIndex={viewerIndex ?? 0}
            onClose={() => setViewerIndex(null)}
          />

          <ProfileOptionsSheet
            visible={optionsOpen}
            profile={activeProfile}
            variant="profile-view"
            onClose={() => setOptionsOpen(false)}
            onViewDetails={() => setDetailsOpen(true)}
            onAction={handleOptionAction}
          />

          <ProfileMoreDetailsSheet
            visible={detailsOpen}
            profile={activeProfile}
            onClose={() => setDetailsOpen(false)}
          />

          <ThemeSongAutoPlayer
            track={themeSongPlaying && visible ? activeProfile.themeSong ?? null : null}
          />
        </SafeAreaView>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: "#FAFAFA",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: -4, height: 0 },
    elevation: 12,
  },
  root: { flex: 1, backgroundColor: "#FAFAFA" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 2,
    zIndex: 2,
  },
  topBtn: {
    minWidth: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  content: {
    paddingTop: 0,
    paddingBottom: 110,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 24,
    backgroundColor: "#FAFAFA",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E4E4E4",
  },
  footerSide: { alignItems: "center", gap: 6, minWidth: 58 },
  footerSideSpacer: { width: 58 },
  footerLabel: {
    fontFamily: theme.typography.medium,
    fontSize: 10,
    color: "#888888",
  },
  footerLabelActive: {
    color: "#FF3860",
  },
});
