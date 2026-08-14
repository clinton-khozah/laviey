import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MeetingChatMessage } from "../types";

const STORAGE_PREFIX = "@lavey/meetup-chat:";
const MAX_STORED = 120;

function storageKey(meetupId: string): string {
  return `${STORAGE_PREFIX}${meetupId}`;
}

/** Mirrors lavey_frontend's meetupChatStorage.ts (localStorage) using AsyncStorage instead. */
export async function readMeetupChat(meetupId: string): Promise<MeetingChatMessage[]> {
  if (!meetupId) return [];
  try {
    const raw = await AsyncStorage.getItem(storageKey(meetupId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MeetingChatMessage[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item?.id && item.text && item.fromUserId).slice(-MAX_STORED);
  } catch {
    return [];
  }
}

export async function writeMeetupChat(meetupId: string, messages: MeetingChatMessage[]): Promise<void> {
  if (!meetupId) return;
  try {
    await AsyncStorage.setItem(storageKey(meetupId), JSON.stringify(messages.slice(-MAX_STORED)));
  } catch {
    // ignore quota
  }
}
