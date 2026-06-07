import type { MeetingParticipant, OnlineDate } from '@/types';
import { pickMockAvatar } from '@/constants/mockMedia';
import { isDoubleDateMeetup } from '@/utils/meeting/isDoubleDateMeetup';

const PARTNER_NAME = 'Sam';
const PARTNER_AVATAR = pickMockAvatar(4);

/** Remote participants in the room (mock until WebRTC backend) */
export function getMockMeetingParticipants(date: OnlineDate): MeetingParticipant[] {
  const host: MeetingParticipant = {
    id: `host-${date.id}`,
    profileId: date.isHostedByYou ? 'me' : `host-${date.id}`,
    name: date.hostName,
    avatarUrl: date.hostAvatar,
    isHost: true,
    isMuted: false,
    isVideoOff: false,
  };

  if (isDoubleDateMeetup(date)) {
    const partner: MeetingParticipant = {
      id: `partner-${date.id}`,
      profileId: `partner-${date.id}`,
      name: PARTNER_NAME,
      avatarUrl: PARTNER_AVATAR,
      isMuted: false,
      isVideoOff: false,
    };
    return [host, partner];
  }

  return [host];
}
