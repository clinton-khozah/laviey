import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { translationApi, type AppLanguageCode } from "../api/services";

/**
 * Translates a screen's curated list of static English strings into the given language,
 * caching results in AsyncStorage per language so repeat app opens never re-hit the API.
 * Fails open to the original English strings on any error — a translation hiccup should
 * never leave a screen blank or partially rendered.
 */
export function useTranslatedStrings(englishStrings: readonly string[], language: AppLanguageCode) {
  const [translated, setTranslated] = useState<string[]>(() => englishStrings.slice());
  const stringsKey = englishStrings.join("");

  useEffect(() => {
    if (language === "en") {
      setTranslated(englishStrings.slice());
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

      const missing = englishStrings.filter((s) => !(s in cached));
      if (missing.length) {
        try {
          const results = await translationApi.translateUi(missing, language);
          missing.forEach((s, i) => {
            if (results[i]) cached[s] = results[i];
          });
          void AsyncStorage.setItem(cacheKey, JSON.stringify(cached));
        } catch {
          // Fail open — untranslated strings just fall back to English below.
        }
      }

      if (!cancelled) setTranslated(englishStrings.map((s) => cached[s] ?? s));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, stringsKey]);

  const indexOf = useRef(new Map(englishStrings.map((s, i) => [s, i])));
  indexOf.current = new Map(englishStrings.map((s, i) => [s, i]));

  const t = (english: string): string => {
    const index = indexOf.current.get(english);
    return index === undefined ? english : (translated[index] ?? english);
  };

  return { t, strings: translated };
}
