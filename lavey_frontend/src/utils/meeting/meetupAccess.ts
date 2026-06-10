import { MOCK_CONVERSATIONS } from '@/services/mocks/message.mock';
import type { Conversation, OnlineDate } from '@/types';

const ACCEPTED_CODES_KEY = 'lavey_accepted_meetup_codes';

export function normalizeMeetupCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Conversations with an established match — only these can receive invites. */
export function getMatchedConversations(): Conversation[] {
  return MOCK_CONVERSATIONS.filter((conversation) => Boolean(conversation.matchedAt));
}

export function isMatchedProfile(profileId: string): boolean {
  return getMatchedConversations().some(
    (conversation) => conversation.participantProfileId === profileId,
  );
}

export function getMatchedConversation(profileId: string): Conversation | undefined {
  return getMatchedConversations().find(
    (conversation) => conversation.participantProfileId === profileId,
  );
}

export function readAcceptedMeetupCodes(): Set<string> {
  try {
    const raw = localStorage.getItem(ACCEPTED_CODES_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((code) => normalizeMeetupCode(String(code))));
  } catch {
    return new Set();
  }
}

export function markMeetupCodeAccepted(code: string): void {
  const normalized = normalizeMeetupCode(code);
  const codes = readAcceptedMeetupCodes();
  codes.add(normalized);
  try {
    localStorage.setItem(ACCEPTED_CODES_KEY, JSON.stringify([...codes]));
  } catch {
    /* ignore */
  }
}

export function canBrowseMeetup(
  date: OnlineDate,
  options: { hostedDateIds?: Set<string>; acceptedDateIds?: Set<string> } = {},
): boolean {
  if (date.visibility === 'public') return true;
  if (date.isHostedByYou) return true;
  if (options.hostedDateIds?.has(date.id)) return true;
  if (options.acceptedDateIds?.has(date.id)) return true;
  return false;
}

export function canJoinMeetup(
  date: OnlineDate,
  acceptedCodes: Set<string>,
): boolean {
  if (date.visibility === 'public') return true;
  if (date.isHostedByYou) return true;
  return acceptedCodes.has(normalizeMeetupCode(date.accessCode));
}
