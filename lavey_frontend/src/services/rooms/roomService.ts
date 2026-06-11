import { usesBackendMeetups } from '@/config/env';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
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
import { resolveMeetupCover } from '@/utils/meeting/meetupCover';
import { buildMeetupJoinLink } from '@/utils/meeting/meetupJoinLink';
import { formatMeetupScheduledLabel, isMeetupExpired } from '@/utils/meeting/meetupSchedule';
import { sleep } from '@/utils/sleep';

function generateAccessCode(): string {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${part()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function cloneDate(date: OnlineDate): OnlineDate {
  return enrichDate({ ...date });
}

type MeetupDatePayload = OnlineDate & {
  host_user_id?: string;
  starts_at?: string;
  scheduled_label?: string;
};

function enrichDate(date: MeetupDatePayload): OnlineDate {
  const startsAt = date.startsAt ?? date.starts_at;
  const scheduledLabel =
    date.scheduledLabel ??
    date.scheduled_label ??
    (startsAt ? formatMeetupScheduledLabel(startsAt) : undefined);

  return {
    ...date,
    hostUserId: date.hostUserId ?? date.host_user_id,
    startsAt,
    scheduledLabel,
    coverImage: resolveMeetupCover(date.coverImage) ?? '',
    joinLink: buildMeetupJoinLink(date.accessCode),
  };
}

function filterActiveMeetups(dates: OnlineDate[]): OnlineDate[] {
  return dates.filter((date) => !date.startsAt || !isMeetupExpired(date.startsAt));
}

type DateInvitePayload = DateInvite & { from_profile_id?: string };

function inviteForClient(invite: DateInvitePayload): DateInvite {
  const normalized: DateInvite = {
    ...invite,
    fromProfileId: invite.fromProfileId ?? invite.from_profile_id,
  };
  if (normalized.status === 'pending') {
    const { accessCode: _hidden, ...rest } = normalized;
    return { ...rest, status: 'pending' };
  }
  return normalized;
}

function buildDateFromInvite(invite: DateInvite): OnlineDate {
  const code = invite.accessCode ?? generateAccessCode();
  return {
    id: invite.dateId,
    hostUserId: invite.fromProfileId,
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
      return filterActiveMeetups(MOCK_ONLINE_DATES.map(cloneDate));
    }
    const res = await httpClient.get<ApiResponse<OnlineDate[]>>(API_ENDPOINTS.dates.list);
    return filterActiveMeetups(res.data.map(enrichDate));
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
      const startsAt =
        input.startsAt ?? new Date(Date.now() + (input.startsInMinutes ?? 15) * 60_000).toISOString();
      const startsInMinutes = Math.max(
        1,
        Math.ceil((new Date(startsAt).getTime() - Date.now()) / 60_000),
      );

      const newDate: OnlineDate = {
        id: `new-${Date.now()}`,
        title: input.title,
        topic: input.topic,
        hostName: 'You',
        hostAvatar: '',
        status: startsInMinutes <= 15 ? 'starting-soon' : 'scheduled',
        visibility: input.visibility,
        accessCode: code,
        participantCount: isInvite ? 0 : 1,
        maxParticipants: isPrivate ? 2 : 24,
        startsInMinutes,
        startsAt,
        scheduledLabel: formatMeetupScheduledLabel(startsAt),
        coverImage: input.coverImageUrl ?? '',
        tags: isPrivate ? ['Private'] : ['Public'],
        isHostedByYou: true,
      };

      MOCK_ONLINE_DATES.unshift(newDate);

      return cloneDate(newDate);
    }
    const res = await httpClient.post<ApiResponse<OnlineDate>>(API_ENDPOINTS.dates.create, {
      body: {
        title: input.title,
        topic: input.topic,
        visibility: input.visibility,
        mode: input.mode,
        inviteToProfileId: input.inviteToProfileId,
        inviteToName: input.inviteToName,
        startsAt: input.startsAt,
        startsInMinutes: input.startsInMinutes,
        coverImageUrl: input.coverImageUrl,
      },
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
