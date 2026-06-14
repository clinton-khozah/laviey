import { useState } from 'react';
import {
  MEETING_LANGUAGES,
  type MeetingLanguageCode,
} from '@/constants/meeting/meetingLanguages';
import { sourceLanguageLabel } from '@/constants/meeting/meetingStrings';
import type { MeetingCaptionsProps } from './MeetingCaptions.types';
import './MeetingCaptions.css';

function CcIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M7 10h2a1.5 1.5 0 100-3H7v6M14 10h2.5a1.5 1.5 0 100-3H14v6" />
    </svg>
  );
}

function TranscriptIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h6" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  );
}

export function MeetingCaptions({
  displayText,
  showTranslationNote,
  sourceLanguage,
  language,
  captionsEnabled,
  transcriptOpen,
  onToggleCaptions,
  onOpenTranscript,
  onLanguageChange,
  t,
}: MeetingCaptionsProps) {
  const [langOpen, setLangOpen] = useState(false);

  return (
    <>
      <div className="meeting-captions__toolbar">
        <button
          type="button"
          className={`meeting-captions__icon-btn ${captionsEnabled ? 'meeting-captions__icon-btn--on' : ''}`}
          onClick={onToggleCaptions}
          aria-label={captionsEnabled ? t('captionsOn') : t('captionsOff')}
          aria-pressed={captionsEnabled}
        >
          <CcIcon />
        </button>
        <button
          type="button"
          className={`meeting-captions__icon-btn ${transcriptOpen ? 'meeting-captions__icon-btn--on' : ''}`}
          onClick={onOpenTranscript}
          aria-label={t('openTranscript')}
          aria-pressed={transcriptOpen}
        >
          <TranscriptIcon />
        </button>
        <div className="meeting-captions__lang-wrap">
          <button
            type="button"
            className={`meeting-captions__icon-btn ${langOpen ? 'meeting-captions__icon-btn--on' : ''}`}
            onClick={() => setLangOpen((o) => !o)}
            aria-expanded={langOpen}
            aria-haspopup="listbox"
            aria-label={t('captionLanguage')}
          >
            <GlobeIcon />
          </button>
          {langOpen && (
            <>
              <button
                type="button"
                className="meeting-captions__backdrop"
                onClick={() => setLangOpen(false)}
                aria-label="Close language menu"
              />
              <ul className="meeting-captions__lang-menu" role="listbox" aria-label={t('captionLanguage')}>
                {MEETING_LANGUAGES.map((opt) => (
                  <li key={opt.code} role="option" aria-selected={opt.code === language}>
                    <button
                      type="button"
                      onClick={() => {
                        onLanguageChange(opt.code as MeetingLanguageCode);
                        setLangOpen(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {captionsEnabled && displayText && (
        <div className="meeting-captions__display" role="status" aria-live="polite">
          <p className="meeting-captions__text">{displayText}</p>
          {showTranslationNote && sourceLanguage && (
            <p className="meeting-captions__source">
              {t('autoTranslatedFrom', { lang: sourceLanguageLabel(sourceLanguage) })}
            </p>
          )}
        </div>
      )}
    </>
  );
}
