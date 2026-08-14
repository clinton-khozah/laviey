import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { onboardingApi, profileApi, settingsApi, type UserSettings } from "../../api/services";
import { useTranslatedStrings } from "../../hooks/useTranslatedStrings";
import { ONBOARDING_QUIZ_STRINGS } from "./onboardingQuizScreen.strings";
import { ONBOARDING_LOCATION_STEP_STRINGS } from "./components/onboardingLocationStep.strings";
import { saveOnboardingDiscoverPrefs } from "../../utils/discoverOnboardingPrefs";
import { discoverFiltersFromOnboarding } from "../../utils/discoverFiltersFromOnboarding";
import { saveDiscoverFilters } from "../../utils/discoverFilterStorage";
import { saveOnboardingQuizSnapshot } from "../../utils/onboardingQuizStorage";
import { theme } from "../../constants/theme";
import { useAuth } from "../../hooks/useAuth";
import type {
  OnboardingLocationInput,
  OnboardingOption,
  OnboardingQuestion,
  SubmitOnboardingPayload,
} from "../../types";
import { AgeScroller, DEFAULT_AGE, ageToISODate } from "./components/AgeScroller";
import { OnboardingLocationStep } from "./components/OnboardingLocationStep";
import { sortLanguageOptionsForCountry } from "../../utils/languagesByCountry";
import { OnboardingMatchingOverlay } from "./components/OnboardingMatchingOverlay";
import { CircleProgress } from "./components/CircleProgress";
import { UnderlineTextInput } from "./components/FormUnderline";

const CATALOG_FIELD_MAP: Record<string, string> = {
  purpose: "purpose",
  age_preference: "agePreference",
  interested_in: "interestedIn",
  gender: "gender",
  orientation: "orientation",
  religion: "religion",
};

const SKIPPABLE_STEPS = new Set(["orientation", "religion", "languages"]);
const QUIZ_LOAD_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(message));
      },
    );
  });
}

const CLIENT_STEP_EMOJI: Record<string, string> = {
  preferredName: "😊",
  location: "📍",
  bio: "✍️",
};

type WizardStep =
  | { kind: "preferredName" }
  | { kind: "question"; question: OnboardingQuestion }
  | { kind: "location" }
  | { kind: "bio" };

function stepEmojiFor(step: WizardStep): string {
  if (step.kind === "question") return step.question.heroEmoji;
  return CLIENT_STEP_EMOJI[step.kind] ?? "✨";
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

import { QUIZ_HERO_IMAGES } from "../../constants/quizHeroImages";

function StepHero({ emoji, stepKey }: { emoji: string; stepKey?: string }) {
  const heroImage = stepKey ? QUIZ_HERO_IMAGES[stepKey] : undefined;

  if (heroImage) {
    return (
      <Animated.View key={stepKey} entering={ZoomIn.duration(320)} style={styles.heroWrapImage}>
        <Image source={heroImage} style={styles.heroImage} contentFit="contain" />
      </Animated.View>
    );
  }

  return (
    <Animated.View key={emoji} entering={ZoomIn.duration(320)} style={styles.heroWrap}>
      <Text style={styles.heroEmoji}>{emoji}</Text>
    </Animated.View>
  );
}

function PreferredNameStep({
  preferredName,
  onChange,
  t,
}: {
  preferredName: string;
  onChange(value: string): void;
  t(label: string): string;
}) {
  return (
    <View style={styles.nameStep}>
      <Text style={styles.nameEyebrow}>{t("Display name")}</Text>
      <Text style={styles.nameTitle}>{t("What should we call you?")}</Text>
      <Text style={styles.nameSubtitle}>
        {t("You signed in with Google — pick the name your matches will see.")}
      </Text>
      <UnderlineTextInput
        containerStyle={styles.nameField}
        value={preferredName}
        onChangeText={onChange}
        placeholder={t("Your preferred name")}
        maxLength={40}
        autoFocus
        autoCorrect={false}
        autoCapitalize="words"
        returnKeyType="done"
      />
    </View>
  );
}

function OptionCard({
  option,
  selected,
  onPress,
}: {
  option: OnboardingOption;
  selected: boolean;
  onPress(): void;
}) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handlePress = () => {
    scale.value = withSequence(withTiming(0.95, { duration: 70 }), withSpring(1, { damping: 20, stiffness: 220 }));
    onPress();
  };
  return (
    <AnimatedPressable
      onPress={handlePress}
      style={[styles.option, selected && styles.optionSelected, style]}
    >
      <View style={styles.optionCopy}>
        <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
          {option.label}
        </Text>
        {option.hint ? (
          <Text style={[styles.optionHint, selected && styles.optionHintSelected]}>
            {option.hint}
          </Text>
        ) : null}
      </View>
      {selected ? <Ionicons name="checkmark-circle" size={22} color="white" /> : null}
    </AnimatedPressable>
  );
}

