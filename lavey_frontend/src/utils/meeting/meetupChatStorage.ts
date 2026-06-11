import type { MeetingChatMessage } from '@/types';

const STORAGE_PREFIX = 'lavey:meetup-chat:';
const MAX_STORED = 120;

function storageKey(meetupId: string): string {
  return `${STORAGE_PREFIX}${meetupId}`;
}

export function readMeetupChat(meetupId: string): MeetingChatMessage[] {
  if (!meetupId) return [];
  try {
    const raw = localStorage.getItem(storageKey(meetupId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MeetingChatMessage[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item?.id && item.text && item.fromUserId)
      .slice(-MAX_STORED);
  } catch {
    return [];
  }
}

export function writeMeetupChat(meetupId: string, messages: MeetingChatMessage[]): void {
  if (!meetupId) return;
  try {
    localStorage.setItem(storageKey(meetupId), JSON.stringify(messages.slice(-MAX_STORED)));
  } catch {
    /* ignore quota */
  }
}
