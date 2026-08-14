import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { settingsApi, subscriptionApi } from "../../api/services";
import { useAuth } from "../../hooks/useAuth";
import { theme } from "../../constants/theme";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import type { PlatinumStatus, PrivacySettings } from "../../types";
import { useAccessMode } from "../../context/AccessModeContext";

export function SafetyPrivacyScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "SafetyPrivacy">) {
  const { logout } = useAuth();
  const { allFree } = useAccessMode();
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof PrivacySettings | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [phone, setPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [platinumStatus, setPlatinumStatus] = useState<PlatinumStatus | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    void settingsApi
      .privacy()
      .then(setSettings)
      .catch((e) => Alert.alert("Couldn't load privacy settings", e instanceof Error ? e.message : "Please try again."))
      .finally(() => setLoading(false));
    void subscriptionApi.status().then(setPlatinumStatus).catch(() => {});
  }, []);

  const cancelSubscription = useCallback(() => {
    Alert.alert(
      "Cancel Platinum subscription?",
      "Platinum stays active until your current billing period ends, then automatic billing stops — no card will be charged again.",
      [
        { text: "Keep Platinum", style: "cancel" },
        {
          text: "Yes, cancel",
          style: "destructive",
          onPress: () => {
            setCancelling(true);
            void subscriptionApi
              .cancel()
              .then((result) => {
                setPlatinumStatus(result);
                Alert.alert("Subscription cancelled", "You won't be charged again. Platinum stays active until it expires.");
              })
              .catch((e) => Alert.alert("Couldn't cancel", e instanceof Error ? e.message : "Please try again."))
              .finally(() => setCancelling(false));
          },
        },
      ],
    );
  }, []);

  const toggle = useCallback(
    async (key: keyof PrivacySettings) => {
      if (!settings || savingKey) return;
      const next = !settings[key];
      setSettings({ ...settings, [key]: next });
      setSavingKey(key);
      try {
        const updated = await settingsApi.updatePrivacy({ [key]: next });
        setSettings(updated);
      } catch (e) {
        setSettings((prev) => (prev ? { ...prev, [key]: !next } : prev));
        Alert.alert("Couldn't update", e instanceof Error ? e.message : "Please try again.");
      } finally {
        setSavingKey(null);
      }
    },
    [settings, savingKey],
  );

  const downloadData = useCallback(async () => {
    setExporting(true);
    try {
      const data = await settingsApi.dataExport();
      await Share.share({ message: JSON.stringify(data, null, 2), title: "My Lavey data" });
    } catch (e) {
      Alert.alert("Couldn't export data", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setExporting(false);
    }
  }, []);

  const linkPhone = useCallback(async () => {
    if (phone.trim().length < 7) {
      return Alert.alert("Enter your phone number", "Include your country code, for example +27 82 123 4567.");
    }
    setSavingPhone(true);
    try {
      const updated = await settingsApi.updatePrivacy({ phone: phone.trim(), contactsCanFindMe: true });
      setSettings(updated);
      setPhone("");
      Alert.alert("Phone linked", "People who already have your number can now find you. Your raw number is never stored.");
    } catch (error) {
      Alert.alert("Couldn't link phone", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSavingPhone(false);
    }
  }, [phone]);

  const deleteAccount = useCallback(() => {
    Alert.alert(
      "Delete your account permanently?",
      "This removes your profile, matches, and messages. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete forever",
          style: "destructive",
          onPress: () => {
            setDeleting(true);
            void settingsApi
              .deleteAccount()
              .then(() => logout())
              .catch((e) => {
                setDeleting(false);
                Alert.alert("Couldn't delete account", e instanceof Error ? e.message : "Please try again.");
              });
          },
        },
      ],
    );
  }, [logout]);

  if (loading || !settings) {
    return (
      <SafeAreaView style={styles.center} edges={["bottom"]}>
        <ActivityIndicator color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  const ToggleRow = ({ label, subtitle, settingKey }: { label: string; subtitle: string; settingKey: keyof PrivacySettings }) => (
    <View style={styles.row}>
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      {savingKey === settingKey ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : (
        <Switch
          value={Boolean(settings[settingKey])}
          onValueChange={() => void toggle(settingKey)}
          trackColor={{ true: theme.colors.primary }}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={["bottom"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.breakCard}>
        <View style={styles.breakIcon}><Ionicons name="moon-outline" size={22} color="#8D46D8" /></View>
        <View style={styles.breakCopy}>
          <Text style={styles.breakTitle}>Take a break</Text>
          <Text style={styles.breakSubtitle}>Hide your account from For You while keeping your profile, matches and messages.</Text>
        </View>
        {savingKey === "showInDiscover" ? <ActivityIndicator size="small" color="#8D46D8" /> : (
          <Switch value={!settings.showInDiscover} onValueChange={() => void toggle("showInDiscover")} trackColor={{ false: "#D7D4DC", true: "#FF6372" }} />
        )}
      </View>
      <Text style={styles.heading}>Visibility</Text>
      <View style={styles.group}>
        <ToggleRow label="Show me in Discover" subtitle="Turn off to disappear from the For You feed" settingKey="showInDiscover" />
      </View>

      <Text style={styles.heading}>Contacts</Text>
      <View style={styles.group}>
        <ToggleRow label="Let contacts find me" subtitle="People with your number in their contacts can find you" settingKey="contactsCanFindMe" />
        {!settings.hasPhoneLinked ? (
          <View style={styles.phoneBox}>
            <Text style={styles.phoneLabel}>Link your phone number</Text>
            <Text style={styles.phoneHint}>Use your country code. We store only a secure hash, never the raw number.</Text>
            <View style={styles.phoneRow}>
              <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" placeholder="+27 82 123 4567" placeholderTextColor={theme.colors.textMuted} style={styles.phoneInput} />
              <Pressable onPress={() => void linkPhone()} disabled={savingPhone} style={styles.phoneButton}>
                {savingPhone ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.phoneButtonText}>Link</Text>}
              </Pressable>
            </View>
          </View>
        ) : <View style={styles.linked}><Ionicons name="checkmark-circle" size={17} color="#2FB3AA" /><Text style={styles.linkedText}>Phone number linked securely</Text></View>}
      </View>

      <Text style={styles.heading}>Messaging</Text>
      <View style={styles.group}>
        <ToggleRow label="Read receipts" subtitle="Let matches see when you've read their messages" settingKey="readReceipts" />
      </View>

      {!allFree ? (
      <>
      <Text style={styles.heading}>Payments & subscription</Text>
      <View style={styles.group}>
        {platinumStatus?.isPremium ? (
          <>
            <View style={styles.row}>
              <View style={styles.rowCopy}>
                <Text style={styles.rowLabel}>{platinumStatus.activeCheckout?.planLabel ?? "Platinum"}</Text>
                <Text style={styles.rowSubtitle}>
                  {platinumStatus.activeCheckout?.cancelAtPeriodEnd
                    ? `Cancelled — active until ${platinumStatus.premiumExpiresAt ? new Date(platinumStatus.premiumExpiresAt).toLocaleDateString() : "your period ends"}`
                    : platinumStatus.premiumExpiresAt
                      ? `Renews ${new Date(platinumStatus.premiumExpiresAt).toLocaleDateString()}`
                      : "Active"}
                </Text>
              </View>
            </View>
            {!platinumStatus.activeCheckout?.cancelAtPeriodEnd ? (
              <Pressable style={styles.linkRow} onPress={cancelSubscription} disabled={cancelling}>
                <View style={[styles.linkIcon, styles.dangerIcon]}>
                  <Ionicons name="close-circle-outline" size={19} color={theme.colors.danger} />
                </View>
                <Text style={[styles.linkLabel, styles.dangerText]}>Unsubscribe from Platinum</Text>
                {cancelling ? <ActivityIndicator size="small" color={theme.colors.danger} /> : null}
              </Pressable>
            ) : null}
          </>
        ) : (
          <View style={styles.row}>
            <View style={styles.rowCopy}>
              <Text style={styles.rowLabel}>No active subscription</Text>
              <Text style={styles.rowSubtitle}>Upgrade to Platinum from your profile to unlock more features</Text>
            </View>
          </View>
        )}
        <Text style={styles.cardNotice}>
          Lavey never stores your card number — payments are handled directly and securely by PayFast.
          Cancelling your subscription immediately stops any future automatic billing, so there's nothing
          left on file to charge.
        </Text>
      </View>
      </>
      ) : null}

      <Text style={styles.heading}>Your data</Text>
      <View style={styles.group}>
        <Pressable style={styles.linkRow} onPress={() => navigation.navigate("BlockedUsers")}>
          <View style={styles.linkIcon}>
            <Ionicons name="remove-circle-outline" size={19} color={theme.colors.primary} />
          </View>
          <Text style={styles.linkLabel}>Blocked users</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </Pressable>
        <Pressable style={styles.linkRow} onPress={() => void downloadData()} disabled={exporting}>
          <View style={styles.linkIcon}>
            <Ionicons name="download-outline" size={19} color={theme.colors.primary} />
          </View>
          <Text style={styles.linkLabel}>Download my data</Text>
          {exporting ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />}
        </Pressable>
      </View>

      <View style={styles.group}>
        <Pressable style={styles.linkRow} onPress={deleteAccount} disabled={deleting}>
          <View style={[styles.linkIcon, styles.dangerIcon]}>
            <Ionicons name="trash-outline" size={19} color={theme.colors.danger} />
          </View>
          <Text style={[styles.linkLabel, styles.dangerText]}>Delete my account permanently</Text>
          {deleting ? <ActivityIndicator size="small" color={theme.colors.danger} /> : null}
        </Pressable>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F8FC" },
  content: { padding: 16, paddingBottom: 36 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.background },
  heading: { fontFamily: theme.typography.semibold, fontSize: 12, color: theme.colors.textMuted, marginBottom: 8, marginTop: 4 },
  group: { backgroundColor: theme.colors.surface, borderRadius: 16, overflow: "hidden", marginBottom: 18 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 62,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  rowCopy: { flex: 1 },
  rowLabel: { fontFamily: theme.typography.medium, fontSize: 13.5, color: theme.colors.text },
  rowSubtitle: { fontFamily: theme.typography.regular, fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 58, paddingHorizontal: 14 },
  linkIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.colors.primarySoft, alignItems: "center", justifyContent: "center" },
  dangerIcon: { backgroundColor: theme.colors.coralSoft },
  linkLabel: { flex: 1, fontFamily: theme.typography.medium, fontSize: 13.5, color: theme.colors.text },
  dangerText: { color: theme.colors.danger },
  breakCard: { flexDirection: "row", alignItems: "center", gap: 11, padding: 15, borderRadius: 20, marginBottom: 20, backgroundColor: "#FFF2F5", borderWidth: 1, borderColor: "#FFB1C2" },
  breakIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "#F3EAFE" },
  breakCopy: { flex: 1 },
  breakTitle: { fontFamily: theme.typography.bold, fontSize: 15, color: "#221F26" },
  breakSubtitle: { marginTop: 2, fontFamily: theme.typography.regular, fontSize: 10.5, lineHeight: 15, color: "#77737C" },
  phoneBox: { padding: 14, borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  phoneLabel: { fontFamily: theme.typography.semibold, fontSize: 12.5, color: theme.colors.text },
  phoneHint: { fontFamily: theme.typography.regular, fontSize: 10.5, color: theme.colors.textMuted, lineHeight: 15, marginTop: 2 },
  phoneRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  phoneInput: { flex: 1, height: 44, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: "#DDD9E1", backgroundColor: "#FAF9FB", color: theme.colors.text, fontFamily: theme.typography.regular },
  phoneButton: { minWidth: 66, height: 44, paddingHorizontal: 15, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#FF6372" },
  phoneButtonText: { color: "white", fontFamily: theme.typography.bold },
  linked: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, paddingBottom: 13 },
  linkedText: { color: "#2A827A", fontFamily: theme.typography.medium, fontSize: 11 },
  cardNotice: {
    fontFamily: theme.typography.regular,
    fontSize: 10.5,
    lineHeight: 15,
    color: theme.colors.textMuted,
    padding: 14,
    paddingTop: 4,
  },
});
