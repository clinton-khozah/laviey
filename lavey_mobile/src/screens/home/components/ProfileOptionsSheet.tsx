import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../../constants/theme";
import type { Profile } from "../../../types";

export type ProfileOptionAction = "clear-display" | "view-profile" | "report" | "block";

const REPORT_REASONS = [
  "Inappropriate photos",
  "Inappropriate bio or profile",
  "Harassment or hate speech",
  "Fake profile or scam",
  "Spam or advertising",
  "Underage concern",
  "Other",
] as const;

type Step = "menu" | "report" | "report-confirm" | "block-confirm";

export function ProfileOptionsSheet({
  visible,
  profile,
  onClose,
  onAction,
  variant = "for-you",
  onViewDetails,
}: {
  visible: boolean;
  profile: Profile | null;
  onClose(): void;
  onAction(
    action: ProfileOptionAction,
    profile: Profile,
    reason?: string,
  ): Promise<void> | void;
  variant?: "for-you" | "profile-view";
  onViewDetails?(): void;
}) {
  const [step, setStep] = useState<Step>("menu");
  const [reason, setReason] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) {
      setStep("menu");
      setReason("");
      setBusy(false);
    }
  }, [visible]);

  if (!profile) return null;

  const run = async (action: ProfileOptionAction, meta?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await onAction(action, profile, meta);
      onClose();
    } catch {
      // Keep the sheet open on failure so the user can retry.
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    if (busy) return;
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) + 8 }]}>
          <View style={styles.handle} />

          {step === "menu" ? (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Options</Text>
                <Text style={styles.subtitle}>{profile.name}</Text>
              </View>

              {variant === "profile-view" ? (
                <OptionRow
                  icon="information-circle-outline"
                  title="View more details"
                  subtitle="Gender, interests, work, and more"
                  onPress={() => {
                    onClose();
                    onViewDetails?.();
                  }}
                />
              ) : (
                <>
                  <OptionRow
                    icon="contract-outline"
                    title="Clear display"
                    subtitle="Show only the photo, hide everything else"
                    onPress={() => void run("clear-display")}
                  />
                  <OptionRow
                    icon="person-circle-outline"
                    title="View profile"
                    subtitle="See photos, bio, and vibes"
                    onPress={() => void run("view-profile")}
                  />
                </>
              )}
              <OptionRow
                icon="alert-circle-outline"
                title="Report"
                subtitle="Flag inappropriate photos, bio, or behavior"
                warn
                onPress={() => setStep("report")}
              />
              <OptionRow
                icon="remove-circle-outline"
                title="Block"
                subtitle="Hide from For You and stop them contacting you"
                danger
                onPress={() => setStep("block-confirm")}
              />

              <Pressable style={styles.cancel} onPress={handleClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </>
          ) : null}

          {step === "report" ? (
            <>
              <Text style={styles.title}>Why are you reporting {profile.name}?</Text>
              <ScrollView style={styles.reasonList} showsVerticalScrollIndicator={false}>
                {REPORT_REASONS.map((item) => {
                  const active = reason === item;
                  return (
                    <Pressable
                      key={item}
                      style={[styles.reason, active && styles.reasonActive]}
                      onPress={() => setReason(item)}
                    >
                      <Ionicons
                        name={active ? "radio-button-on" : "radio-button-off"}
                        size={18}
                        color={active ? "#FF5C7A" : "#9B98A1"}
                      />
                      <Text style={[styles.reasonText, active && styles.reasonTextActive]}>
                        {item}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <View style={styles.stepActions}>
                <Pressable style={styles.back} onPress={() => setStep("menu")}>
                  <Text style={styles.backText}>Back</Text>
                </Pressable>
                <Pressable
                  style={[styles.primary, !reason && styles.primaryDisabled]}
                  disabled={!reason}
                  onPress={() => setStep("report-confirm")}
                >
                  <Text style={styles.primaryText}>Continue</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {step === "report-confirm" ? (
            <>
              <Text style={styles.title}>Report {profile.name}?</Text>
              <Text style={styles.note}>Reason: {reason}</Text>
              <Text style={styles.note}>
                Our team will review this report. This profile will be hidden from
                your For You feed.
              </Text>
              <View style={styles.stepActions}>
                <Pressable style={styles.back} disabled={busy} onPress={() => setStep("report")}>
                  <Text style={styles.backText}>Back</Text>
                </Pressable>
                <Pressable
                  style={[styles.primary, styles.primaryWarn]}
                  disabled={busy}
                  onPress={() => void run("report", reason)}
                >
                  <Text style={styles.primaryText}>{busy ? "Submitting…" : "Yes, report"}</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {step === "block-confirm" ? (
            <>
              <Text style={styles.title}>Block {profile.name}?</Text>
              <Text style={styles.note}>
                They won&apos;t appear on your For You feed and can&apos;t message
                you. You can unblock them later in Settings.
              </Text>
              <View style={styles.stepActions}>
                <Pressable style={styles.back} disabled={busy} onPress={() => setStep("menu")}>
                  <Text style={styles.backText}>Back</Text>
                </Pressable>
                <Pressable
                  style={[styles.primary, styles.primaryDanger]}
                  disabled={busy}
                  onPress={() => void run("block")}
                >
                  <Text style={styles.primaryText}>{busy ? "Blocking…" : "Yes, block"}</Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function OptionRow({
  icon,
  title,
  subtitle,
  onPress,
  warn,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress(): void;
  warn?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.option, pressed && styles.optionPressed]} onPress={onPress}>
      <View style={[styles.optionIcon, warn && styles.optionIconWarn, danger && styles.optionIconDanger]}>
        <Ionicons name={icon} size={20} color={danger ? "#FF4B4B" : warn ? "#DD8B00" : "#4B4750"} />
      </View>
      <View style={styles.optionCopy}>
        <Text style={[styles.optionTitle, danger && styles.optionTitleDanger]}>{title}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,.48)" },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 19,
    paddingTop: 10,
    paddingBottom: 28,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E2E0E4", alignSelf: "center", marginBottom: 10 },
  header: { marginBottom: 6 },
  title: { fontFamily: theme.typography.bold, fontSize: 17, color: "#19171E" },
  subtitle: { fontFamily: theme.typography.medium, fontSize: 12, color: "#918D96", marginTop: 2 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  optionPressed: { opacity: 0.7 },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F1F3",
  },
  optionIconWarn: { backgroundColor: "#FFF3E0" },
  optionIconDanger: { backgroundColor: "#FFEBEB" },
  optionCopy: { flex: 1 },
  optionTitle: { fontFamily: theme.typography.semibold, fontSize: 14.5, color: "#221F26" },
  optionTitleDanger: { color: "#E23B3B" },
  optionSubtitle: { fontFamily: theme.typography.regular, fontSize: 11.5, color: "#918D96", marginTop: 1 },
  cancel: { marginTop: 8, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "#F2F1F3" },
  cancelText: { fontFamily: theme.typography.semibold, fontSize: 14, color: "#3E3A44" },
  reasonList: { maxHeight: 300, marginTop: 12 },
  reason: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, paddingHorizontal: 4 },
  reasonActive: { backgroundColor: "#FFF3F5", borderRadius: 12 },
  reasonText: { fontFamily: theme.typography.medium, fontSize: 13.5, color: "#3E3A44" },
  reasonTextActive: { fontFamily: theme.typography.semibold, color: "#19171E" },
  note: { fontFamily: theme.typography.regular, fontSize: 13, color: "#6B6771", marginTop: 10, lineHeight: 19 },
  stepActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  back: { flex: 1, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "#F2F1F3" },
  backText: { fontFamily: theme.typography.semibold, fontSize: 14, color: "#3E3A44" },
  primary: { flex: 1, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "#FF5C7A" },
  primaryDisabled: { opacity: 0.45 },
  primaryWarn: { backgroundColor: "#E08A00" },
  primaryDanger: { backgroundColor: "#E23B3B" },
  primaryText: { fontFamily: theme.typography.bold, fontSize: 14, color: "white" },
});
