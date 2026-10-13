import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { translationApi, type AppLanguageCode } from "../api/services";
import { useLanguage } from "../context/LanguageContext";
import { hasUiPhrase, translatePhrase } from "../i18n/uiDictionary";

/**
 * Translates a screen's curated list of static English strings into the given language,
 * caching results in AsyncStorage per language so repeat app opens never re-hit the API.
 * Fails open to the original English strings on any error — a translation hiccup should
 * never leave a screen blank or partially rendered.
 */
function applyKnownPhrases(englishStrings: readonly string[], language: AppLanguageCode, extras: Record<string, string> = {}) {
  return englishStrings.map((text) => extras[text] ?? translatePhrase(language, text));
}

export function useTranslatedStrings(englishStrings: readonly string[], language: AppLanguageCode) {
  const stringsKey = englishStrings.join("\u0001");
  const [extras, setExtras] = useState<Record<string, string>>({});

  useEffect(() => {
    if (language === "en") {
      setExtras({});
      return;
    }
    const missing = englishStrings.filter((text) => !hasUiPhrase(language, text));
    if (!missing.length) {
      setExtras({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const cacheKey = `@lavey/ui-translations/${language}`;
      let cached: Record<string, string> = {};
      try {
        const raw = await AsyncStorage.getItem(cacheKey);
        if (raw) cached = JSON.parse(raw) as Record<string, string>;
      } catch {
        cached = {};
      }
      const stillMissing = missing.filter((text) => !(text in cached));
      if (stillMissing.length) {
        try {
          const results = await translationApi.translateUi(stillMissing, language);
          stillMissing.forEach((text, index) => {
            if (results[index]) cached[text] = results[index];
          });
          void AsyncStorage.setItem(cacheKey, JSON.stringify(cached));
        } catch {
          // Known phrases stay translated. Anything still missing stays English.
        }
      }
      if (!cancelled) {
        const next: Record<string, string> = {};
        missing.forEach((text) => {
          if (cached[text]) next[text] = cached[text];
        });
        setExtras(next);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, stringsKey]);

  const strings = applyKnownPhrases(englishStrings, language, extras);
  const t = (english: string): string => extras[english] ?? translatePhrase(language, english);
  return { t, strings };
}

export function useT() {
  const { language } = useLanguage();
  return useCallback((english: string) => translatePhrase(language, english), [language]);
}













