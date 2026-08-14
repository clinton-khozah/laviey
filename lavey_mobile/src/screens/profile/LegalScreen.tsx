import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { legalApi, type LegalDocument } from "../../api/services";
import { theme } from "../../constants/theme";
import type { RootStackParamList } from "../../navigation/AppNavigator";

export function LegalScreen({ route }: NativeStackScreenProps<RootStackParamList, "Legal">) {
  const { variant } = route.params;
  const [doc, setDoc] = useState<LegalDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetcher = variant === "terms" ? legalApi.terms : legalApi.guidelines;
    fetcher()
      .then(setDoc)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load this document."));
  }, [variant]);

  if (error) {
    return (
      <SafeAreaView style={styles.center} edges={["bottom"]}>
        <Text style={styles.error}>{error}</Text>
      </SafeAreaView>
    );
  }

  if (!doc) {
    return (
      <SafeAreaView style={styles.center} edges={["bottom"]}>
        <ActivityIndicator color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{doc.title}</Text>
        <Text style={styles.intro}>{doc.intro}</Text>
        {doc.safetyNote ? (
          <View style={styles.safetyNote}>
            <Text style={styles.safetyNoteText}>{doc.safetyNote}</Text>
          </View>
        ) : null}
        {doc.sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.body.map((paragraph, i) => (
              <Text key={i} style={styles.paragraph}>{paragraph}</Text>
            ))}
          </View>
        ))}
        {doc.footer ? <Text style={styles.footer}>{doc.footer}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.background, padding: 24 },
  error: { fontFamily: theme.typography.medium, fontSize: 13.5, color: theme.colors.danger, textAlign: "center" },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontFamily: theme.typography.bold, fontSize: 21, color: theme.colors.text },
  intro: { fontFamily: theme.typography.regular, fontSize: 13.5, color: theme.colors.textSecondary, marginTop: 8, lineHeight: 20 },
  safetyNote: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.primarySoft,
  },
  safetyNoteText: { fontFamily: theme.typography.medium, fontSize: 12.5, color: theme.colors.primaryDark, lineHeight: 18 },
  section: { marginTop: 22 },
  sectionTitle: { fontFamily: theme.typography.bold, fontSize: 15, color: theme.colors.text, marginBottom: 8 },
  paragraph: { fontFamily: theme.typography.regular, fontSize: 13, color: theme.colors.textSecondary, lineHeight: 19, marginBottom: 8 },
  footer: { fontFamily: theme.typography.regular, fontSize: 11.5, color: theme.colors.textMuted, marginTop: 24, lineHeight: 17 },
});
