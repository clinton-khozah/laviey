import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { profileApi } from "../../api/services";
import { useAppData } from "../../context/AppDataContext";
import { theme } from "../../constants/theme";
import type { RootStackParamList } from "../../navigation/AppNavigator";

type FieldKey = "name" | "headline" | "bio" | "city" | "hometown" | "school" | "degree" | "occupation" | "company";
type Form = Record<FieldKey, string>;

export function EditProfileScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, "EditProfile">) {
  const profile = route.params.profile;
  const { setProfile } = useAppData();
  const [avatar, setAvatar] = useState(profile.avatarUrl);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState<"city" | "hometown" | null>(null);
  const [form, setForm] = useState<Form>({
    name: profile.displayName,
    headline: profile.headline ?? "",
    bio: profile.bio,
    city: profile.city ?? "",
    hometown: profile.hometown ?? "",
    school: profile.school ?? "",
    degree: profile.degree ?? "",
    occupation: profile.occupation ?? "",
    company: profile.company ?? "",
  });

  const set = (key: FieldKey) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  const useCurrentPlace = async (key: "city" | "hometown") => {
    setLocating(key);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Location is off", "Allow location to fill this in, or type the place yourself.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      const city = place?.city || place?.subregion || place?.district || place?.region || "";
      const country = place?.country || "";
      const label = [city, country].filter(Boolean).join(", ");
      if (!label) {
        Alert.alert("No place name", "We could not read a city from here. Type it instead.");
        return;
      }
      set(key)(label);
    } catch {
      Alert.alert("Could not read your location", "Type the place instead.");
    } finally {
      setLocating(null);
    }
  };

  const choosePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      legacy: true,
      quality: 0.82,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setAvatar(uri);
    void profileApi.uploadAvatar(uri).then((result) => {
      if (result.avatarUrl) setAvatar(result.avatarUrl);
    }).catch((error) => {
      Alert.alert("Photo not uploaded", error instanceof Error ? error.message : "Please try again.");
    });
  };

  const save = async () => {
    if (!form.name.trim()) return Alert.alert("Name required");
    setLoading(true);
    try {
      const updated = await profileApi.update({
        displayName: form.name.trim(),
        headline: form.headline.trim(),
        bio: form.bio.trim(),
        city: form.city.trim(),
        hometown: form.hometown.trim(),
        school: form.school.trim(),
        degree: form.degree.trim(),
        occupation: form.occupation.trim(),
        company: form.company.trim(),
      });
      setProfile(updated);
      navigation.goBack();
    } catch (error) {
      Alert.alert("Could not save profile", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Pressable onPress={choosePhoto} style={styles.photoWrap}>
            <Image source={avatar ? { uri: avatar } : undefined} style={styles.avatar} />
            <View style={styles.camera}><Ionicons name="camera" size={17} color="white" /></View>
          </Pressable>
          <Text style={styles.heroTitle}>Make your profile feel like you</Text>
          <Text style={styles.heroCopy}>These details help people find a genuine connection.</Text>
        </View>

        <Section title="The basics" icon="person-outline">
          <Field label="Display name" value={form.name} onChangeText={set("name")} maxLength={80} />
          <Field label="Profile headline" value={form.headline} onChangeText={set("headline")} placeholder="A quick line about your vibe" maxLength={80} />
          <Field label="About you" value={form.bio} onChangeText={set("bio")} placeholder="Share a little about yourself…" maxLength={500} multiline />
        </Section>

        <Section title="Education and work" icon="school-outline">
          <Field label="School, college or university" value={form.school} onChangeText={set("school")} placeholder="Where did you study?" />
          <Field label="Degree or field of study" value={form.degree} onChangeText={set("degree")} placeholder="e.g. BSc Computer Science" />
          <Field label="Occupation" value={form.occupation} onChangeText={set("occupation")} placeholder="What do you do?" />
          <Field label="Company" value={form.company} onChangeText={set("company")} placeholder="Where do you work?" />
        </Section>

        <Section title="Places" icon="location-outline">
          <Field label="Current city" value={form.city} onChangeText={set("city")} placeholder="Where do you live?" onLocate={() => void useCurrentPlace("city")} locating={locating === "city"} />
          <Field label="Hometown" value={form.hometown} onChangeText={set("hometown")} placeholder="Where are you from?" onLocate={() => void useCurrentPlace("hometown")} locating={locating === "hometown"} />
        </Section>

        <Pressable disabled={loading} onPress={() => void save()} style={({ pressed }) => [styles.save, pressed && styles.savePressed, loading && styles.saveDisabled]}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save profile</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ title, icon, children }: { title: string; icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode }) {
  return (
    <View>
      <View style={styles.sectionTitle}>
        <View style={styles.sectionIcon}><Ionicons name={icon} size={15} color="#303034" /></View>
        <Text style={styles.sectionText}>{title}</Text>
      </View>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Field({
  label,
  multiline,
  onLocate,
  locating,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string; multiline?: boolean; onLocate?: () => void; locating?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View>
        <TextInput
          {...props}
          multiline={multiline}
          placeholderTextColor="#A1A1AA"
          selectionColor="#303034"
          style={[styles.input, multiline && styles.bio, onLocate && styles.inputWithAction]}
        />
        {onLocate ? (
          <Pressable
            onPress={onLocate}
            disabled={locating}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Use your current location for ${label}`}
            style={styles.locate}
          >
            {locating ? <ActivityIndicator size="small" color="#303034" /> : <Ionicons name="location" size={18} color="#303034" />}
          </Pressable>
        ) : null}
      </View>
      {props.maxLength ? <Text style={styles.count}>{String(props.value ?? "").length}/{props.maxLength}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, paddingBottom: 40, gap: 18 },
  hero: { alignItems: "center", paddingVertical: 8 },
  photoWrap: { position: "relative" },
  avatar: { width: 112, height: 112, borderRadius: 56, backgroundColor: "#F4F4F5", borderWidth: 4, borderColor: "white" },
  camera: { position: "absolute", right: 1, bottom: 2, width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#303034", borderWidth: 3, borderColor: "white" },
  heroTitle: { marginTop: 12, fontFamily: theme.typography.bold, fontSize: 20, color: "#18181B" },
  heroCopy: { marginTop: 4, fontFamily: theme.typography.regular, fontSize: 12, color: "#5F5F68", textAlign: "center" },
  sectionTitle: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 },
  sectionIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#F4F4F5" },
  sectionText: { fontFamily: theme.typography.semibold, fontSize: 12, letterSpacing: 0.2, color: "#81818D" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 10, padding: 14, gap: 14, borderWidth: 1, borderColor: "#D7D7DC" },
  field: { gap: 4 },
  label: { fontFamily: theme.typography.semibold, fontSize: 10, lineHeight: 14, letterSpacing: 0.35, color: "#81818D" },
  input: { minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: "#D7D7DC", backgroundColor: "#FFFFFF", paddingHorizontal: 14, fontFamily: theme.typography.regular, fontSize: 14, color: "#08080D" },
  inputWithAction: { paddingRight: 44 },
  locate: { position: "absolute", right: 8, top: 0, bottom: 0, width: 32, alignItems: "center", justifyContent: "center" },
  bio: { minHeight: 120, paddingTop: 12, textAlignVertical: "top" },
  count: { position: "absolute", right: 10, bottom: 8, fontFamily: theme.typography.regular, color: "#A1A1AA", fontSize: 9 },
  quizCopy: { fontFamily: theme.typography.regular, color: "#5F5F68", fontSize: 12, lineHeight: 18 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D7D7DC" },
  chipText: { fontFamily: theme.typography.semibold, fontSize: 11.5, color: "#3D3D4B" },
  chipActive: { backgroundColor: "#303034", borderColor: "#303034" },
  chipTextActive: { color: "#FFFFFF" },
  save: { height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#303034" },
  savePressed: { opacity: 0.88 },
  saveDisabled: { opacity: 0.65 },
  saveText: { fontFamily: theme.typography.bold, fontSize: 13, color: "#FFFFFF" },
});
