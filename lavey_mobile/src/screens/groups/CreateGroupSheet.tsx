import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { matchApi, groupChatApi } from "../../api/services";
import { theme } from "../../constants/theme";
import type { GroupChat, MatchListItem } from "../../types";

const SHEET_ACCENT = theme.colors.coral;

export function CreateGroupSheet({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose(): void;
  onCreated(group: GroupChat): void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [matches, setMatches] = useState<MatchListItem[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [maxMembers, setMaxMembers] = useState(10);
  const [coverUri, setCoverUri] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setName("");
      setDescription("");
      setSelected(new Set());
      setVisibility("public");
      setMaxMembers(10);
      setCoverUri(null);
      return;
    }
    setLoadingMatches(true);
    void matchApi
      .list()
      .then(setMatches)
      .catch(() => setMatches([]))
      .finally(() => setLoadingMatches(false));
  }, [visible]);

  const toggle = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else if (next.size < maxMembers - 1) next.add(userId);
      return next;
    });
  };
  const pickCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert("Photo access needed", "Allow photo access to choose a group profile image.");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (!result.canceled) setCoverUri(result.assets[0]?.uri ?? null);
  };

  const create = async () => {
    if (!name.trim()) return Alert.alert("Name your group", "Give the group chat a name.");
    setSaving(true);
    try {
      const group = await groupChatApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        memberUserIds: [...selected],
        visibility,
        maxMembers,
      });
      if (!coverUri) {
        onCreated(group);
        return;
      }

      try {
        onCreated(await groupChatApi.uploadCover(group.id, coverUri));
      } catch (uploadError) {
        // The group has already been created successfully. Older deployments may
        // not have the optional cover-upload route registered, so do not report
        // the whole creation as failed or leave the user stuck in this modal.
        onCreated(group);
        Alert.alert(
          "Group created",
          uploadError instanceof Error && /path is not registered/i.test(uploadError.message)
            ? "Your group is ready. The photo-upload route still needs to be enabled, so you can add the group photo after that update."
            : "Your group is ready, but the photo could not be uploaded. You can add it again from the group settings.",
        );
      }
    } catch (e) {
      Alert.alert("Could not create group", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.keyboardFill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={styles.sheetTouchable} onPress={() => {}}>
        <SafeAreaView style={styles.sheet} edges={["bottom"]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetHeaderTitle}>New group chat</Text>
            <Pressable style={styles.sheetHeaderClose} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={18} color="#8B8990" />
            </Pressable>
          </View>

          <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Pressable style={styles.coverPicker} onPress={() => void pickCover()}>
              {coverUri ? <Image source={{ uri: coverUri }} style={styles.coverImage} /> : (
                <View style={styles.coverPlaceholder}>
                  <Ionicons name="camera-outline" size={25} color={SHEET_ACCENT} />
                </View>
              )}
              <View style={styles.coverBadge}>
                <Ionicons name="add" size={14} color="white" />
              </View>
              <Text style={styles.coverText}>{coverUri ? "Change group photo" : "Add group photo"}</Text>
            </Pressable>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Group name"
              placeholderTextColor="#B0ACB4"
              style={styles.input}
              maxLength={80}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>group access</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable style={styles.visRow} onPress={() => setVisibility((value) => value === "public" ? "private" : "public")}>
              <View style={styles.visCopy}>
                <Text style={styles.visLabel}>{visibility === "public" ? "Public — anyone can join" : "Private — invite only"}</Text>
                <Text style={styles.visHint}>{visibility === "public" ? "People can discover this group." : "Only invited people or those with the link can join."}</Text>
              </View>
              <View style={[styles.switchTrack, visibility === "private" && styles.switchTrackOn]}>
                <View style={[styles.switchThumb, visibility === "private" && styles.switchThumbOn]} />
              </View>
            </Pressable>

            <View style={styles.capacityHead}>
              <View>
                <Text style={[styles.label, { marginTop: 0 }]}>Group capacity</Text>
                <Text style={styles.hint}>Includes you</Text>
              </View>
              <View style={styles.stepper}>
                <Pressable style={styles.stepBtn} onPress={() => setMaxMembers((n) => Math.max(Math.max(2, selected.size + 1), n - 1))}><Ionicons name="remove" size={17} color={SHEET_ACCENT} /></Pressable>
                <Text style={styles.stepValue}>{maxMembers}</Text>
                <Pressable style={styles.stepBtn} onPress={() => setMaxMembers((n) => Math.min(100, n + 1))}><Ionicons name="add" size={17} color={SHEET_ACCENT} /></Pressable>
              </View>
            </View>
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What's this group about?"
              placeholderTextColor="#B0ACB4"
              style={styles.input}
              maxLength={240}
            />

            <Text style={styles.label}>Invite matches{selected.size > 0 ? ` · ${selected.size}` : ""}</Text>
            {loadingMatches ? (
              <ActivityIndicator style={{ marginVertical: 12 }} color={SHEET_ACCENT} />
            ) : matches.length === 0 ? (
              <Text style={styles.empty}>You don&apos;t have any matches yet to invite.</Text>
            ) : (
              matches.map((m) => {
                const userId = m.userId as string;
                const on = selected.has(userId);
                return (
                  <Pressable key={m.id} style={[styles.matchRow, on && styles.matchRowOn]} onPress={() => toggle(userId)}>
                    {m.avatar ? (
                      <Image source={{ uri: m.avatar }} style={styles.matchAvatar} />
                    ) : (
                      <View style={[styles.matchAvatar, styles.matchAvatarFallback]} />
                    )}
                    <Text style={styles.matchName} numberOfLines={1}>
                      {m.name}
                    </Text>
                    <View style={[styles.checkbox, on && styles.checkboxOn]}>
                      {on ? <Ionicons name="checkmark" size={13} color="white" /> : null}
                    </View>
                  </Pressable>
                );
              })
            )}

            <Pressable onPress={() => void create()} disabled={saving} style={({ pressed }) => [styles.submit, pressed && styles.pressed, saving && styles.disabled]}>
                <Text style={styles.submitText}>{saving ? "Creating…" : "Create group"}</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardFill: { flex: 1 },
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,.42)", justifyContent: "flex-end" },
  sheetTouchable: { width: "100%" },
  sheet: { maxHeight: "100%", backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden", paddingHorizontal: 19, paddingTop: 14 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 10, borderBottomWidth: 1, borderColor: "#ECEAEC" },
  sheetHeaderTitle: { fontFamily: theme.typography.bold, fontSize: 19, color: "#19171E" },
  sheetHeaderClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F4F5",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  bodyScroll: { flexShrink: 1 },
  body: { paddingTop: 12, paddingBottom: 24, gap: 9 },
  coverPicker: { alignItems: "center", marginBottom: 2 },
  coverImage: { width: 78, height: 78, borderRadius: 23 },
  coverPlaceholder: { width: 78, height: 78, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF0F2", borderWidth: 1, borderColor: "#FFC7D1" },
  coverBadge: { position: "absolute", top: 59, marginLeft: 56, width: 24, height: 24, borderRadius: 12, backgroundColor: "#17131D", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "white" },
  coverText: { marginTop: 7, fontFamily: theme.typography.semibold, fontSize: 11.5, color: "#17131D" },
  label: { fontFamily: theme.typography.semibold, fontSize: 11.5, color: "#5B5660", marginTop: 12, marginBottom: 5 },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#E0DDE2",
    borderRadius: 13,
    paddingHorizontal: 11,
    fontFamily: theme.typography.regular,
    fontSize: 14,
    color: theme.colors.text,
    backgroundColor: "#FBFBFC",
  },
  divider: { flexDirection: "row", alignItems: "center", gap: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#EDEBEF" },
  dividerText: { fontFamily: theme.typography.medium, fontSize: 10.5, color: "#B0ACB4" },
  visRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 10, borderRadius: 13, backgroundColor: "#FBFBFC", borderWidth: 1, borderColor: "#E0DDE2" },
  visCopy: { flex: 1, paddingRight: 10 },
  visLabel: { fontFamily: theme.typography.semibold, fontSize: 12, color: theme.colors.text },
  visHint: { marginTop: 2, fontFamily: theme.typography.regular, fontSize: 9.5, color: "#8D8791" },
  switchTrack: { width: 40, height: 24, borderRadius: 12, backgroundColor: "#DDD9E0", padding: 3 },
  switchTrackOn: { backgroundColor: "#17131D" },
  switchThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: "white" },
  switchThumbOn: { transform: [{ translateX: 16 }] },
  segment: { flexDirection: "row", gap: 8, padding: 4, borderRadius: 16, backgroundColor: "#F1EFF4" },
  segmentItem: { flex: 1, height: 42, borderRadius: 13, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" },
  segmentItemOn: { backgroundColor: SHEET_ACCENT },
  segmentText: { fontFamily: theme.typography.semibold, fontSize: 12, color: "#716B76", textTransform: "capitalize" },
  segmentTextOn: { color: "white" },
  hint: { fontFamily: theme.typography.regular, fontSize: 11, color: "#9A96A0", marginTop: 6, lineHeight: 16 },
  capacityHead: { marginTop: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: "#FFF0F2", padding: 4, borderRadius: 15 },
  stepBtn: { width: 33, height: 33, borderRadius: 11, backgroundColor: "white", alignItems: "center", justifyContent: "center" },
  stepValue: { minWidth: 25, textAlign: "center", fontFamily: theme.typography.bold, color: "#C53F58" },
  empty: {
    fontFamily: theme.typography.regular,
    fontSize: 12.5,
    color: "#9A96A0",
    lineHeight: 18,
    padding: 12,
    backgroundColor: "#FBFBFC",
    borderRadius: 12,
  },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 9,
    borderRadius: 12,
    backgroundColor: "#FBFBFC",
    borderWidth: 1,
    borderColor: "#E0DDE2",
    marginBottom: 6,
  },
  matchRowOn: { borderColor: "#FFC7D1", backgroundColor: "#FFF0F2" },
  matchAvatar: { width: 34, height: 34, borderRadius: 17 },
  matchAvatarFallback: { backgroundColor: SHEET_ACCENT },
  matchName: { flex: 1, fontFamily: theme.typography.semibold, fontSize: 13.5, color: theme.colors.text },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#D6D3D9",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { backgroundColor: SHEET_ACCENT, borderColor: SHEET_ACCENT },
  submit: { height: 46, borderRadius: 14, marginTop: 16, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#17131D" },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.6 },
  submitText: { color: "white", fontFamily: theme.typography.bold, fontSize: 15 },
});
