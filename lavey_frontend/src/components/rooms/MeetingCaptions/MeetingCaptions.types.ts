import type { MeetingLanguageCode } from '@/constants/meeting/meetingLanguages';

export interface MeetingCaptionsProps {
  displayText: string;
  showTranslationNote: boolean;
  sourceLanguage?: MeetingLanguageCode;
  language: MeetingLanguageCode;
  captionsEnabled: boolean;
  transcriptOpen: boolean;
  onToggleCaptions: () => void;
  onOpenTranscript: () => void;
  onLanguageChange: (code: MeetingLanguageCode) => void;
  t: (key: import('@/constants/meeting/meetingStrings').MeetingStringKey, vars?: Record<string, string>) => string;
}
