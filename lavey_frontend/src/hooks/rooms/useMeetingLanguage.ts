import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_MEETING_LANGUAGE,
  MEETING_LANGUAGE_CHANGE_EVENT,
  MEETING_LANGUAGE_STORAGE_KEY,
  type MeetingLanguageCode,
} from '@/constants/meeting/meetingLanguages';

function readStoredLanguage(): MeetingLanguageCode {
  try {
    const stored = localStorage.getItem(MEETING_LANGUAGE_STORAGE_KEY);
    if (stored && ['en', 'es', 'fr', 'de', 'pt', 'ja', 'ko', 'zh'].includes(stored)) {
      return stored as MeetingLanguageCode;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_MEETING_LANGUAGE;
}

export function useMeetingLanguage() {
  const [language, setLanguageState] = useState<MeetingLanguageCode>(readStoredLanguage);

  useEffect(() => {
    try {
      localStorage.setItem(MEETING_LANGUAGE_STORAGE_KEY, language);
    } catch {
      /* ignore */
    }
  }, [language]);

  useEffect(() => {
    const syncLanguage = (event: Event) => {
      const next = (event as CustomEvent<MeetingLanguageCode>).detail;
      if (next) setLanguageState(next);
    };
    window.addEventListener(MEETING_LANGUAGE_CHANGE_EVENT, syncLanguage);
    return () => window.removeEventListener(MEETING_LANGUAGE_CHANGE_EVENT, syncLanguage);
  }, []);

  const setLanguage = useCallback((code: MeetingLanguageCode) => {
    setLanguageState(code);
    window.dispatchEvent(new CustomEvent(MEETING_LANGUAGE_CHANGE_EVENT, { detail: code }));
  }, []);

  return { language, setLanguage };
}
