import { useMemo, useState } from 'react';
import { MAX_PROFILE_INTERESTS, PROFILE_INTERESTS_LIMIT_MESSAGE } from '@/constants/profileInterests';
import type { ProfileInterestItem } from '@/types';
import './ProfileInterestPicker.css';

interface ProfileInterestPickerProps {
  options: ProfileInterestItem[];
  selectedKeys: string[];
  onChange: (keys: string[]) => void;
  minSelections?: number;
  maxSelections?: number;
}

function InterestIcon({ emoji, interestKey }: { emoji: string; interestKey: string }) {
  return (
    <span className="profile-interest-picker__icon" data-interest={interestKey} aria-hidden>
      <span className="profile-interest-picker__icon-emoji">{emoji}</span>
    </span>
  );
}

export function ProfileInterestPicker({
  options,
  selectedKeys,
  onChange,
  minSelections = 1,
  maxSelections = MAX_PROFILE_INTERESTS,
}: ProfileInterestPickerProps) {
  const [expanded, setExpanded] = useState(false);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);

  const atMax = selectedKeys.length >= maxSelections;

  const optionMap = useMemo(
    () => new Map(options.map((opt) => [opt.key, opt])),
    [options],
  );

  const selected = selectedKeys
    .map((key) => optionMap.get(key))
    .filter((item): item is ProfileInterestItem => Boolean(item));

  const available = options.filter((opt) => !selectedKeys.includes(opt.key));

  const toggleKey = (key: string) => {
    if (selectedKeys.includes(key)) {
      onChange(selectedKeys.filter((k) => k !== key));
      setLimitMessage(null);
      return;
    }
    if (selectedKeys.length >= maxSelections) {
      setLimitMessage(PROFILE_INTERESTS_LIMIT_MESSAGE);
      return;
    }
    setLimitMessage(null);
    onChange([...selectedKeys, key]);
  };

  return (
    <div className="profile-interest-picker">
      <div className="profile-interest-picker__selected">
        {selected.length === 0 ? (
          <p className="profile-interest-picker__empty">Pick interests from your onboarding quiz.</p>
        ) : (
          selected.map((item) => (
            <button
              key={item.key}
              type="button"
              className="profile-interest-picker__chip profile-interest-picker__chip--active"
              onClick={() => toggleKey(item.key)}
              aria-label={`Remove ${item.label}`}
            >
              <InterestIcon emoji={item.emoji} interestKey={item.key} />
              <span className="profile-interest-picker__chip-label">{item.label}</span>
              <span className="profile-interest-picker__chip-remove" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </span>
            </button>
          ))
        )}
      </div>

      <button
        type="button"
        className="profile-interest-picker__toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {expanded ? 'Hide options' : 'Add more'}
      </button>

      {expanded && (
        <div className="profile-interest-picker__grid" role="listbox" aria-label="Interest options">
          {available.length === 0 ? (
            <p className="profile-interest-picker__empty">All quiz interests selected.</p>
          ) : (
            available.map((item) => (
              <button
                key={item.key}
                type="button"
                role="option"
                className={`profile-interest-picker__option ${atMax ? 'profile-interest-picker__option--disabled' : ''}`}
                aria-disabled={atMax}
                onClick={() => toggleKey(item.key)}
              >
                <InterestIcon emoji={item.emoji} interestKey={item.key} />
                <span className="profile-interest-picker__option-label">{item.label}</span>
              </button>
            ))
          )}
        </div>
      )}

      {limitMessage && (
        <p className="profile-interest-picker__limit" role="alert">
          {limitMessage}
        </p>
      )}

      <p className="profile-interest-picker__hint">
        {selectedKeys.length} of {maxSelections} selected
        {minSelections ? ` · ${minSelections} minimum` : ''}
      </p>
    </div>
  );
}
