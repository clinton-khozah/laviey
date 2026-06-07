import { MEETING_LANGUAGES, type MeetingLanguageCode } from '@/constants/meeting/meetingLanguages';
import './AppLanguagePicker.css';

interface AppLanguagePickerProps {
  value: MeetingLanguageCode;
  onChange: (code: MeetingLanguageCode) => void;
}

export function AppLanguagePicker({ value, onChange }: AppLanguagePickerProps) {
  return (
    <div className="app-language-picker">
      <span className="app-language-picker__label">Language</span>
      <ul className="app-language-picker__list" role="listbox" aria-label="App language">
        {MEETING_LANGUAGES.map((opt) => {
          const selected = opt.code === value;
          return (
            <li key={opt.code}>
              <button
                type="button"
                role="option"
                aria-selected={selected}
                className={`app-language-picker__option ${selected ? 'app-language-picker__option--active' : ''}`}
                onClick={() => onChange(opt.code)}
              >
                <span className="app-language-picker__name">{opt.label}</span>
                {selected && (
                  <span className="app-language-picker__check" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
