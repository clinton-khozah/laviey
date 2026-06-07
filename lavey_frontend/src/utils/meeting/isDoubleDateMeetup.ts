import type { OnlineDate } from '@/types';

export function isDoubleDateMeetup(date: OnlineDate): boolean {
  const hasTag = date.tags.some((t) => t.toLowerCase() === 'double');
  const titleMatch = /double\s*date/i.test(date.title);
  return hasTag || titleMatch;
}
