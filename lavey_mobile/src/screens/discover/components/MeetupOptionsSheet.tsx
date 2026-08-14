import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { roomApi, reportApi } from "../../../api/services";
import { theme } from "../../../constants/theme";
import type { OnlineDate } from "../../../types";

const REPORT_REASONS = [
  "Inappropriate content",
  "Harassment or hate speech",
  "Scam or spam",
  "Underage concern",
  "Other",
] as const;

/** `#brightbyte.co.za` is the app's current FRONTEND_URL — matches the web app's buildMeetupJoinLink. */
function buildMeetupJoinLink(accessCode: string): string {
  return `https://brightbyte.co.za/join?code=${encodeURIComponent(accessCode.trim().toUpperCase())}`;
}

type Step = "menu" | "report" | "report-confirm" | "delete-confirm" | "privacy";

export function MeetupOptionsSheet({
  visible,
  meetup,
  onClose,
  onDeleted,
  onUpdated,
}: {
  visible: boolean;
  meetup: OnlineDate | null;
  onClose(): void;
  onDeleted(id: string): void;
  onUpdated(meetup: OnlineDate): void;
}) {
  const [step, setStep] = useState<Step>("menu");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingVisibility, setPendingVisibility] = useState<"public" | "private">("public");
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) {
      setStep("menu");
      setReason("");
      setBusy(false);
      setToast(null);
    } else if (meetup) {
      setPendingVisibility(meetup.visibility);
    }
  }, [visible, meetup]);

  if (!meetup) return null;
  const isHost = Boolean(meetup.isHostedByYou);
  const isPrivate = meetup.visibility === "private";

  const copy = async (label: string, value: string) => {
    try {
      // Lazily required: expo-clipboard's native module needs a fresh dev-client build to
      // be linked. Importing it eagerly at module scope crashes app boot when it isn't yet.
      const Clipboard = await import("expo-clipboard");
      await Clipboard.setStringAsync(value);
      setToast(`${label} copied`);
      setTimeout(onClose, 700);
    } catch {
      setToast("Copying isn't available yet — update the app to enable it.");
    }
  };

  const handleClose = () => {
    if (busy) return;
    onClose();
  };

  const deleteMeetup = async () => {
    setBusy(true);
    try {
      await roomApi.remove(meetup.id);
      onDeleted(meetup.id);
      onClose();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Could not delete date.");
    } finally {
      setBusy(false);
    }
  };

  const savePrivacy = async () => {
    if (pendingVisibility === meetup.visibility) {
      setStep("menu");
      return;
    }
    setBusy(true);
    try {
      const updated = await roomApi.update(meetup.id, { visibility: pendingVisibility });
      onUpdated(updated);
      setToast(pendingVisibility === "private" ? "Date is now private" : "Date is now public");
      setTimeout(onClose, 700);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Could not update privacy.");
    } finally {
      setBusy(false);
    }
  };

  const submitReport = async () => {
    if (!meetup.hostUserId) return;
    setBusy(true);
    try {
      await reportApi.submit({
        subjectUserId: meetup.hostUserId,
        contentType: "meetup",
        contentId: meetup.id,
        reason,
      });
      setToast("Report submitted");
      setTimeout(onClose, 700);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Could not submit report.");
    } finally {
      setBusy(false);
    }
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
                <Text style={styles.title}>Date options</Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {meetup.title}
                </Text>
              </View>

              <OptionRow
                icon="link-outline"
                title="Copy join link"
                subtitle="Share this date with anyone"
                onPress={() => void copy("Link", buildMeetupJoinLink(meetup.accessCode ?? ""))}
              />
              {isPrivate ? (
                <OptionRow
                  icon="key-outline"
                  title="Copy room code"
                  subtitle={meetup.accessCode ?? ""}
                  onPress={() => void copy("Code", meetup.accessCode ?? "")}
                />
              ) : null}
              {isHost ? (
                <OptionRow
                  icon="lock-closed-outline"
                  title="Change privacy"
                  subtitle={isPrivate ? "Currently private — invite only" : "Currently public — anyone can join"}
                  onPress={() => setStep("privacy")}
                />
              ) : null}
              {isHost ? (
                <OptionRow
                  icon="trash-outline"
                  title="Delete date"
                  subtitle="Removes it for everyone"
                  danger
                  onPress={() => setStep("delete-confirm")}
                />
              ) : (
                <OptionRow
                  icon="alert-circle-outline"
                  title="Report"
                  subtitle="Flag this date or its host"
                  warn
                  onPress={() => setStep("report")}
                />
              )}

              {toast ? <Text style={styles.toast}>{toast}</Text> : null}
              <Pressable style={styles.cancel} onPress={handleClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </>
          ) : null}

          {step === "report" ? (
            <>
              <Text style={styles.title}>Why are you reporting this date?</Text>
              <ScrollView style={styles.reasonList} showsVerticalScrollIndicator={false}>
                {REPORT_REASONS.map((item) => {
                  const active = reason === item;
                  return (
                    <Pressable key={item} style={[styles.reason, active && styles.reasonActive]} onPress={() => setReason(item)}>
                      <Ionicons name={active ? "radio-button-on" : "radio-button-off"} size={18} color={active ? "#FF5C7A" : "#9B98A1"} />
                      <Text style={[styles.reasonText, active && styles.reasonTextActive]}>{item}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <View style={styles.stepActions}>
                <Pressable style={styles.back} onPress={() => setStep("menu")}>
                  <Text style={styles.backText}>Back</Text>
                </Pressable>
                <Pressable style={[styles.primary, !reason && styles.primaryDisabled]} disabled={!reason} onPress={() => setStep("report-confirm")}>
                  <Text style={styles.primaryText}>Continue</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {step === "report-confirm" ? (
            <>
              <Text style={styles.title}>Submit this report?</Text>
              <Text style={styles.note}>Reason: {reason}</Text>
              <Text style={styles.note}>Our team will review this date.</Text>
              {toast ? <Text style={styles.toast}>{toast}</Text> : null}
              <View style={styles.stepActions}>
                <Pressable style={styles.back} disabled={busy} onPress={() => setStep("report")}>
                  <Text style={styles.backText}>Back</Text>
                </Pressable>
                <Pressable style={[styles.primary, styles.primaryWarn]} disabled={busy} onPress={() => void submitReport()}>
                  <Text style={styles.primaryText}>{busy ? "Submitting…" : "Yes, report"}</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {step === "delete-confirm" ? (
            <>
              <Text style={styles.title}>Delete this date?</Text>
              <Text style={styles.note}>This removes it for everyone, including anyone you invited.</Text>
              {toast ? <Text style={styles.toast}>{toast}</Text> : null}
              <View style={styles.stepActions}>
                <Pressable style={styles.back} disabled={busy} onPress={() => setStep("menu")}>
                  <Text style={styles.backText}>Back</Text>
                </Pressable>
                <Pressable style={[styles.primary, styles.primaryDanger]} disabled={busy} onPress={() => void deleteMeetup()}>
                  <Text style={styles.primaryText}>{busy ? "Deleting…" : "Yes, delete"}</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {step === "privacy" ? (
            <>
              <Text style={styles.title}>Date privacy</Text>
              <Text style={styles.note}>Public dates can host up to 10 people. Private dates are invite-only, for one match at a time.</Text>

              <Pressable
                style={[styles.privacyRow, pendingVisibility === "public" && styles.privacyRowOn]}
                onPress={() => setPendingVisibility("public")}
              >
                <Ionicons name={pendingVisibility === "public" ? "radio-button-on" : "radio-button-off"} size={18} color={pendingVisibility === "public" ? "#FF5C7A" : "#9B98A1"} />
                <View style={styles.privacyCopy}>
                  <Text style={styles.privacyTitle}>Public</Text>
                  <Text style={styles.privacySubtitle}>Anyone can join — up to 10 people</Text>
                </View>
              </Pressable>

              <Pressable
                style={[styles.privacyRow, pendingVisibility === "private" && styles.privacyRowOn]}
                onPress={() => setPendingVisibility("private")}
              >
                <Ionicons name={pendingVisibility === "private" ? "radio-button-on" : "radio-button-off"} size={18} color={pendingVisibility === "private" ? "#FF5C7A" : "#9B98A1"} />
                <View style={styles.privacyCopy}>
                  <Text style={styles.privacyTitle}>Private</Text>
                  <Text style={styles.privacySubtitle}>Invite only — just you and one match</Text>
                </View>
              </Pressable>

              {toast ? <Text style={styles.toast}>{toast}</Text> : null}
              <View style={styles.stepActions}>
                <Pressable style={styles.back} disabled={busy} onPress={() => setStep("menu")}>
                  <Text style={styles.backText}>Back</Text>
                </Pressable>
                <Pressable style={styles.primary} disabled={busy} onPress={() => void savePrivacy()}>
                  <Text style={styles.primaryText}>{busy ? "Saving…" : "Save"}</Text>
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
        <Text style={styles.optionSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
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
  toast: { fontFamily: theme.typography.medium, fontSize: 12, color: "#20C46A", textAlign: "center", marginTop: 6 },
  cancel: { marginTop: 8, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "#F2F1F3" },
  cancelText: { fontFamily: theme.typography.semibold, fontSize: 14, color: "#3E3A44" },
  reasonList: { maxHeight: 260, marginTop: 12 },
  reason: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, paddingHorizontal: 4 },
  reasonActive: { backgroundColor: "#FFF3F5", borderRadius: 12 },
  privacyRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 14, marginTop: 10 },
  privacyRowOn: { backgroundColor: "#FFF3F5" },
  privacyCopy: { flex: 1 },
  privacyTitle: { fontFamily: theme.typography.semibold, fontSize: 14, color: "#221F26" },
  privacySubtitle: { fontFamily: theme.typography.regular, fontSize: 11.5, color: "#918D96", marginTop: 1 },
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
