import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import type { NavigationProp } from "@react-navigation/native";
import { profileApi, settingsApi, translationApi, type AppLanguageOption, type UserSettings } from "../../api/services";
import { syncUserLocation } from "../../utils/syncUserLocation";
import { registerPushToken } from "../../hooks/usePushRegistration";
import { useAuth } from "../../hooks/useAuth";
import { theme } from "../../constants/theme";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import { PlatinumModal } from "../../components/subscription/PlatinumModal";
import type { UserProfile } from "../../types";
import { useAccessMode } from "../../context/AccessModeContext";
import { useTranslatedStrings } from "../../hooks/useTranslatedStrings";
import { LogoutConfirmModal } from "../../components/common/LogoutConfirmModal";
import { SETTINGS_SCREEN_STRINGS } from "./settingsScreen.strings";

const DARK = "#101018";
const MUTED = "#8C8798";

const FALLBACK_LANGUAGES: AppLanguageOption[] = [{ code: "en", label: "English" }];

export function SettingsPanel({
  onClose,
  navigation,
}: {
  onClose(): void;
  navigation: NavigationProp<RootStackParamList>;
}) {
  const { logout } = useAuth();
  const { allFree } = useAccessMode();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [platinumOpen, setPlatinumOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [languages, setLanguages] = useState<AppLanguageOption[]>(FALLBACK_LANGUAGES);
  const { t } = useTranslatedStrings(SETTINGS_SCREEN_STRINGS, settings?.language ?? "en");

  useEffect(() => {
    void profileApi.me().then(setProfile).catch(() => undefined);
    void settingsApi.get().then(setSettings).catch((error) => Alert.alert("Couldn't load settings", error instanceof Error ? error.message : "Please try again."));
    void translationApi.languages().then(setLanguages).catch(() => undefined);
  }, []);

  const patchSetting = async (patch: Partial<UserSettings>) => {
    if (!settings || saving) return;
    const previous = settings;
    setSettings({ ...settings, ...patch });
    setSaving(true);
    try {
      setSettings(await settingsApi.update(patch));
    } catch (error) {
      setSettings(previous);
      Alert.alert("Couldn't save preference", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const togglePushNotifications = async () => {
    if (!settings || saving) return;
    const enabling = !settings.pushNotificationsEnabled;

    if (enabling) {
      if (!Device.isDevice) {
        Alert.alert("Physical device required", "Push notifications work on a real phone, not the simulator.");
        return;
      }
      const permission = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      if (permission.status !== "granted") {
        Alert.alert(
          "Notifications blocked",
          "Allow notifications in your device settings to receive messages and matches instantly.",
        );
        return;
      }
      try {
        await registerPushToken();
      } catch {
        Alert.alert("Couldn't register", "We saved your preference, but couldn't register this device yet. Try again after reopening the app.");
      }
    }

    void patchSetting({ pushNotificationsEnabled: enabling });
  };

  const syncLocation = async () => {
    const updated = await syncUserLocation({ requestPermission: true });
    if (!updated) {
      Alert.alert("Location permission needed", "Enable location to see accurate nearby profiles.");
      return;
    }
    Alert.alert("Location updated", "Nearby matches will now use your current area.");
  };

  const changePassword = async () => {
    if (!currentPassword || newPassword.length < 8) return Alert.alert("Check your password", "Your new password must be at least 8 characters.");
    setChangingPassword(true);
    try {
      await settingsApi.changePassword(currentPassword, newPassword);
      setPasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      Alert.alert("Password updated", "Your new password is ready to use.");
    } catch (error) {
      Alert.alert("Couldn't change password", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setChangingPassword(false);
    }
  };

  const Row = ({
    icon,
    label,
    description,
    onPress,
    value,
    danger,
    disabled,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    description?: string;
    onPress(): void;
    value?: string;
    danger?: boolean;
    disabled?: boolean;
  }) => (
    <Pressable style={[styles.row, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <View style={[styles.icon, danger && styles.dangerIcon]}>
        <Ionicons name={icon} size={18} color={danger ? theme.colors.danger : DARK} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowLabel, danger && styles.danger]}>{t(label)}</Text>
        {description ? <Text style={styles.rowDescription}>{t(description)}</Text> : null}
      </View>
      {value ? (
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      ) : (
        <Ionicons name="chevron-forward" size={16} color="#B0ACB8" />
      )}
    </Pressable>
  );

  const Toggle = ({
    label,
    description,
    value,
    onChange,
  }: {
    label: string;
    description: string;
    value: boolean;
    onChange(): void;
  }) => (
    <View style={styles.toggleRow}>
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{t(label)}</Text>
        <Text style={styles.rowDescription}>{t(description)}</Text>
      </View>
      {saving ? <ActivityIndicator size="small" color={DARK} /> : <Switch value={value} onValueChange={onChange} trackColor={{ false: "#D7D4DC", true: DARK }} thumbColor="#FFFFFF" />}
    </View>
  );

  const languageLabel = languages.find((item) => item.code === settings?.language)?.label ?? "English";
  const selectedBetaLanguage = languages.find((item) => item.code === settings?.language && item.qualityTier === "beta");

  return (
    <>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={onClose} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={DARK} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("Settings")}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Section title={t("PROFILE")}>
          <Row icon="create-outline" label="Edit profile" description="Name, bio, education, work & interests" onPress={() => profile && navigation.navigate("EditProfile", { profile })} disabled={!profile} />
          <Row icon="shield-checkmark-outline" label={profile?.verified ? "Identity verified" : "Verify my identity"} description="Build trust with a verified badge" onPress={() => profile && navigation.navigate("VerifyIdentity", { profile })} disabled={!profile} />
          <Row icon="location-outline" label="Update my location" description="Improve nearby recommendations" onPress={() => void syncLocation().catch((error) => Alert.alert("Could not update location", error.message))} />
          <Row icon="musical-notes-outline" label="Theme song" description="Choose a song for your profile" onPress={() => navigation.navigate("SpotifyThemeSong")} />
        </Section>

        <Section title={t("PREFERENCES")}>
          <Row icon="language-outline" label="App language" description={selectedBetaLanguage ? "AI-translated (beta) — may be imperfect" : "Language used across Lavey"} value={languageLabel} onPress={() => setLanguageOpen(true)} />
          <Toggle label="Push notifications" description="Instant alerts for messages, matches and activity" value={settings?.pushNotificationsEnabled ?? true} onChange={() => void togglePushNotifications()} />
          <Toggle label="Like feedback sound" description="Play a soft chime when you like someone" value={settings?.likeFeedbackSoundEnabled ?? true} onChange={() => void patchSetting({ likeFeedbackSoundEnabled: !settings?.likeFeedbackSoundEnabled })} />
        </Section>

        <Section title={t("ACCOUNT")}>
          <View style={styles.emailField}>
            <Text style={styles.fieldLabel}>{t("Email")}</Text>
            <Text style={styles.email}>{settings?.email ?? profile?.email ?? "Loading…"}</Text>
          </View>
          {settings?.canChangePassword ? (
            <Row icon="key-outline" label="Change password" description="Update your account password" onPress={() => setPasswordOpen(true)} />
          ) : (
            <View style={styles.oauthHint}>
              <Ionicons name="logo-google" size={18} color={DARK} />
              <Text style={styles.oauthText}>{t("You signed in with Google. Manage your password in your Google account.")}</Text>
            </View>
          )}
          {!allFree ? <Row icon="diamond-outline" label="Upgrade to Platinum" description="More ways to connect and stand out" onPress={() => setPlatinumOpen(true)} /> : null}
          <Row icon="lock-closed-outline" label="Safety, privacy & take a break" description="Visibility, contacts, blocks and your data" onPress={() => navigation.navigate("SafetyPrivacy")} />
        </Section>

        <Section title={t("HELP & TRUST")}>
          <Row icon="chatbubble-ellipses-outline" label="Contact support" description="Chat with Lavey AI or talk to our team" onPress={() => navigation.navigate("Support")} />
          <Row icon="people-outline" label="Community guidelines" description="How we keep Lavey respectful and safe" onPress={() => navigation.navigate("Legal", { variant: "guidelines" })} />
          <Row icon="document-text-outline" label="Terms of service" description="Your rights, privacy and how Lavey works" onPress={() => navigation.navigate("Legal", { variant: "terms" })} />
        </Section>

        <View style={styles.card}>
          <Row icon="log-out-outline" label="Log out" description="Sign out of this device" danger onPress={() => setLogoutOpen(true)} />
        </View>
        <Text style={styles.version}>Lavey · 1.0.0</Text>
      </ScrollView>

      <Modal visible={languageOpen} transparent animationType="fade" onRequestClose={() => setLanguageOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setLanguageOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <Text style={styles.modalTitle}>{t("Choose your language")}</Text>
            <Text style={styles.modalCopy}>{t("Select the language you want to use in Lavey.")}</Text>
            <View style={styles.languageGrid}>
              {languages.map((item) => (
                <Pressable key={item.code} style={[styles.language, settings?.language === item.code && styles.languageActive]} onPress={() => { void patchSetting({ language: item.code }); setLanguageOpen(false); }}>
                  <Text style={[styles.languageText, settings?.language === item.code && styles.languageTextActive]}>
                    {item.label}
                    {item.qualityTier === "beta" ? " (beta)" : ""}
                  </Text>
                  {settings?.language === item.code ? <Ionicons name="checkmark" size={16} color={DARK} /> : null}
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={passwordOpen} transparent animationType="fade" onRequestClose={() => setPasswordOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("Change your password")}</Text>
            <Text style={styles.modalCopy}>{t("Enter your current password, then choose a new one.")}</Text>
            <TextInput secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} placeholder={t("Current password")} placeholderTextColor="#AAA6AE" style={styles.input} />
            <TextInput secureTextEntry value={newPassword} onChangeText={setNewPassword} placeholder={t("New password (8+ characters)")} placeholderTextColor="#AAA6AE" style={styles.input} />
            <Pressable style={styles.primaryButton} disabled={changingPassword} onPress={() => void changePassword()}>
              {changingPassword ? <ActivityIndicator color="white" /> : <Text style={styles.primaryButtonText}>{t("Update password")}</Text>}
            </Pressable>
            <Pressable style={styles.cancelButton} onPress={() => setPasswordOpen(false)}>
              <Text style={styles.cancelText}>{t("Cancel")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <LogoutConfirmModal
        visible={logoutOpen}
        loading={loggingOut}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => {
          setLoggingOut(true);
          void logout().then(() => {
            setLogoutOpen(false);
            setLoggingOut(false);
            onClose();
            navigation.popToTop();
          });
        }}
      />

      {!allFree ? <PlatinumModal visible={platinumOpen} close={() => setPlatinumOpen(false)} /> : null}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#ECEAEE",
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: theme.typography.bold, fontSize: 17, color: DARK },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 4 },
  section: { marginBottom: 14 },
  heading: {
    fontFamily: theme.typography.semibold,
    fontSize: 11,
    letterSpacing: 0.35,
    color: MUTED,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ECEAEE",
  },
  row: {
    minHeight: 58,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#F0EEF2",
  },
  disabled: { opacity: 0.5 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#F3F2F5" },
  dangerIcon: { backgroundColor: "#FFF0F0" },
  rowCopy: { flex: 1 },
  rowLabel: { fontFamily: theme.typography.semibold, fontSize: 14, color: DARK },
  rowDescription: { marginTop: 2, fontFamily: theme.typography.regular, fontSize: 12, lineHeight: 16, color: MUTED },
  rowValue: { maxWidth: 96, fontFamily: theme.typography.medium, fontSize: 12, color: MUTED, textAlign: "right" },
  danger: { color: theme.colors.danger },
  toggleRow: {
    minHeight: 58,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#F0EEF2",
  },
  emailField: { marginVertical: 8, marginHorizontal: 14, padding: 12, borderRadius: 12, backgroundColor: "#FAFAFC", borderWidth: StyleSheet.hairlineWidth, borderColor: "#ECEAEE" },
  fieldLabel: { fontFamily: theme.typography.semibold, fontSize: 10, letterSpacing: 0.3, color: MUTED, textTransform: "uppercase" },
  email: { marginTop: 4, fontFamily: theme.typography.medium, fontSize: 14, color: DARK },
  oauthHint: { marginVertical: 8, marginHorizontal: 14, padding: 12, flexDirection: "row", gap: 10, alignItems: "center", borderRadius: 12, backgroundColor: "#FAFAFC", borderWidth: StyleSheet.hairlineWidth, borderColor: "#ECEAEE" },
  oauthText: { flex: 1, fontFamily: theme.typography.regular, fontSize: 12, lineHeight: 17, color: MUTED },
  version: { textAlign: "center", fontFamily: theme.typography.regular, fontSize: 11, color: "#B0ACB8", marginTop: 8 },
  modalBackdrop: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(16,16,24,.52)" },
  modalCard: { borderRadius: 18, padding: 20, backgroundColor: "#FFFFFF", borderWidth: StyleSheet.hairlineWidth, borderColor: "#E4E0E6" },
  modalTitle: { textAlign: "center", fontFamily: theme.typography.bold, fontSize: 18, color: DARK },
  modalCopy: { textAlign: "center", marginTop: 6, marginBottom: 16, fontFamily: theme.typography.regular, fontSize: 13, lineHeight: 18, color: MUTED },
  languageGrid: { gap: 8 },
  language: { minHeight: 46, paddingHorizontal: 14, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FAFAFA", borderWidth: StyleSheet.hairlineWidth, borderColor: "#ECEAEE" },
  languageActive: { backgroundColor: "#F3F2F4", borderColor: DARK },
  languageText: { fontFamily: theme.typography.medium, fontSize: 14, color: "#5B5660" },
  languageTextActive: { fontFamily: theme.typography.semibold, color: DARK },
  input: { height: 48, borderRadius: 12, marginBottom: 10, paddingHorizontal: 14, backgroundColor: "#FAFAFA", borderWidth: StyleSheet.hairlineWidth, borderColor: "#E4E0E6", fontFamily: theme.typography.regular, fontSize: 14, color: DARK },
  primaryButton: { height: 48, marginTop: 4, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: DARK },
  dangerButton: { height: 48, marginTop: 4, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.danger },
  primaryButtonText: { fontFamily: theme.typography.semibold, fontSize: 14, color: "#FFFFFF" },
  cancelButton: { alignItems: "center", paddingTop: 14 },
  cancelText: { fontFamily: theme.typography.medium, fontSize: 14, color: MUTED },
});
