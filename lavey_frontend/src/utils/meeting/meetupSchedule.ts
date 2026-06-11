export const MEETUP_AUTO_DELETE_HOURS = 24;
export const MEETUP_SCHEDULE_MAX_DAYS = 7;

export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function defaultMeetupStartLocal(addMinutes = 15): string {
  return toDatetimeLocalValue(new Date(Date.now() + addMinutes * 60_000));
}

export function minMeetupStartLocal(): string {
  return toDatetimeLocalValue(new Date(Date.now() + 5 * 60_000));
}

export function maxMeetupStartLocal(): string {
  return toDatetimeLocalValue(
    new Date(Date.now() + MEETUP_SCHEDULE_MAX_DAYS * 24 * 60 * 60_000),
  );
}

export function parseDatetimeLocal(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function startsInMinutesFromLocal(value: string): number {
  const target = parseDatetimeLocal(value);
  if (!target) return 15;
  return Math.max(1, Math.ceil((target.getTime() - Date.now()) / 60_000));
}

export function formatMeetupScheduledLabel(startsAtIso: string, now = Date.now()): string {
  const startsAt = new Date(startsAtIso);
  if (Number.isNaN(startsAt.getTime())) return 'Scheduled';

  const diffMin = Math.ceil((startsAt.getTime() - now) / 60_000);
  if (diffMin <= 0) return 'Live now';
  if (diffMin <= 15) return 'Starting soon';
  if (diffMin < 60) return `In ${diffMin} min`;

  const nowDate = new Date(now);
  const today = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
  const targetDay = new Date(startsAt.getFullYear(), startsAt.getMonth(), startsAt.getDate());
  const dayDiff = Math.round((targetDay.getTime() - today.getTime()) / 86_400_000);
  const timeStr = startsAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (dayDiff === 0) return `Today · ${timeStr}`;
  if (dayDiff === 1) return `Tomorrow · ${timeStr}`;
  return `${startsAt.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · ${timeStr}`;
}

export function isMeetupExpired(startsAtIso: string, now = Date.now()): boolean {
  const startsAt = new Date(startsAtIso).getTime();
  if (Number.isNaN(startsAt)) return true;
  return now >= startsAt + MEETUP_AUTO_DELETE_HOURS * 60 * 60_000;
}
