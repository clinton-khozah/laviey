import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { profileApi, settingsApi, translationApi, type AppLanguageCode } from "../api/services";
import { suggestedLanguageForCountry } from "../utils/countryToUiLanguage";

const LANGUAGE_PRIMER_SHOWN_KEY = "@lavey/language-primer-shown";

/**
 * Suggests switching the app's UI language based on the user's onboarding-captured
 * country, once ever. Mirrors usePushRegistration's shape: an AsyncStorage flag written
 * on both accept and dismiss so it never nags twice, gated so it only runs once the
 * session/onboarding state this depends on is actually settled.
 */
export function useLanguageDetectionPrompt(enabled: boolean) {
  const [visible, setVisible] = useState(false);
  const [suggested, setSuggested] = useState<AppLanguageCode | null>(null);
  const [suggestedLabel, setSuggestedLabel] = useState("");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    void (async () => {
      try {
        const already = await AsyncStorage.getItem(LANGUAGE_PRIMER_SHOWN_KEY);
        if (already || cancelled) return;

        const [profile, settings] = await Promise.all([profileApi.me(), settingsApi.get()]);
        if (cancelled) return;
        if (settings.language !== "en") return; // already changed manually — never override that

        const candidate = suggestedLanguageForCountry(profile.country);
        if (!candidate) return;

        const languages = await translationApi.languages().catch(() => []);
        if (cancelled) return;
        const label = languages.find((l) => l.code === candidate)?.label ?? candidate;

        setSuggested(candidate);
        setSuggestedLabel(label);
        setVisible(true);
      } catch {
        // Non-blocking — if profile/settings can't load yet, just skip silently this session.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const onAccept = async () => {
    if (!suggested || applying) return;
    setApplying(true);
    try {
      await AsyncStorage.setItem(LANGUAGE_PRIMER_SHOWN_KEY, "1");
      await settingsApi.update({ language: suggested });
    } catch {
      // Settings screen remains the fallback way to change language if this fails.
    } finally {
      setApplying(false);
      setVisible(false);
    }
  };

  const onDismiss = () => {
    setVisible(false);
    void AsyncStorage.setItem(LANGUAGE_PRIMER_SHOWN_KEY, "1");
  };

  return { visible, suggested, suggestedLabel, applying, onAccept, onDismiss };
}
