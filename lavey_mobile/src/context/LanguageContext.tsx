import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { settingsApi, type AppLanguageCode } from "../api/services";
import { useAuth } from "../hooks/useAuth";
import { isSpokenLanguage } from "../i18n/spokenLanguages";
import { storage } from "../utils/storage";

type LanguageValue = {
  language: AppLanguageCode;
  setLanguage(code: AppLanguageCode): Promise<void>;
};

const LanguageContext = createContext<LanguageValue | null>(null);

function asLanguage(value: string | null): AppLanguageCode | null {
  if (!value) return null;
  if (isSpokenLanguage(value)) return value;
  if (value === "de" || value === "ja" || value === "ko" || value === "af" || value === "zu" || value === "xh" || value === "st") {
    return value;
  }
  return null;
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [language, setLanguageState] = useState<AppLanguageCode>("en");
  const [ready, setReady] = useState(false);
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    void storage.getUiLanguage().then((saved) => {
      const code = asLanguage(saved);
      if (code) setLanguageState(code);
      setReady(true);
    });
  }, []);

  const setLanguage = useCallback(async (code: AppLanguageCode) => {
    const previous = language;
    setLanguageState(code);
    await storage.setUiLanguage(code);
    if (!session) {
      await storage.setGuestLanguageChoice(code);
      return;
    }
    try {
      await settingsApi.update({ language: code });
      await storage.clearGuestLanguageChoice();
    } catch (error) {
      setLanguageState(previous);
      await storage.setUiLanguage(previous);
      throw error;
    }
  }, [language, session]);

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      syncedFor.current = null;
      return;
    }
    if (syncedFor.current === session.user.id) return;
    syncedFor.current = session.user.id;
    let cancelled = false;
    void (async () => {
      const guest = asLanguage(await storage.getGuestLanguageChoice());
      if (guest) {
        try {
          await settingsApi.update({ language: guest });
          await storage.clearGuestLanguageChoice();
          await storage.setUiLanguage(guest);
          if (!cancelled) setLanguageState(guest);
        } catch {
          syncedFor.current = null;
        }
        return;
      }
      try {
        const settings = await settingsApi.get();
        const saved = asLanguage(settings.language);
        if (!saved || cancelled) return;
        setLanguageState(saved);
        await storage.setUiLanguage(saved);
      } catch {
        syncedFor.current = null;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, session]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used within LanguageProvider");
  return value;
}
