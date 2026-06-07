import { pickMockFeedImagePath } from '../data/mockMedia.js';
import {
  MOCK_DATE_INVITES,
  MOCK_ONLINE_DATES,
  type DateInviteDto,
  type MeetingJoinResultDto,
  type OnlineDateDto,
} from '../data/mockOnlineDates.js';
import { AppError } from '../utils/appError.js';

const onlineDates: OnlineDateDto[] = MOCK_ONLINE_DATES.map((d) => ({ ...d }));
const dateInvites: DateInviteDto[] = MOCK_DATE_INVITES.map((i) => ({ ...i }));

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function findDateById(id: string): OnlineDateDto | undefined {
  return onlineDates.find((d) => d.id === id);
}

function findDateByCode(code: string): OnlineDateDto | undefined {
  const normalized = normalizeCode(code);
  return onlineDates.find((d) => normalizeCode(d.accessCode) === normalized);
}

function buildJoinResult(date: OnlineDateDto): MeetingJoinResultDto {
  return {
    joinUrl: `#meet-${date.id}`,
    date: { ...date },
  };
}

export function listOnlineDates(): OnlineDateDto[] {
  return onlineDates.map((d) => ({ ...d }));
}

export function listDateInvites(): DateInviteDto[] {
  return dateInvites.filter((i) => i.status === 'pending').map((i) => ({ ...i }));
}

export function joinOnlineDate(dateId: string, accessCode: string): MeetingJoinResultDto {
  const date = findDateById(dateId);
  if (!date) {
    throw new AppError(404, 'DATE_NOT_FOUND', 'Meetup not found');
  }
  if (normalizeCode(accessCode) !== normalizeCode(date.accessCode)) {
    throw new AppError(400, 'INVALID_ACCESS_CODE', 'Invalid access code');
  }
  return buildJoinResult(date);
}

export function joinOnlineDateByCode(accessCode: string): MeetingJoinResultDto {
  const date = findDateByCode(accessCode);
  if (!date) {
    throw new AppError(404, 'DATE_NOT_FOUND', 'No meeting found for that code');
  }
  return buildJoinResult(date);
}

export interface CreateDateInput {
  title: string;
  topic: string;
  visibility: 'public' | 'private';
  mode: 'post' | 'invite';
  inviteToName?: string;
  startsInMinutes: number;
}

function generateAccessCode(): string {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${part()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function createOnlineDate(input: CreateDateInput): OnlineDateDto {
  const code = generateAccessCode();
  const created: OnlineDateDto = {
    id: `new-${Date.now()}`,
    title: input.title,
    topic: input.topic,
    hostName: 'You',
    hostAvatar: '',
    status: input.startsInMinutes <= 15 ? 'starting-soon' : 'scheduled',
    visibility: input.visibility,
    accessCode: code,
    participantCount: input.mode === 'invite' ? 0 : 1,
    maxParticipants: input.visibility === 'private' ? 2 : 16,
    startsInMinutes: input.startsInMinutes,
    coverImage: pickMockFeedImagePath(2),
    tags: input.visibility === 'private' ? ['Private'] : ['New'],
    isHostedByYou: true,
  };
  onlineDates.unshift(created);
  return { ...created };
}

export function respondToDateInvite(
  inviteId: string,
  action: 'accept' | 'decline',
): DateInviteDto {
  const invite = dateInvites.find((i) => i.id === inviteId);
  if (!invite) {
    throw new AppError(404, 'INVITE_NOT_FOUND', 'Invite not found');
  }
  invite.status = action === 'accept' ? 'accepted' : 'declined';
  return { ...invite };
}
