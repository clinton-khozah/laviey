import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_MEETING_LANGUAGE,
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

  const setLanguage = useCallback((code: MeetingLanguageCode) => {
    setLanguageState(code);
  }, []);

  return { language, setLanguage };
}
