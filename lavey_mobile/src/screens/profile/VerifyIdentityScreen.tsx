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
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { profileApi } from "../../api/services";
import { theme } from "../../constants/theme";
import type { RootStackParamList } from "../../navigation/AppNavigator";

const DARK = "#101018";
const MUTED = "#8C8798";
const QUIZ_PROGRESS = ["#7c3aed", "#ff8a5c"] as const;
const IMAGE_MEDIA_TYPES: ImagePicker.MediaType[] = ["images"];

type Step = "intro" | "reference" | "live" | "review" | "submitting" | "already" | "pending";

function StepPill({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <View style={[styles.stepPill, active && styles.stepPillActive, done && styles.stepPillDone]}>
      {done ? (
        <Ionicons name="checkmark" size={11} color="#FFFFFF" />
      ) : (
        <Text style={[styles.stepPillText, active && styles.stepPillTextActive]}>{label}</Text>
      )}
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryBtn,
        disabled && styles.primaryBtnDisabled,
        pressed && !disabled && styles.btnPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color="#FFFFFF" /> : null}
          <Text style={styles.primaryBtnText}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function VerifyIdentityScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, "VerifyIdentity">) {
  const { profile } = route.params;
  const [step, setStep] = useState<Step>(profile.verified ? "already" : "intro");
  const [referenceUri, setReferenceUri] = useState<string | null>(profile.avatarUrl ?? null);
  const [liveUri, setLiveUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile.verified) return;
    profileApi
      .verificationStatus()
      .then((result) => {
        if (result.status === "pending") setStep("pending");
      })
      .catch(() => {});
  }, [profile.verified]);

  const showFlowProgress =
    step === "intro" || step === "reference" || step === "live" || step === "review" || step === "submitting";

  const stepState = useMemo(
    () => ({
      reference: step === "reference" || step === "live" || step === "review" || step === "submitting",
      live: step === "live" || step === "review" || step === "submitting",
      review: step === "review" || step === "submitting",
    }),
    [step],
  );

  const pickReference = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert("Permission needed", "Allow photo access to choose a reference photo.");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: IMAGE_MEDIA_TYPES,
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled) return;
    setReferenceUri(result.assets[0].uri);
  }, []);

  const captureLiveSelfie = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return Alert.alert("Camera permission needed", "Allow camera access to take a live selfie.");
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: IMAGE_MEDIA_TYPES,
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
      cameraType: ImagePicker.CameraType.front,
    });
    if (result.canceled) return;
    setLiveUri(result.assets[0].uri);
    setStep("review");
  }, []);

  const confirm = useCallback(async () => {
    if (!referenceUri || !liveUri) return;
    setStep("submitting");
    setSubmitting(true);
    try {
      await profileApi.submitVerification(referenceUri, liveUri);
      setStep("pending");
    } catch (e) {
      setStep("review");
      Alert.alert("Couldn't submit", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [referenceUri, liveUri]);

  const renderStatus = (icon: keyof typeof Ionicons.glyphMap, title: string, copy: string, done?: boolean) => (
    <View style={styles.statusWrap}>
      <View style={[styles.heroIcon, done && styles.heroIconDone]}>
        <Ionicons name={icon} size={32} color={done ? "#FFFFFF" : QUIZ_PROGRESS[0]} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.copy}>{copy}</Text>
      <PrimaryButton label="Done" onPress={() => navigation.goBack()} />
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={DARK} />
        </Pressable>
        <Text style={styles.headerTitle}>Identity verification</Text>
        <View style={styles.backBtn} />
      </View>

      {showFlowProgress ? (
        <View style={styles.progressBlock}>
          <View style={styles.stepRow}>
            <StepPill label="1" active={step === "reference"} done={stepState.reference} />
            <View style={[styles.stepLine, stepState.live && styles.stepLineDone]} />
            <StepPill label="2" active={step === "live"} done={stepState.live} />
            <View style={[styles.stepLine, stepState.review && styles.stepLineDone]} />
            <StepPill label="3" active={step === "review" || step === "submitting"} done={stepState.review} />
          </View>
          <Text style={styles.progressCaption}>
            {step === "intro"
              ? "About a minute · team review"
              : step === "reference"
                ? "Step 1 · Reference photo"
                : step === "live"
                  ? "Step 2 · Live selfie"
                  : step === "submitting"
                    ? "Submitting…"
                    : "Step 3 · Confirm & submit"}
          </Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {step === "already"
          ? renderStatus(
              "shield-checkmark-outline",
              "You're verified",
              "Your profile already shows the verified badge.",
              true,
            )
          : null}

        {step === "pending"
          ? renderStatus(
              "time-outline",
              "Verification submitted",
              "Our team is reviewing your photos. We'll notify you in the app when you're verified.",
            )
          : null}

        {step === "intro" ? (
          <View style={styles.panel}>
            <View style={styles.heroIcon}>
              <Ionicons name="shield-checkmark-outline" size={32} color={QUIZ_PROGRESS[0]} />
            </View>
            <Text style={styles.title}>Prove it's really you</Text>
            <Text style={styles.copy}>
              Upload a reference photo and take a live selfie. Our team will review your request and
              we'll notify you in the app when you're verified.
            </Text>
            <View style={styles.tipList}>
              {["Use good lighting and a clear face", "No filters or heavy sunglasses", "Take a fresh live selfie, not a gallery photo"].map(
                (tip) => (
                  <View key={tip} style={styles.tipRow}>
                    <Ionicons name="checkmark-circle" size={16} color={QUIZ_PROGRESS[0]} />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ),
              )}
            </View>
            <PrimaryButton label="Start verification" onPress={() => setStep("reference")} icon="arrow-forward" />
            <Pressable style={styles.linkBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.linkBtnText}>Not now</Text>
            </Pressable>
          </View>
        ) : null}

        {step === "reference" ? (
          <View style={styles.panel}>
            <Text style={styles.title}>Choose your reference photo</Text>
            <Text style={styles.copy}>Use your profile photo or pick a clear new one we can match against.</Text>
            <View style={styles.photoFrame}>
              {referenceUri ? (
                <Image source={{ uri: referenceUri }} style={styles.photoPreview} contentFit="cover" />
              ) : (
                <View style={styles.photoEmpty}>
                  <Ionicons name="person-outline" size={40} color={MUTED} />
                </View>
              )}
            </View>
            <Pressable style={styles.secondaryBtn} onPress={() => void pickReference()}>
              <Ionicons name="images-outline" size={17} color={QUIZ_PROGRESS[0]} />
              <Text style={styles.secondaryBtnText}>Choose a different photo</Text>
            </Pressable>
            <PrimaryButton label="Continue" disabled={!referenceUri} onPress={() => setStep("live")} />
            <Pressable style={styles.linkBtn} onPress={() => setStep("intro")}>
              <Text style={styles.linkBtnText}>Back</Text>
            </Pressable>
          </View>
        ) : null}

        {step === "live" ? (
          <View style={styles.panel}>
            <Text style={styles.title}>Take a live selfie</Text>
            <Text style={styles.copy}>Face the front camera directly for your live selfie.</Text>
            <View style={styles.cameraHint}>
              <Ionicons name="camera-outline" size={28} color={QUIZ_PROGRESS[0]} />
              <Text style={styles.cameraHintText}>Selfie opens in your camera — not from your gallery.</Text>
            </View>
            <PrimaryButton label="Open camera" onPress={() => void captureLiveSelfie()} icon="camera-outline" />
            <Pressable style={styles.linkBtn} onPress={() => setStep("reference")}>
              <Text style={styles.linkBtnText}>Back</Text>
            </Pressable>
          </View>
        ) : null}

        {step === "submitting" ? (
          <View style={styles.panel}>
            <View style={styles.matchingIconWrap}>
              <ActivityIndicator size="large" color={QUIZ_PROGRESS[0]} />
            </View>
            <Text style={styles.title}>Submitting your request</Text>
            <Text style={styles.copy}>
              Sending your photos to our team for review.
            </Text>
          </View>
        ) : null}

        {step === "review" ? (
          <View style={styles.panel}>
            <Text style={styles.title}>Confirm it's you</Text>
            <Text style={styles.copy}>Make sure both photos clearly show the same person.</Text>
            <View style={styles.compareRow}>
              <View style={styles.compareCol}>
                <Text style={styles.compareLabel}>Reference</Text>
                {referenceUri ? <Image source={{ uri: referenceUri }} style={styles.comparePhoto} contentFit="cover" /> : null}
              </View>
              <View style={styles.compareDivider}>
                <Ionicons name="swap-horizontal" size={18} color={MUTED} />
              </View>
              <View style={styles.compareCol}>
                <Text style={styles.compareLabel}>Live selfie</Text>
                {liveUri ? <Image source={{ uri: liveUri }} style={styles.comparePhoto} contentFit="cover" /> : null}
              </View>
            </View>
            <PrimaryButton label="Submit for review" loading={submitting} onPress={() => void confirm()} icon="shield-checkmark-outline" />
            <Pressable style={styles.linkBtn} disabled={submitting} onPress={() => setStep("live")}>
              <Text style={styles.linkBtnText}>Retake selfie</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: theme.typography.bold, fontSize: 15, color: DARK },
  progressBlock: { paddingHorizontal: 24, paddingBottom: 8, gap: 10 },
  stepRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  stepPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ECEAEE",
    alignItems: "center",
    justifyContent: "center",
  },
  stepPillActive: { backgroundColor: "#EDE9FE" },
  stepPillDone: { backgroundColor: QUIZ_PROGRESS[0] },
  stepPillText: { fontFamily: theme.typography.bold, fontSize: 11, color: MUTED },
  stepPillTextActive: { color: QUIZ_PROGRESS[0] },
  stepLine: { width: 28, height: 2, borderRadius: 1, backgroundColor: "#ECEAEE" },
  stepLineDone: { backgroundColor: QUIZ_PROGRESS[0] },
  progressCaption: {
    fontFamily: theme.typography.medium,
    fontSize: 11,
    color: MUTED,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  scrollBody: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },
  panel: { flex: 1, alignItems: "center", paddingTop: 12 },
  statusWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 40 },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F3EEFF",
    borderWidth: 1,
    borderColor: "#E9DFFC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  heroIconDone: { backgroundColor: QUIZ_PROGRESS[0], borderColor: QUIZ_PROGRESS[0] },
  matchingIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F3EEFF",
    borderWidth: 1,
    borderColor: "#E9DFFC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    marginTop: 12,
  },
  title: { fontFamily: theme.typography.bold, fontSize: 22, color: DARK, textAlign: "center" },
  copy: {
    fontFamily: theme.typography.regular,
    fontSize: 14,
    color: MUTED,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 21,
    maxWidth: 320,
  },
  tipList: { width: "100%", maxWidth: 320, marginTop: 22, gap: 10 },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  tipText: { flex: 1, fontFamily: theme.typography.medium, fontSize: 13, color: DARK },
  photoFrame: {
    width: 156,
    height: 156,
    borderRadius: 78,
    marginTop: 24,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    backgroundColor: "#FFFFFF",
    shadowColor: "#7c3aed",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    overflow: "hidden",
  },
  photoPreview: { width: "100%", height: "100%" },
  photoEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F2F5",
  },
  cameraHint: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECEAEE",
    alignItems: "center",
    gap: 8,
    maxWidth: 300,
  },
  cameraHintText: {
    fontFamily: theme.typography.regular,
    fontSize: 12.5,
    color: MUTED,
    textAlign: "center",
    lineHeight: 18,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
    minHeight: 50,
    minWidth: 220,
    borderRadius: 14,
    paddingHorizontal: 24,
    backgroundColor: DARK,
  },
  primaryBtnDisabled: { backgroundColor: "#D8D6DB", opacity: 1 },
  primaryBtnText: { fontFamily: theme.typography.bold, fontSize: 15, color: "#FFFFFF" },
  btnPressed: { opacity: 0.92 },
  secondaryBtn: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 16 },
  secondaryBtnText: { fontFamily: theme.typography.semibold, fontSize: 13, color: QUIZ_PROGRESS[0] },
  linkBtn: { marginTop: 14, padding: 8 },
  linkBtnText: { fontFamily: theme.typography.medium, fontSize: 13, color: MUTED },
  compareRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 24 },
  compareCol: { alignItems: "center" },
  compareDivider: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECEAEE",
    alignItems: "center",
    justifyContent: "center",
  },
  compareLabel: { fontFamily: theme.typography.semibold, fontSize: 11, color: MUTED, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.3 },
  comparePhoto: { width: 128, height: 128, borderRadius: 18, borderWidth: 1, borderColor: "#ECEAEE" },
  modalBack: {
    flex: 1,
    backgroundColor: "rgba(15, 12, 20, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",
  },
});
