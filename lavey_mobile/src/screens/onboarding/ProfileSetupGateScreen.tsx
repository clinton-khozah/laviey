import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { contentApi, profileApi } from "../../api/services";
import { theme } from "../../constants/theme";
import { hasCustomProfileAvatar } from "../../utils/discoverProfileReady";
import type { ProfilePost } from "../../types";

const POST_TEMPLATE_SLOTS = 4;

type SyncState = "idle" | "syncing" | "failed";

function StepBadge({ number, done }: { number: number; done: boolean }) {
  return (
    <View style={[styles.stepBadge, done && styles.stepBadgeDone]}>
      {done ? (
        <Ionicons name="checkmark" size={13} color="#FFFFFF" />
      ) : (
        <Text style={styles.stepBadgeText}>{number}</Text>
      )}
    </View>
  );
}

export function ProfileSetupGateScreen({
  onDone,
  verified = false,
  verificationPending = false,
  onVerify,
}: {
  onDone(): void;
  verified?: boolean;
  verificationPending?: boolean;
  onVerify?(): void;
}) {
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [avatarSync, setAvatarSync] = useState<SyncState>("idle");
  const [pendingPostIds, setPendingPostIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    void (async () => {
      try {
        const profile = await profileApi.me();
        setAvatarUrl(profile.avatarUrl);
        setPosts(profile.posts ?? []);
      } catch {
        // Non-fatal — the gate just shows both steps as pending.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hasAvatar = hasCustomProfileAvatar(avatarUrl);
  const hasPost = posts.length >= 1;
  const canFinish = hasAvatar && hasPost;
  const completedSteps = Number(hasAvatar) + Number(hasPost);

  const markPostPending = useCallback((id: string, pending: boolean) => {
    setPendingPostIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const uploadAvatarInBackground = useCallback((uri: string) => {
    setAvatarSync("syncing");
    void profileApi
      .uploadAvatar(uri)
      .then((result) => {
        if (result.avatarUrl) setAvatarUrl(result.avatarUrl);
        setAvatarSync("idle");
      })
      .catch(() => {
        setAvatarSync("failed");
      });
  }, []);

  const addPhoto = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo access to add your profile photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled) return;

    const uri = result.assets[0].uri;
    setAvatarUrl(uri);
    setAvatarSync("idle");
    uploadAvatarInBackground(uri);
  }, [uploadAvatarInBackground]);

  const uploadPostInBackground = useCallback(
    (tempId: string, uri: string) => {
      markPostPending(tempId, true);
      void contentApi
        .createPost(uri)
        .then((post) => {
          setPosts((prev) => prev.map((item) => (item.id === tempId ? post : item)));
        })
        .catch((e) => {
          setPosts((prev) => prev.filter((item) => item.id !== tempId));
          Alert.alert("Photo not added", e instanceof Error ? e.message : "Please try again.");
        })
        .finally(() => {
          markPostPending(tempId, false);
        });
    },
    [markPostPending],
  );

  const addPosts = useCallback(async () => {
    if (!hasAvatar) return;
    const remaining = POST_TEMPLATE_SLOTS - posts.length;
    if (remaining <= 0) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo access to add photos to your card.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.85,
    });
    if (result.canceled || result.assets.length === 0) return;

    for (const [index, asset] of result.assets.slice(0, remaining).entries()) {
      const tempId = `local-${Date.now()}-${index}`;
      const optimistic: ProfilePost = {
        id: tempId,
        type: "image",
        src: asset.uri,
      };
      setPosts((prev) => [...prev, optimistic]);
      uploadPostInBackground(tempId, asset.uri);
    }
  }, [hasAvatar, posts.length, uploadPostInBackground]);

  const statusNote = useMemo(() => {
    if (avatarSync === "syncing") return "Saving your profile photo in the background.";
    if (avatarSync === "failed") return "Could not save your profile photo. Tap the photo to try again.";
    if (pendingPostIds.size > 0) return "Saving your card photos in the background.";
    return null;
  }, [avatarSync, pendingPostIds.size]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color="#303034" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>Profile setup</Text>
        <Text style={styles.title}>Complete your profile</Text>
        <Text style={styles.subtitle}>
          Add a profile photo and at least one card photo before you continue to For You.
        </Text>

        <View style={styles.progressMeta}>
          <Text style={styles.progressLabel}>
            {completedSteps} of 2 required steps complete
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(completedSteps / 2) * 100}%` }]} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <StepBadge number={1} done={hasAvatar} />
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>Profile photo</Text>
              <Text style={styles.sectionHint}>A clear, well-lit photo of yourself.</Text>
            </View>
          </View>

          <Pressable
            style={[styles.avatarButton, hasAvatar && styles.avatarButtonDone]}
            onPress={() => void addPhoto()}
          >
            <View style={styles.avatarRing}>
              {hasAvatar ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person-outline" size={34} color="#8F8B93" />
                </View>
              )}
              {avatarSync === "syncing" ? (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                </View>
              ) : null}
            </View>
            <Text style={styles.avatarAction}>{hasAvatar ? "Change photo" : "Upload photo"}</Text>
          </Pressable>
        </View>

        <View style={[styles.section, !hasAvatar && styles.sectionDisabled]}>
          <View style={styles.sectionHeader}>
            <StepBadge number={2} done={hasPost} />
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>Card photos</Text>
              <Text style={styles.sectionHint}>
                Add at least one photo. Up to four photos on your card.
              </Text>
            </View>
          </View>

          <View style={styles.postGrid}>
            {Array.from({ length: POST_TEMPLATE_SLOTS }, (_, slot) => {
              const post = posts[slot];
              const pending = post ? pendingPostIds.has(post.id) : false;
              return (
                <Pressable
                  key={slot}
                  style={[styles.postSlot, post && styles.postSlotFilled]}
                  onPress={() => void addPosts()}
                  disabled={!hasAvatar || Boolean(post)}
                >
                  {post ? (
                    <>
                      <Image source={{ uri: post.src }} style={styles.postSlotImage} contentFit="cover" />
                      {pending ? (
                        <View style={styles.postSlotOverlay}>
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        </View>
                      ) : (
                        <View style={styles.postSlotCheck}>
                          <Ionicons name="checkmark" size={14} color="#303034" />
                        </View>
                      )}
                    </>
                  ) : (
                    <>
                      <Ionicons name="add" size={20} color={hasAvatar ? "#8F8B93" : "#C8C4CC"} />
                      <Text style={[styles.postSlotLabel, !hasAvatar && styles.postSlotLabelDisabled]}>
                        Add photo
                      </Text>
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {statusNote ? <Text style={styles.statusNote}>{statusNote}</Text> : null}

        <View style={[styles.section, styles.verifySection, !canFinish && styles.sectionDisabled]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.stepBadge, (verified || verificationPending) && styles.stepBadgeDone]}>
              {verified || verificationPending ? (
                <Ionicons name="checkmark" size={13} color="#FFFFFF" />
              ) : (
                <Ionicons name="shield-checkmark-outline" size={14} color="#5C5963" />
              )}
            </View>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>Verify identity</Text>
              <Text style={styles.sectionHint}>
                {verified
                  ? "Your profile is verified."
                  : verificationPending
                    ? "Verification submitted — we'll notify you when it's approved."
                    : "Recommended for trust on For You. We'll notify you when you're verified."}
              </Text>
            </View>
          </View>

          {!verified && !verificationPending && onVerify ? (
            <Pressable
              style={({ pressed }) => [
                styles.verifyButton,
                !canFinish && styles.verifyButtonDisabled,
                pressed && canFinish && styles.verifyButtonPressed,
              ]}
              disabled={!canFinish}
              onPress={onVerify}
            >
              <View style={[styles.verifyButtonInner, !canFinish && styles.verifyButtonInnerDisabled]}>
                <Ionicons name="shield-checkmark-outline" size={16} color={canFinish ? "#FFFFFF" : "#B4B0BA"} />
                <Text style={[styles.verifyButtonText, !canFinish && styles.verifyButtonTextDisabled]}>Start verification</Text>
              </View>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.continueButton,
            !canFinish && styles.continueButtonDisabled,
            pressed && canFinish && styles.continueButtonPressed,
          ]}
          disabled={!canFinish}
          onPress={onDone}
        >
          <Text style={[styles.continueText, !canFinish && styles.continueTextDisabled]}>
            Continue to For You
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  scroll: { flex: 1 },
  body: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  eyebrow: {
    fontFamily: theme.typography.semibold,
    fontSize: 11,
    color: "#8F8B93",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: theme.typography.bold,
    fontSize: 26,
    color: "#19171E",
    marginTop: 8,
  },
  subtitle: {
    fontFamily: theme.typography.regular,
    fontSize: 14,
    color: "#6B6771",
    lineHeight: 21,
    marginTop: 8,
  },
  progressMeta: { marginTop: 22, marginBottom: 28, gap: 8 },
  progressLabel: {
    fontFamily: theme.typography.medium,
    fontSize: 12,
    color: "#8F8B93",
  },
  progressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "#EBE8EE",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#303034",
  },
  section: {
    borderWidth: 1,
    borderColor: "#ECEAEC",
    borderRadius: 18,
    backgroundColor: "#FAFAFB",
    padding: 18,
    marginBottom: 14,
  },
  sectionDisabled: { opacity: 0.55 },
  sectionHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  sectionCopy: { flex: 1, gap: 3 },
  sectionTitle: { fontFamily: theme.typography.bold, fontSize: 16, color: "#19171E" },
  sectionHint: { fontFamily: theme.typography.regular, fontSize: 12.5, color: "#8F8B93", lineHeight: 18 },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#ECEAEC",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeDone: { backgroundColor: "#303034" },
  stepBadgeText: { fontFamily: theme.typography.bold, fontSize: 12, color: "#5C5963" },
  avatarButton: { alignItems: "center", gap: 12 },
  avatarButtonDone: {},
  avatarRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 1.5,
    borderColor: "#E1DFE4",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F2F5",
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(20, 18, 24, 0.42)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarAction: {
    fontFamily: theme.typography.semibold,
    fontSize: 13.5,
    color: "#303034",
    textDecorationLine: "underline",
  },
  postGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  postSlot: {
    width: "47%",
    aspectRatio: 3 / 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E1DFE4",
    borderStyle: "dashed",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    gap: 4,
  },
  postSlotFilled: { borderStyle: "solid", borderColor: "#D8D6DB" },
  postSlotImage: { width: "100%", height: "100%" },
  postSlotOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(20, 18, 24, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  postSlotCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECEAEC",
    alignItems: "center",
    justifyContent: "center",
  },
  postSlotLabel: { fontFamily: theme.typography.medium, fontSize: 11.5, color: "#8F8B93" },
  postSlotLabelDisabled: { color: "#C8C4CC" },
  statusNote: {
    fontFamily: theme.typography.medium,
    fontSize: 12,
    color: "#8F8B93",
    textAlign: "center",
    marginTop: 4,
  },
  verifySection: { marginBottom: 0 },
  verifyButton: { marginTop: 4, borderRadius: 12, overflow: "hidden" },
  verifyButtonPressed: { opacity: 0.92 },
  verifyButtonDisabled: { opacity: 0.7 },
  verifyButtonInner: {
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: "#303034",
  },
  verifyButtonInnerDisabled: { backgroundColor: "#ECEAEC" },
  verifyButtonText: { fontFamily: theme.typography.bold, fontSize: 14, color: "#FFFFFF" },
  verifyButtonTextDisabled: { color: "#B4B0BA" },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0EEF2",
    backgroundColor: "#FFFFFF",
  },
  continueButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: "#303034",
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonDisabled: { backgroundColor: "#ECEAEC" },
  continueButtonPressed: { opacity: 0.92 },
  continueText: { fontFamily: theme.typography.bold, fontSize: 15, color: "#FFFFFF" },
  continueTextDisabled: { color: "#B4B0BA" },
});
