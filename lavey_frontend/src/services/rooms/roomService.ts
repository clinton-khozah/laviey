import { env } from '@/config/env';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { pickMockFeedImage } from '@/constants/mockMedia';
import { httpClient } from '@/services/api/httpClient';
import { MOCK_DATE_INVITES } from '@/services/mocks/room.mock';
import { MOCK_ONLINE_DATES } from '@/services/mocks/room.mock';
import type {
  ApiResponse,
  CreateDateInput,
  DateInvite,
  MeetingJoinResult,
  OnlineDate,
} from '@/types';
import { sleep } from '@/utils/sleep';

function generateAccessCode(): string {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${part()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export const roomService = {
  async getOnlineDates(): Promise<OnlineDate[]> {
    if (env.useMockApi) {
      await sleep(350);
      return [...MOCK_ONLINE_DATES];
    }
    const res = await httpClient.get<ApiResponse<OnlineDate[]>>(API_ENDPOINTS.rooms.list);
    return res.data;
  },

  async getDateInvites(): Promise<DateInvite[]> {
    if (env.useMockApi) {
      await sleep(200);
      return MOCK_DATE_INVITES.filter((i) => i.status === 'pending');
    }
    const res = await httpClient.get<ApiResponse<DateInvite[]>>('/dates/invites');
    return res.data;
  },

  async joinDate(dateId: string, accessCode: string): Promise<MeetingJoinResult> {
    if (env.useMockApi) {
      await sleep(400);
      const date = MOCK_ONLINE_DATES.find((d) => d.id === dateId);
      if (!date) throw new Error('Date not found');
      if (accessCode.trim().toUpperCase() !== date.accessCode) {
        throw new Error('Invalid access code');
      }
      return { joinUrl: `#meet-${dateId}`, date };
    }
    const res = await httpClient.post<ApiResponse<MeetingJoinResult>>(
      API_ENDPOINTS.rooms.join(dateId),
      { body: { accessCode } },
    );
    return res.data;
  },

  async joinByCode(accessCode: string): Promise<MeetingJoinResult> {
    if (env.useMockApi) {
      await sleep(400);
      const code = accessCode.trim().toUpperCase();
      const date = MOCK_ONLINE_DATES.find((d) => d.accessCode === code);
      if (!date) throw new Error('No meeting found for that code');
      return { joinUrl: `#meet-${date.id}`, date };
    }
    const res = await httpClient.post<ApiResponse<MeetingJoinResult>>(
      '/dates/join-by-code',
      { body: { accessCode } },
    );
    return res.data;
  },

  async createDate(input: CreateDateInput): Promise<OnlineDate> {
    if (env.useMockApi) {
      await sleep(500);
      const code = generateAccessCode();
      const newDate: OnlineDate = {
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
        coverImage: pickMockFeedImage(2),
        tags: input.visibility === 'private' ? ['Private'] : ['New'],
        isHostedByYou: true,
      };
      MOCK_ONLINE_DATES.unshift(newDate);
      return newDate;
    }
    const res = await httpClient.post<ApiResponse<OnlineDate>>('/dates', { body: input });
    return res.data;
  },

  async respondToInvite(
    inviteId: string,
    action: 'accept' | 'decline',
  ): Promise<DateInvite> {
    if (env.useMockApi) {
      await sleep(300);
      const invite = MOCK_DATE_INVITES.find((i) => i.id === inviteId);
      if (!invite) throw new Error('Invite not found');
      invite.status = action === 'accept' ? 'accepted' : 'declined';
      return invite;
    }
    const res = await httpClient.post<ApiResponse<DateInvite>>(`/dates/invites/${inviteId}`, {
      body: { action },
    });
    return res.data;
  },

  /** @deprecated */
  async getVibeRooms(): Promise<OnlineDate[]> {
    return this.getOnlineDates();
  },

  /** @deprecated */
  async joinRoom(roomId: string): Promise<MeetingJoinResult> {
    const date = MOCK_ONLINE_DATES.find((d) => d.id === roomId);
    return this.joinDate(roomId, date?.accessCode ?? '');
  },
};
