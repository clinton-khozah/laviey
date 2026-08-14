import { useEffect, useState } from "react";
import {
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
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { onboardingApi, profileApi } from "../../api/services";
import { PrimaryButton } from "../../components/common/PrimaryButton";
import { theme } from "../../constants/theme";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import type { OnboardingOption } from "../../types";

type FieldKey = "name" | "headline" | "bio" | "pronouns" | "city" | "hometown" | "school" | "degree" | "occupation" | "company";
type Form = Record<FieldKey, string>;

export function EditProfileScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, "EditProfile">) {
  const profile = route.params.profile;
  const [avatar, setAvatar] = useState(profile.avatarUrl);
  const [loading, setLoading] = useState(false);
  const [interestOptions, setInterestOptions] = useState<OnboardingOption[]>([]);
  const [selectedInterestKeys, setSelectedInterestKeys] = useState(() => profile.interests.map((item) => item.key));
  const [form, setForm] = useState<Form>({
    name: profile.displayName,
    headline: profile.headline ?? "",
    bio: profile.bio,
    pronouns: profile.pronouns ?? "",
    city: profile.city ?? "",
    hometown: profile.hometown ?? "",
    school: profile.school ?? "",
    degree: profile.degree ?? "",
    occupation: profile.occupation ?? "",
    company: profile.company ?? "",
  });

  const set = (key: FieldKey) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    void onboardingApi.questions().then((questions) => {
      const interestQuestion = questions.find((question) => question.stepKey === "interests");
      setInterestOptions(interestQuestion?.options ?? []);
    }).catch(() => undefined);
  }, []);

  const toggleInterest = (key: string) => {
    setSelectedInterestKeys((current) => {
      if (current.includes(key)) return current.filter((item) => item !== key);
      if (current.length >= 12) {
        Alert.alert("Maximum reached", "Choose up to 12 interests.");
        return current;
      }
      return [...current, key];
    });
  };

  const choosePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.82,
    });
    if (result.canceled) return;
    setAvatar(result.assets[0].uri);
    try {
      await profileApi.uploadAvatar(result.assets[0].uri);
    } catch (error) {
      Alert.alert("Photo not uploaded", error instanceof Error ? error.message : "Please try again.");
    }
  };

  const save = async () => {
    if (!form.name.trim()) return Alert.alert("Name required");
    setLoading(true);
    try {
      await profileApi.update({
        displayName: form.name.trim(),
        headline: form.headline.trim(),
        bio: form.bio.trim(),
        pronouns: form.pronouns.trim(),
        city: form.city.trim(),
        hometown: form.hometown.trim(),
        school: form.school.trim(),
        degree: form.degree.trim(),
        occupation: form.occupation.trim(),
        company: form.company.trim(),
        interestKeys: selectedInterestKeys,
      });
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

        <Section title="THE BASICS" icon="person-outline">
          <Field label="Display name" value={form.name} onChangeText={set("name")} maxLength={80} />
          <Field label="Profile headline" value={form.headline} onChangeText={set("headline")} placeholder="A quick line about your vibe" maxLength={80} />
          <Field label="Pronouns" value={form.pronouns} onChangeText={set("pronouns")} placeholder="e.g. she/her" maxLength={40} />
          <Field label="About you" value={form.bio} onChangeText={set("bio")} placeholder="Share a little about yourself…" maxLength={500} multiline />
        </Section>

        <Section title="EDUCATION & WORK" icon="school-outline">
          <Field label="School, college or university" value={form.school} onChangeText={set("school")} placeholder="Where did you study?" />
          <Field label="Degree or field of study" value={form.degree} onChangeText={set("degree")} placeholder="e.g. BSc Computer Science" />
          <Field label="Occupation" value={form.occupation} onChangeText={set("occupation")} placeholder="What do you do?" />
          <Field label="Company" value={form.company} onChangeText={set("company")} placeholder="Where do you work?" />
        </Section>

        <Section title="PLACES" icon="location-outline">
          <Field label="Current city" value={form.city} onChangeText={set("city")} placeholder="Where do you live?" />
          <Field label="Hometown" value={form.hometown} onChangeText={set("hometown")} placeholder="Where are you from?" />
        </Section>

        <Section title="FROM YOUR QUIZ" icon="sparkles-outline">
          <Text style={styles.quizCopy}>Choose the interests from your quiz that you want people to see on your For You profile.</Text>
          <View style={styles.chips}>
            {(interestOptions.length > 0 ? interestOptions : profile.interests).map((interest) => (
              <Pressable key={interest.key} onPress={() => toggleInterest(interest.key)} style={[styles.chip, selectedInterestKeys.includes(interest.key) && styles.chipActive]}>
                <Text style={[styles.chipText, selectedInterestKeys.includes(interest.key) && styles.chipTextActive]}>{interest.emoji} {interest.label}</Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <PrimaryButton label="Save profile" loading={loading} onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ title, icon, children }: { title: string; icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode }) {
  return (
    <View>
      <View style={styles.sectionTitle}>
        <View style={styles.sectionIcon}><Ionicons name={icon} size={15} color="#8D46D8" /></View>
        <Text style={styles.sectionText}>{title}</Text>
      </View>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Field({ label, multiline, ...props }: React.ComponentProps<typeof TextInput> & { label: string; multiline?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={theme.colors.textMuted}
        style={[styles.input, multiline && styles.bio]}
      />
      {props.maxLength ? <Text style={styles.count}>{String(props.value ?? "").length}/{props.maxLength}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F8FC" },
  content: { padding: 16, paddingBottom: 40, gap: 18 },
  hero: { alignItems: "center", paddingVertical: 8 },
  photoWrap: { position: "relative" },
  avatar: { width: 112, height: 112, borderRadius: 56, backgroundColor: "#ECEAF0", borderWidth: 4, borderColor: "white" },
  camera: { position: "absolute", right: 1, bottom: 2, width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#FF6372", borderWidth: 3, borderColor: "white" },
  heroTitle: { marginTop: 12, fontFamily: theme.typography.bold, fontSize: 20, color: "#151521" },
  heroCopy: { marginTop: 4, fontFamily: theme.typography.regular, fontSize: 12, color: "#8B8991", textAlign: "center" },
  sectionTitle: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 },
  sectionIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#F3EAFE" },
  sectionText: { fontFamily: theme.typography.bold, fontSize: 12, letterSpacing: 0.5, color: "#929098" },
  card: { backgroundColor: "white", borderRadius: 18, padding: 14, gap: 14, borderWidth: 1, borderColor: "#ECEAEC" },
  field: { gap: 6 },
  label: { fontFamily: theme.typography.semibold, fontSize: 12, color: "#5F5A65" },
  input: { minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: "#E1DFE5", backgroundColor: "#FAF9FB", paddingHorizontal: 13, fontFamily: theme.typography.regular, color: "#221F26" },
  bio: { minHeight: 120, paddingTop: 12, textAlignVertical: "top" },
  count: { position: "absolute", right: 9, bottom: 7, fontFamily: theme.typography.regular, color: "#AAA6AE", fontSize: 9 },
  quizCopy: { fontFamily: theme.typography.regular, color: "#77737C", fontSize: 12, lineHeight: 18 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, backgroundColor: "#F0EFF3", borderWidth: 1, borderColor: "#DAD7DF" },
  chipText: { fontFamily: theme.typography.semibold, fontSize: 11.5, color: "#5F5A65" },
  chipActive: { backgroundColor: "#FFF2F5", borderColor: "#FF9AB1" },
  chipTextActive: { color: "#FF5575" },
});
