import { useMemo, useState } from 'react';
import type { CompanyHoliday } from '@/services/admin/adminHrService';
import './AdminHolidayCalendar.css';

interface AdminHolidayCalendarProps {
  holidays: CompanyHoliday[];
  onAdd: (date: string, label: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function todayKey(): string {
  const now = new Date();
  return toDateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

export function AdminHolidayCalendar({ holidays, onAdd, onRemove }: AdminHolidayCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const holidayByDate = useMemo(() => {
    const map = new Map<string, CompanyHoliday>();
    holidays.forEach((holiday) => map.set(holiday.date, holiday));
    return map;
  }, [holidays]);

  const upcoming = useMemo(
    () => holidays.filter((holiday) => holiday.date >= todayKey()).sort((a, b) => a.date.localeCompare(b.date)),
    [holidays],
  );

  const cells = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startOffset = firstOfMonth.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const items: Array<{ day: number; dateKey: string } | null> = [];
    for (let i = 0; i < startOffset; i += 1) items.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      items.push({ day, dateKey: toDateKey(viewYear, viewMonth, day) });
    }
    return items;
  }, [viewYear, viewMonth]);

  const changeMonth = (delta: number) => {
    setPendingDate(null);
    setFormError('');
    let nextMonth = viewMonth + delta;
    let nextYear = viewYear;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    } else if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    setViewMonth(nextMonth);
    setViewYear(nextYear);
  };

  const handleDayClick = (dateKey: string) => {
    setFormError('');
    if (holidayByDate.has(dateKey)) return;
    setPendingDate(dateKey);
    setLabelDraft('');
  };

  const submitOffDay = async () => {
    if (!pendingDate) return;
    setSaving(true);
    setFormError('');
    try {
      await onAdd(pendingDate, labelDraft.trim() || 'Company off day');
      setPendingDate(null);
      setLabelDraft('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not add off day');
    } finally {
      setSaving(false);
    }
  };

  const removeOffDay = async (id: string) => {
    setRemovingId(id);
    try {
      await onRemove(id);
    } finally {
      setRemovingId(null);
    }
  };

  const todayStamp = todayKey();

  return (
    <div className="admin-holiday-cal">
      <div className="admin-holiday-cal__grid-wrap">
        <div className="admin-holiday-cal__head">
          <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month">
            ‹
          </button>
          <strong>{MONTH_NAMES[viewMonth]} {viewYear}</strong>
          <button type="button" onClick={() => changeMonth(1)} aria-label="Next month">
            ›
          </button>
        </div>

        <div className="admin-holiday-cal__weekdays">
          {WEEKDAYS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>

        <div className="admin-holiday-cal__days">
          {cells.map((cell, idx) => {
            if (!cell) return <span key={`empty-${idx}`} className="admin-holiday-cal__day admin-holiday-cal__day--blank" />;
            const holiday = holidayByDate.get(cell.dateKey);
            const isToday = cell.dateKey === todayStamp;
            const isSelected = pendingDate === cell.dateKey;
            return (
              <button
                key={cell.dateKey}
                type="button"
                className={[
                  'admin-holiday-cal__day',
                  holiday ? 'is-off' : '',
                  isToday ? 'is-today' : '',
                  isSelected ? 'is-selected' : '',
                ].filter(Boolean).join(' ')}
                title={holiday ? holiday.label : 'Mark as company off day'}
                onClick={() => handleDayClick(cell.dateKey)}
              >
                {cell.day}
              </button>
            );
          })}
        </div>

        {pendingDate ? (
          <form
            className="admin-holiday-cal__form"
            onSubmit={(e) => {
              e.preventDefault();
              void submitOffDay();
            }}
          >
            <span>{pendingDate}</span>
            <input
              placeholder="Off day label (e.g. Public holiday)"
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              autoFocus
            />
            <div className="admin-holiday-cal__form-actions">
              <button type="button" onClick={() => setPendingDate(null)} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="is-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Mark off day'}
              </button>
            </div>
            {formError ? <p className="admin-holiday-cal__error">{formError}</p> : null}
          </form>
        ) : null}
      </div>

      <div className="admin-holiday-cal__list">
        <strong>Upcoming off days</strong>
        {upcoming.length ? (
          <ul>
            {upcoming.map((holiday) => (
              <li key={holiday.id}>
                <span className="admin-holiday-cal__list-date">{holiday.date}</span>
                <span className="admin-holiday-cal__list-label">{holiday.label}</span>
                <button
                  type="button"
                  aria-label={`Remove ${holiday.date} off day`}
                  disabled={removingId === holiday.id}
                  onClick={() => void removeOffDay(holiday.id)}
                >
                  {removingId === holiday.id ? '…' : '×'}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="admin-holiday-cal__empty">No upcoming global off days set.</p>
        )}
      </div>
    </div>
  );
}
