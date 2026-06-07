import { useEffect, useState } from 'react';
import type { MeetingLanguageCode } from '@/constants/meeting/meetingLanguages';
import {
  getCaptionText,
  MOCK_MEETING_CAPTIONS,
  type MeetingCaptionLine,
} from '@/services/mocks/meetingCaptions.mock';

const ROTATE_MS = 4500;

export function useMeetingCaptions(enabled: boolean, language: MeetingLanguageCode) {
  const [index, setIndex] = useState(0);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);

  useEffect(() => {
    if (!enabled || !captionsEnabled) return;

    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % MOCK_MEETING_CAPTIONS.length);
    }, ROTATE_MS);

    return () => window.clearInterval(id);
  }, [enabled, captionsEnabled]);

  const line: MeetingCaptionLine | null =
    enabled && captionsEnabled ? MOCK_MEETING_CAPTIONS[index] : null;

  const displayText = line ? getCaptionText(line, language) : '';

  return {
    line,
    displayText,
    captionsEnabled,
    setCaptionsEnabled,
    toggleCaptions: () => setCaptionsEnabled((v) => !v),
  };
}
