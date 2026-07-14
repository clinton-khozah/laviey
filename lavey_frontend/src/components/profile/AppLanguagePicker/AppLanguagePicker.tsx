import { MEETING_LANGUAGES, type MeetingLanguageCode } from '@/constants/meeting/meetingLanguages';
import './AppLanguagePicker.css';

interface AppLanguagePickerProps {
  value: MeetingLanguageCode;
  onChange: (code: MeetingLanguageCode) => void;
}

export function AppLanguagePicker({ value, onChange }: AppLanguagePickerProps) {
  const selected = MEETING_LANGUAGES.find((option) => option.code === value) ?? MEETING_LANGUAGES[0];

  return (
    <div className="app-language-picker">
      <label className="app-language-picker__label" htmlFor="app-language-select">Language</label>
      <div className="app-language-picker__control" data-no-translate>
        <span className="app-language-picker__globe" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3Z" />
          </svg>
        </span>
        <span className="app-language-picker__value" aria-hidden>{selected.label}</span>
        <select
          id="app-language-select"
          className="app-language-picker__select"
          value={value}
          onChange={(event) => onChange(event.target.value as MeetingLanguageCode)}
          aria-label="App language"
        >
          {MEETING_LANGUAGES.map((option) => (
            <option key={option.code} value={option.code}>{option.label}</option>
          ))}
        </select>
        <span className="app-language-picker__chevron" aria-hidden>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m5 7 5 5 5-5" />
          </svg>
        </span>
      </div>
      <span className="app-language-picker__hint">AI translation applies across the app after you save.</span>
    </div>
  );
}
