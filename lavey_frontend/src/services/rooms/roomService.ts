import { usesBackendMeetups } from '@/config/env';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { pickMockFeedImage } from '@/constants/mockMedia';
import { httpClient } from '@/services/api/httpClient';
import { MOCK_DATE_INVITES, MOCK_ONLINE_DATES } from '@/services/mocks/room.mock';
import type {
  ApiResponse,
  CreateDateInput,
  DateInvite,
  MeetingJoinResult,
  OnlineDate,
} from '@/types';
import {
  canJoinMeetup,
  isMatchedProfile,
  markMeetupCodeAccepted,
  normalizeMeetupCode,
  readAcceptedMeetupCodes,
} from '@/utils/meeting/meetupAccess';
import { buildMeetupJoinLink } from '@/utils/meeting/meetupJoinLink';
import { sleep } from '@/utils/sleep';

function generateAccessCode(): string {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${part()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function cloneDate(date: OnlineDate): OnlineDate {
  return enrichDate({ ...date });
}

function enrichDate(date: OnlineDate): OnlineDate {
  return {
    ...date,
    joinLink: buildMeetupJoinLink(date.accessCode),
  };
}

function inviteForClient(invite: DateInvite): DateInvite {
  if (invite.status === 'pending') {
    const { accessCode: _hidden, ...rest } = invite;
    return { ...rest, status: 'pending' };
  }
  return { ...invite };
}

function buildDateFromInvite(invite: DateInvite): OnlineDate {
  const code = invite.accessCode ?? generateAccessCode();
  return {
    id: invite.dateId,
    title: invite.title,
    topic: invite.topic,
    hostName: invite.fromName,
    hostAvatar: invite.fromAvatar,
    status: 'starting-soon',
    visibility: 'private',
    accessCode: code,
    participantCount: 1,
    maxParticipants: 2,
    coverImage: invite.coverImage,
    tags: ['Private', 'Invite'],
  };
}

function assertCanJoin(date: OnlineDate): void {
  const acceptedCodes = readAcceptedMeetupCodes();
  if (!canJoinMeetup(date, acceptedCodes)) {
    throw new Error('This is a private meetup — accept the invite from your match first');
  }
}

export const roomService = {
  async getOnlineDates(): Promise<OnlineDate[]> {
    if (!usesBackendMeetups()) {
      await sleep(350);
      return MOCK_ONLINE_DATES.map(cloneDate);
    }
    const res = await httpClient.get<ApiResponse<OnlineDate[]>>(API_ENDPOINTS.dates.list);
    return res.data.map(enrichDate);
  },

  async getDateInvites(): Promise<DateInvite[]> {
    if (!usesBackendMeetups()) {
      await sleep(200);
      return MOCK_DATE_INVITES.filter((invite) => invite.status === 'pending').map(inviteForClient);
    }
    const res = await httpClient.get<ApiResponse<DateInvite[]>>(API_ENDPOINTS.dates.invites);
    return res.data;
  },

  async joinDate(dateId: string, accessCode: string): Promise<MeetingJoinResult> {
    if (!usesBackendMeetups()) {
      await sleep(400);
      const date = MOCK_ONLINE_DATES.find((item) => item.id === dateId);
      if (!date) throw new Error('Meetup not found');
      if (normalizeMeetupCode(accessCode) !== normalizeMeetupCode(date.accessCode)) {
        throw new Error('Invalid access code');
      }
      assertCanJoin(date);
      return { joinUrl: `#meet-${dateId}`, date: cloneDate(date) };
    }
    const res = await httpClient.post<ApiResponse<MeetingJoinResult>>(
      API_ENDPOINTS.dates.join(dateId),
      { body: { accessCode } },
    );
    return { ...res.data, date: enrichDate(res.data.date) };
  },

  async joinByCode(accessCode: string): Promise<MeetingJoinResult> {
    if (!usesBackendMeetups()) {
      await sleep(400);
      const code = normalizeMeetupCode(accessCode);
      const date = MOCK_ONLINE_DATES.find(
        (item) => normalizeMeetupCode(item.accessCode) === code,
      );

      if (!date) {
        const pendingInvite = MOCK_DATE_INVITES.find(
          (invite) =>
            invite.status === 'pending' &&
            invite.accessCode &&
            normalizeMeetupCode(invite.accessCode) === code,
        );
        if (pendingInvite) {
          throw new Error('Accept the meetup invite first to unlock this code');
        }
        throw new Error('No meeting found for that code');
      }

      assertCanJoin(date);
      return { joinUrl: `#meet-${date.id}`, date: cloneDate(date) };
    }
    const res = await httpClient.post<ApiResponse<MeetingJoinResult>>(
      API_ENDPOINTS.dates.joinByCode,
      { body: { accessCode } },
    );
    return { ...res.data, date: enrichDate(res.data.date) };
  },

  async createDate(input: CreateDateInput): Promise<OnlineDate> {
    if (!usesBackendMeetups()) {
      await sleep(500);

      const isPrivate = input.visibility === 'private';
      const isInvite = input.mode === 'invite' || isPrivate;

      if (isInvite) {
        const profileId = input.inviteToProfileId?.trim();
        if (!profileId) {
          throw new Error('Choose a match to invite');
        }
        if (!isMatchedProfile(profileId)) {
          throw new Error('You can only invite someone you have matched with');
        }
      }

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
        participantCount: isInvite ? 0 : 1,
        maxParticipants: isPrivate ? 2 : 24,
        startsInMinutes: input.startsInMinutes,
        coverImage: pickMockFeedImage(2),
        tags: isPrivate ? ['Private'] : ['Public'],
        isHostedByYou: true,
      };

      MOCK_ONLINE_DATES.unshift(newDate);

      return cloneDate(newDate);
    }
    const res = await httpClient.post<ApiResponse<OnlineDate>>(API_ENDPOINTS.dates.create, {
      body: input,
    });
    return enrichDate(res.data);
  },

  async deleteDate(dateId: string): Promise<void> {
    if (!usesBackendMeetups()) {
      await sleep(200);
      const index = MOCK_ONLINE_DATES.findIndex((item) => item.id === dateId);
      if (index === -1) throw new Error('Meetup not found');
      if (!MOCK_ONLINE_DATES[index]?.isHostedByYou) {
        throw new Error('Only the host can delete this meetup');
      }
      MOCK_ONLINE_DATES.splice(index, 1);
      return;
    }

    await httpClient.delete<ApiResponse<{ ok: boolean }>>(API_ENDPOINTS.dates.byId(dateId));
  },

  async respondToInvite(
    inviteId: string,
    action: 'accept' | 'decline',
  ): Promise<{ invite: DateInvite; date?: OnlineDate }> {
    if (!usesBackendMeetups()) {
      await sleep(300);
      const invite = MOCK_DATE_INVITES.find((item) => item.id === inviteId);
      if (!invite) throw new Error('Invite not found');

      invite.status = action === 'accept' ? 'accepted' : 'declined';

      if (action === 'decline') {
        return { invite: inviteForClient(invite) };
      }

      const existing = MOCK_ONLINE_DATES.find((date) => date.id === invite.dateId);
      const date = existing ?? buildDateFromInvite(invite);
      if (!existing) {
        MOCK_ONLINE_DATES.unshift(date);
      }

      if (invite.accessCode) {
        markMeetupCodeAccepted(invite.accessCode);
      }

      return {
        invite: { ...invite, accessCode: invite.accessCode },
        date: cloneDate(date),
      };
    }
    const res = await httpClient.post<ApiResponse<{ invite: DateInvite; date?: OnlineDate }>>(
      API_ENDPOINTS.dates.respondToInvite(inviteId),
      { body: { action } },
    );
    return {
      ...res.data,
      date: res.data.date ? enrichDate(res.data.date) : undefined,
    };
  },

  /** @deprecated */
  async getVibeRooms(): Promise<OnlineDate[]> {
    return this.getOnlineDates();
  },

  /** @deprecated */
  async joinRoom(roomId: string): Promise<MeetingJoinResult> {
    const date = MOCK_ONLINE_DATES.find((item) => item.id === roomId);
    return this.joinDate(roomId, date?.accessCode ?? '');
  },
};
