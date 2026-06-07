export type MeetingLanguageCode = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'ja' | 'ko' | 'zh';

export const MEETING_LANGUAGE_STORAGE_KEY = 'lavey_meeting_language';

export interface MeetingLanguageOption {
  code: MeetingLanguageCode;
  label: string;
}

export const MEETING_LANGUAGES: MeetingLanguageOption[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
];

export const DEFAULT_MEETING_LANGUAGE: MeetingLanguageCode = 'en';
