import { useEffect, useRef } from 'react';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import {
  MEETING_LANGUAGES,
  type MeetingLanguageCode,
} from '@/constants/meeting/meetingLanguages';
import { sourceLanguageLabel } from '@/constants/meeting/meetingStrings';
import type { MeetingTranscriptEntry } from '@/types';
import './MeetingLiveTranscriptModal.css';

interface MeetingLiveTranscriptModalProps {
  open: boolean;
  entries: MeetingTranscriptEntry[];
  targetLanguage: MeetingLanguageCode;
  isListening: boolean;
  isProcessing: boolean;
  error: string | null;
  onClose: () => void;
  onLanguageChange: (code: MeetingLanguageCode) => void;
  onClear: () => void;
  formatTime: (iso: string) => string;
  t: (key: import('@/constants/meeting/meetingStrings').MeetingStringKey, vars?: Record<string, string>) => string;
}

export function MeetingLiveTranscriptModal({
  open,
  entries,
  targetLanguage,
  isListening,
  isProcessing,
  error,
  onClose,
  onLanguageChange,
  onClear,
  formatTime,
  t,
}: MeetingLiveTranscriptModalProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.scrollTop = 0;
  }, [open, entries.length]);

  return (
    <ProfileSheet
      open={open}
      title={t('liveTranscript')}
      onClose={onClose}
      compact
      hideHandle
      headerAction={
        entries.length > 0 ? (
          <button type="button" className="meeting-transcript-modal__clear" onClick={onClear}>
            {t('clearTranscript')}
          </button>
        ) : null
      }
    >
      <div className="meeting-transcript-modal">
        <div className="meeting-transcript-modal__hero">
          <div className="meeting-transcript-modal__status-row">
            <span
              className={`meeting-transcript-modal__live-dot ${isListening ? 'meeting-transcript-modal__live-dot--on' : ''}`}
              aria-hidden
            />
            <span className="meeting-transcript-modal__status">
              {isListening ? t('listeningForSpeech') : t('captionsPaused')}
            </span>
            {isProcessing && (
              <span className="meeting-transcript-modal__processing">{t('transcribing')}</span>
            )}
          </div>
          <p className="meeting-transcript-modal__lead">{t('liveTranscriptLead')}</p>
          <div className="meeting-transcript-modal__badge" aria-label="Powered by Hugging Face AI">
            <span>🤗</span>
            <span>Hugging Face · Whisper + translation</span>
          </div>
        </div>

        <label className="meeting-transcript-modal__lang-label" htmlFor="meeting-transcript-lang">
          {t('captionLanguage')}
        </label>
        <select
          id="meeting-transcript-lang"
          className="meeting-transcript-modal__lang-select"
          value={targetLanguage}
          onChange={(e) => onLanguageChange(e.target.value as MeetingLanguageCode)}
        >
          {MEETING_LANGUAGES.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.label}
            </option>
          ))}
        </select>

        {error && (
          <p className="meeting-transcript-modal__error" role="alert">
            {error}
          </p>
        )}

        <div ref={listRef} className="meeting-transcript-modal__list" aria-live="polite">
          {entries.length === 0 ? (
            <div className="meeting-transcript-modal__empty">
              <span className="meeting-transcript-modal__empty-icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </span>
              <p>{t('transcriptEmpty')}</p>
            </div>
          ) : (
            entries.map((entry) => {
              const showOriginal =
                entry.detectedLanguage !== targetLanguage &&
                entry.detectedLanguage !== 'unknown' &&
                entry.originalText !== entry.translatedText;

              return (
                <article key={entry.id} className="meeting-transcript-modal__entry">
                  <header className="meeting-transcript-modal__entry-meta">
                    <time dateTime={entry.createdAt}>{formatTime(entry.createdAt)}</time>
                    {entry.detectedLanguage !== 'unknown' && entry.detectedLanguage !== targetLanguage && (
                      <span>
                        {t('autoTranslatedFrom', {
                          lang: sourceLanguageLabel(entry.detectedLanguage as MeetingLanguageCode),
                        })}
                      </span>
                    )}
                  </header>
                  <p className="meeting-transcript-modal__entry-text">{entry.translatedText}</p>
                  {showOriginal && (
                    <p className="meeting-transcript-modal__entry-original">{entry.originalText}</p>
                  )}
                </article>
              );
            })
          )}
        </div>
      </div>
    </ProfileSheet>
  );
}
