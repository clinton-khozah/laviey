import { useEffect, useState } from 'react';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import {
  DISCOVER_AGE,
  DISCOVER_DISTANCE_KM,
  DISCOVER_GENDER_OPTIONS,
} from '@/constants/discoverFilter';
import type { DiscoverFilters, DiscoverGender } from '@/types';
import './DiscoverFilterSheet.css';

interface DiscoverFilterSheetProps {
  open: boolean;
  filters: DiscoverFilters;
  onClose: () => void;
  onApply: (filters: DiscoverFilters) => void;
  onReset: () => void;
}

export function DiscoverFilterSheet({
  open,
  filters,
  onClose,
  onApply,
  onReset,
}: DiscoverFilterSheetProps) {
  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  const toggleGender = (id: DiscoverGender) => {
    setDraft((prev) => {
      const has = prev.genders.includes(id);
      const genders = has
        ? prev.genders.filter((g) => g !== id)
        : [...prev.genders, id];
      return { ...prev, genders: genders.length > 0 ? genders : [id] };
    });
  };

  const handleApply = () => {
    const ageMin = Math.min(draft.ageMin, draft.ageMax);
    const ageMax = Math.max(draft.ageMin, draft.ageMax);
    onApply({ ...draft, ageMin, ageMax });
    onClose();
  };

  const handleReset = () => {
    onReset();
    onClose();
  };

  return (
    <ProfileSheet open={open} title="Filters" onClose={onClose} compact hideHandle>
      <div className="discover-filter-sheet">
        <section className="discover-filter-sheet__section">
          <div className="discover-filter-sheet__row">
            <h3 className="discover-filter-sheet__label">Maximum distance</h3>
            <span className="discover-filter-sheet__value">{draft.maxDistanceKm} km</span>
          </div>
          <input
            type="range"
            className="discover-filter-sheet__range"
            min={DISCOVER_DISTANCE_KM.min}
            max={DISCOVER_DISTANCE_KM.max}
            value={draft.maxDistanceKm}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, maxDistanceKm: Number(e.target.value) }))
            }
            aria-label="Maximum distance in kilometers"
          />
          <div className="discover-filter-sheet__range-labels">
            <span>{DISCOVER_DISTANCE_KM.min} km</span>
            <span>{DISCOVER_DISTANCE_KM.max} km</span>
          </div>
        </section>

        <section className="discover-filter-sheet__section">
          <h3 className="discover-filter-sheet__label">Age range</h3>
          <p className="discover-filter-sheet__hint">
            {draft.ageMin} – {draft.ageMax}
          </p>
          <div className="discover-filter-sheet__dual-range">
            <label className="discover-filter-sheet__dual-field">
              <span>Min</span>
              <input
                type="range"
                className="discover-filter-sheet__range"
                min={DISCOVER_AGE.min}
                max={DISCOVER_AGE.max}
                value={draft.ageMin}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    ageMin: Math.min(Number(e.target.value), prev.ageMax),
                  }))
                }
                aria-label="Minimum age"
              />
            </label>
            <label className="discover-filter-sheet__dual-field">
              <span>Max</span>
              <input
                type="range"
                className="discover-filter-sheet__range"
                min={DISCOVER_AGE.min}
                max={DISCOVER_AGE.max}
                value={draft.ageMax}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    ageMax: Math.max(Number(e.target.value), prev.ageMin),
                  }))
                }
                aria-label="Maximum age"
              />
            </label>
          </div>
        </section>

        <section className="discover-filter-sheet__section discover-filter-sheet__section--toggle">
          <div className="discover-filter-sheet__toggle-row">
            <div className="discover-filter-sheet__toggle-text">
              <span className="discover-filter-sheet__label">Only with profile photos</span>
              <span className="discover-filter-sheet__toggle-hint">
                Hide profiles that do not have a profile photo
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draft.hasProfilePhoto}
              aria-label="Only with profile photos"
              className={`discover-filter-sheet__toggle profile-sheet__toggle ${draft.hasProfilePhoto ? 'profile-sheet__toggle--on discover-filter-sheet__toggle--on' : ''}`}
              onClick={() =>
                setDraft((prev) => ({ ...prev, hasProfilePhoto: !prev.hasProfilePhoto }))
              }
            />
          </div>
        </section>

        <section className="discover-filter-sheet__section discover-filter-sheet__section--toggle">
          <div className="discover-filter-sheet__toggle-row">
            <div className="discover-filter-sheet__toggle-text">
              <span className="discover-filter-sheet__label">Verified only</span>
              <span className="discover-filter-sheet__toggle-hint">
                Show people with the blue verified badge
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draft.verifiedOnly}
              aria-label="Verified only"
              className={`discover-filter-sheet__toggle profile-sheet__toggle ${draft.verifiedOnly ? 'profile-sheet__toggle--on discover-filter-sheet__toggle--on' : ''}`}
              onClick={() =>
                setDraft((prev) => ({ ...prev, verifiedOnly: !prev.verifiedOnly }))
              }
            />
          </div>
        </section>

        <section className="discover-filter-sheet__section">
          <div className="discover-filter-sheet__chips">
            {DISCOVER_GENDER_OPTIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`discover-filter-sheet__chip ${draft.genders.includes(id) ? 'discover-filter-sheet__chip--active' : ''}`}
                onClick={() => toggleGender(id)}
                aria-pressed={draft.genders.includes(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <div className="discover-filter-sheet__actions">
          <button type="button" className="discover-filter-sheet__apply" onClick={handleApply}>
            Apply filters
          </button>
          <button type="button" className="discover-filter-sheet__reset" onClick={handleReset}>
            Reset to default
          </button>
        </div>
      </div>
    </ProfileSheet>
  );
}
