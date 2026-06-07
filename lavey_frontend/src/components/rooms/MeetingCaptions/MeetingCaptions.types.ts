import type { MeetingLanguageCode } from '@/constants/meeting/meetingLanguages';
import type { MeetingCaptionLine } from '@/services/mocks/meetingCaptions.mock';

export interface MeetingCaptionsProps {
  line: MeetingCaptionLine | null;
  displayText: string;
  language: MeetingLanguageCode;
  captionsEnabled: boolean;
  onToggleCaptions: () => void;
  onLanguageChange: (code: MeetingLanguageCode) => void;
  t: (key: import('@/constants/meeting/meetingStrings').MeetingStringKey, vars?: Record<string, string>) => string;
}