export function OnboardingQuizScreen({ onComplete, onIdentityStepComplete }: { onComplete(): void; onIdentityStepComplete?(): void }) {
  const { session } = useAuth();
  const isGoogleUser = session?.user.provider === "google";

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<OnboardingQuestion[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [preferredName, setPreferredName] = useState(() => session?.user.displayName ?? "");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [interests, setInterests] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [age, setAge] = useState(DEFAULT_AGE);
  const [location, setLocation] = useState<OnboardingLocationInput | null>(null);
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [language, setLanguage] = useState<UserSettings["language"]>("en");

  const loadQuiz = useCallback(async () => {
    try {
      const list = await withTimeout(
        onboardingApi.questions(),
        QUIZ_LOAD_TIMEOUT_MS,
        "The server is taking too long to respond. Tap Retry — it may still be waking up.",
      );
      setQuestions(list);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load the quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void settingsApi
      .get()
      .then((settings) => {
        if (settings.language) setLanguage(settings.language);
      })
      .catch(() => undefined);
    void loadQuiz().catch(() => undefined);
  }, [loadQuiz]);

  const steps = useMemo<WizardStep[]>(() => {
    const catalog = [...questions].sort((a, b) => a.sortOrder - b.sortOrder);
    const languagesQuestion = catalog.find((q) => q.stepKey === "languages");
    const rest = catalog.filter((q) => q.stepKey !== "languages");
    const list: WizardStep[] = [];
    if (isGoogleUser) list.push({ kind: "preferredName" });
    list.push(...rest.map((question) => ({ kind: "question" as const, question })));
    list.push({ kind: "location" });
    if (languagesQuestion) list.push({ kind: "question", question: languagesQuestion });
    list.push({ kind: "bio" });
    return list;
  }, [questions, isGoogleUser]);

  const currentStep = steps[stepIndex];
  const totalSteps = steps.length;
  const identityStepNotified = useRef(false);

  // The quiz's per-step copy is backend-authored (onboarding_questions/options), so it's
  // translated dynamically alongside the fixed ONBOARDING_QUIZ_STRINGS list rather than
  // being known at compile time.
  const dynamicStrings = useMemo(() => {
    if (currentStep?.kind !== "question") return [];
    const { question } = currentStep;
    return [
      question.title,
      question.subtitle,
      ...question.options.flatMap((option) => [option.label, option.hint].filter(Boolean)),
    ] as string[];
  }, [currentStep]);
  const { t } = useTranslatedStrings(
    [...ONBOARDING_QUIZ_STRINGS, ...ONBOARDING_LOCATION_STEP_STRINGS, ...dynamicStrings],
    language,
  );

  const canContinue = useMemo(() => {
    if (!currentStep) return false;
    if (currentStep.kind === "bio") return true;
    if (currentStep.kind === "preferredName") return preferredName.trim().length > 0;
    if (currentStep.kind === "location") return location !== null;
    const { question } = currentStep;
    if (question.stepKey === "date_of_birth") return true;
    if (question.kind === "multi") {
      const selected = question.stepKey === "interests" ? interests : languages;
      return selected.length >= (question.minSelections ?? 1);
    }
    const field = CATALOG_FIELD_MAP[question.stepKey] ?? question.stepKey;
    return Boolean(answers[field]);
  }, [currentStep, preferredName, location, interests, languages, answers]);

  const isSkippable =
    currentStep?.kind === "question" && SKIPPABLE_STEPS.has(currentStep.question.stepKey);

  const goBack = useCallback(() => {
    if (submitting || stepIndex <= 0) return;
    setStepIndex((i) => Math.max(0, i - 1));
  }, [stepIndex, submitting]);

  const submit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload: SubmitOnboardingPayload = {
        purpose: answers.purpose ?? "",
        agePreference: answers.agePreference ?? "",
        interestedIn: answers.interestedIn ?? "",
        gender: (answers.gender as SubmitOnboardingPayload["gender"]) || "prefer-not-to-say",
        orientation: answers.orientation || "prefer-not-to-say",
        religion: answers.religion || "prefer-not-to-say",
        interests,
        dateOfBirth: ageToISODate(age),
        languages: languages.length ? languages : undefined,
        location: location!,
      };
      await onboardingApi.submit(payload);
      const quizSnapshot = {
        interestedIn: answers.interestedIn ?? "",
        agePreference: answers.agePreference ?? "",
        gender: answers.gender,
        orientation: answers.orientation,
      };
      if (session?.user.id) {
        await saveOnboardingQuizSnapshot(session.user.id, quizSnapshot);
        await saveDiscoverFilters(
          discoverFiltersFromOnboarding(quizSnapshot),
          session.user.id,
        );
      }
      void saveOnboardingDiscoverPrefs();

      const profileUpdates: { bio?: string; displayName?: string } = {};
      if (bio.trim()) profileUpdates.bio = bio.trim();
      if (isGoogleUser && preferredName.trim()) profileUpdates.displayName = preferredName.trim();
      if (Object.keys(profileUpdates).length > 0) {
        try {
          await profileApi.update(profileUpdates);
        } catch {
          // Non-fatal — these can be edited later from Edit Profile.
        }
      }
      onComplete();
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "Could not save your answers. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [answers, interests, languages, age, location, bio, isGoogleUser, preferredName, onComplete, session?.user.id]);

  const goNext = useCallback(() => {
    if (!canContinue || submitting) return;
    if (!identityStepNotified.current && (currentStep?.kind === "preferredName" || stepIndex === 0)) {
      identityStepNotified.current = true;
      onIdentityStepComplete?.();
    }
    if (stepIndex >= totalSteps - 1) {
      void submit();
      return;
    }
    setStepIndex((i) => i + 1);
  }, [canContinue, currentStep, onIdentityStepComplete, stepIndex, submit, submitting, totalSteps]);

  const skipStep = useCallback(() => {
    if (submitting) return;
    if (stepIndex >= totalSteps - 1) {
      void submit();
      return;
    }
    setStepIndex((i) => i + 1);
  }, [stepIndex, submit, submitting, totalSteps]);

  const toggleOption = useCallback(
    (question: OnboardingQuestion, field: string, key: string) => {
      if (question.kind === "multi") {
        const setList = question.stepKey === "interests" ? setInterests : setLanguages;
        setList((prev) => {
          const has = prev.includes(key);
          if (has) return prev.filter((item) => item !== key);
          const max = question.maxSelections ?? Infinity;
          if (prev.length >= max) return prev;
          return [...prev, key];
        });
      } else {
        setAnswers((prev) => ({ ...prev, [field]: key }));
      }
    },
    [],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.title}>One moment…</Text>
      </SafeAreaView>
    );
  }

  if (loadError || steps.length === 0) {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="alert-circle-outline" size={42} color="#303034" />
        <Text style={styles.title}>{loadError || t("Couldn't load the quiz")}</Text>
        <Pressable
          style={styles.primaryButtonWrap}
          onPress={() => {
            setLoading(true);
            setLoadError(null);
            void loadQuiz().catch(() => undefined);
          }}
        >
          <View style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{t("Retry")}</Text>
          </View>
        </Pressable>
      </SafeAreaView>
    );
  }

  const renderStep = (step: WizardStep) => {
    if (step.kind === "preferredName") {
      return (
        <PreferredNameStep
          preferredName={preferredName}
          onChange={setPreferredName}
          t={t}
        />
      );
    }

    if (step.kind === "location") {
      return (
        <>
          <StepHero emoji={stepEmojiFor(step)} stepKey="location" />
          <Text style={styles.title}>{t("Where are you?")}</Text>
          <Text style={styles.subtitle}>
            {t("We use this to show you people nearby. We'll only ever show others your city, never your exact spot.")}
          </Text>
          <OnboardingLocationStep value={location} onChange={setLocation} t={t} />
        </>
      );
    }

    if (step.kind === "bio") {
      return (
        <>
          <StepHero emoji={stepEmojiFor(step)} stepKey="bio" />
          <Text style={styles.title}>{t("Tell us about you")}</Text>
          <Text style={styles.subtitle}>
            {t("A short bio helps your matches know what makes you, you. You can always change this later.")}
          </Text>
          <View style={styles.bioInputWrap}>
            {bio.length === 0 ? (
              <Text style={styles.bioPlaceholder} pointerEvents="none">
                {t("I'm probably talking about...")}
              </Text>
            ) : null}
            <TextInput
              style={styles.bioInput}
              value={bio}
              onChangeText={(text) => setBio(text.slice(0, 500))}
              multiline
              maxLength={500}
            />
          </View>
          <Text style={styles.bioHint}>{t("Don't be shy")}</Text>
          <Text style={styles.charCount}>{bio.length}/500</Text>
        </>
      );
    }

    const { question } = step;

    if (question.stepKey === "date_of_birth") {
      return (
        <>
          <StepHero emoji={stepEmojiFor(step)} stepKey={question.stepKey} />
          <Text style={styles.title}>{t(question.title)}</Text>
          <Text style={styles.subtitle}>{t(question.subtitle)}</Text>
          <View style={styles.scrollerWrap}>
            <AgeScroller age={age} onChange={setAge} />
          </View>
        </>
      );
    }

    const field = CATALOG_FIELD_MAP[question.stepKey] ?? question.stepKey;
    const isMulti = question.kind === "multi";
    const selectedList =
      question.stepKey === "interests" ? interests : question.stepKey === "languages" ? languages : [];
    const options =
      question.stepKey === "languages"
        ? sortLanguageOptionsForCountry(question.options, location?.country)
        : question.options;

    return (
      <>
        <StepHero emoji={stepEmojiFor(step)} stepKey={question.stepKey} />
        <Text style={styles.title}>{t(question.title)}</Text>
        <Text style={styles.subtitle}>{t(question.subtitle)}</Text>
        <View style={styles.optionList}>
          {options.map((option) => {
            const selected = isMulti
              ? selectedList.includes(option.key)
              : answers[field] === option.key;
            return (
              <OptionCard
                key={option.key}
                option={{ ...option, label: t(option.label), hint: option.hint ? t(option.hint) : option.hint }}
                selected={selected}
                onPress={() => toggleOption(question, field, option.key)}
              />
            );
          })}
        </View>
        {isMulti ? (
          <Text style={styles.helperText}>
            {selectedList.length}/{question.minSelections ?? 1} {t("minimum selected")}
          </Text>
        ) : null}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        {stepIndex > 0 ? (
          <Pressable style={styles.backButton} onPress={goBack} hitSlop={10}>
            <Ionicons name="chevron-back" size={20} color="#19171E" />
          </Pressable>
        ) : (
          <View style={styles.backButton} />
        )}
        <View style={styles.progressCenter}>
          <CircleProgress
            progress={totalSteps > 0 ? (stepIndex + 1) / totalSteps : 0}
            currentStep={stepIndex + 1}
            totalSteps={totalSteps || 1}
          />
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollBody}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          key={stepIndex}
          entering={FadeIn.duration(140)}
          exiting={FadeOut.duration(100)}
          style={styles.stepBody}
        >
          {renderStep(currentStep)}
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButtonWrap,
            pressed && styles.primaryButtonPressed,
            (!canContinue || submitting) && styles.primaryButtonDisabled,
          ]}
          disabled={!canContinue || submitting}
          onPress={goNext}
        >
          <View style={styles.primaryButton}>
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {stepIndex >= totalSteps - 1 ? t("Enter Lavey") : t("Continue")}
              </Text>
            )}
          </View>
        </Pressable>
        {isSkippable ? (
          <Pressable style={styles.skipLink} onPress={skipStep}>
            <Text style={styles.skipLinkText}>{t("Skip for now")}</Text>
          </Pressable>
        ) : null}
      </View>

      {submitting || submitError ? (
        <OnboardingMatchingOverlay error={submitError} onRetry={() => void submit()} />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 14,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
  },
  backButton: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  headerSpacer: { width: 30, height: 30 },
  progressCenter: { flex: 1, paddingHorizontal: 4, justifyContent: "center" },
  scrollBody: { flexGrow: 1, paddingHorizontal: 22, paddingBottom: 24 },
  stepBody: { flex: 1, alignItems: "center", paddingTop: 16 },
  heroWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEEAF0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  heroWrapImage: {
    width: "100%",
    maxWidth: 280,
    height: 200,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  heroEmoji: {
    fontSize: 34,
    lineHeight: 40,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  title: {
    fontFamily: theme.typography.bold,
    fontSize: 22,
    color: "#19171E",
    textAlign: "center",
  },
  subtitle: {
    fontFamily: theme.typography.regular,
    fontSize: 13.5,
    color: "#6B6771",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 18,
    maxWidth: 320,
  },
  scrollerWrap: { marginTop: 12, marginBottom: 6 },
  nameStep: {
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    paddingTop: 8,
  },
  nameEyebrow: {
    fontFamily: theme.typography.semibold,
    fontSize: 11,
    color: "#9B98A1",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  nameTitle: {
    fontFamily: theme.typography.bold,
    fontSize: 26,
    color: "#141218",
    textAlign: "center",
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  nameSubtitle: {
    fontFamily: theme.typography.regular,
    fontSize: 14,
    color: "#6B6771",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 10,
    marginBottom: 36,
    maxWidth: 300,
  },
  nameField: {
    marginBottom: 0,
  },
  optionList: { width: "100%", gap: 10 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DEDCDF",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionSelected: {
    backgroundColor: "#2B202D",
    borderColor: "#2B202D",
  },
  optionCopy: { flex: 1 },
  optionLabel: { fontFamily: theme.typography.semibold, fontSize: 15, color: "#221F26" },
  optionLabelSelected: { color: "white" },
  optionHint: { fontFamily: theme.typography.regular, fontSize: 11.5, color: "#918D96", marginTop: 2 },
  optionHintSelected: { color: "rgba(255,255,255,.85)" },
  helperText: {
    fontFamily: theme.typography.medium,
    fontSize: 12,
    color: "#9B98A1",
    marginTop: 12,
  },
  bioInputWrap: {
    width: "100%",
    position: "relative",
  },
  bioPlaceholder: {
    position: "absolute",
    top: 14,
    left: 16,
    right: 16,
    fontFamily: theme.typography.regular,
    fontSize: 12,
    lineHeight: 17,
    color: "#B4B0BA",
  },
  bioInput: {
    width: "100%",
    minHeight: 140,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#EAE8EC",
    backgroundColor: "#FAFAFB",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: theme.typography.regular,
    fontSize: 14.5,
    color: "#221F26",
    textAlignVertical: "top",
  },
  charCount: {
    alignSelf: "flex-end",
    fontFamily: theme.typography.medium,
    fontSize: 11,
    color: "#B4B0BA",
    marginTop: 6,
  },
  bioHint: {
    alignSelf: "center",
    fontFamily: theme.typography.medium,
    fontSize: 12,
    color: "#9B98A1",
    marginTop: 10,
  },
  footer: { paddingHorizontal: 22, paddingBottom: 14, paddingTop: 6 },
  primaryButtonWrap: {
    borderRadius: 27,
    shadowOpacity: 0,
  },
  primaryButtonPressed: { transform: [{ scale: 0.98 }] },
  primaryButton: {
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#303034",
  },
  primaryButtonDisabled: { opacity: 0.35, shadowOpacity: 0 },
  primaryButtonText: { fontFamily: theme.typography.bold, fontSize: 15.5, color: "white" },
  skipLink: { alignItems: "center", paddingVertical: 14 },
  skipLinkText: { fontFamily: theme.typography.semibold, fontSize: 13, color: "#9B98A1" },
});
