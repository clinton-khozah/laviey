import { MOCK_MEDIA_PATHS, pickMockAvatarPath, pickMockFeedImagePath } from './mockMedia.js';

export interface OnlineDateDto {
  id: string;
  title: string;
  topic: string;
  hostName: string;
  hostAvatar: string;
  status: 'live' | 'starting-soon' | 'scheduled';
  visibility: 'public' | 'private';
  accessCode: string;
  participantCount: number;
  maxParticipants: number;
  startsInMinutes?: number;
  coverImage: string;
  tags: string[];
  isHostedByYou?: boolean;
}

export interface DateInviteDto {
  id: string;
  dateId: string;
  fromName: string;
  fromAvatar: string;
  title: string;
  topic: string;
  scheduledLabel: string;
  accessCode: string;
  coverImage: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface MeetingJoinResultDto {
  joinUrl: string;
  date: OnlineDateDto;
}

export const MOCK_ONLINE_DATES: OnlineDateDto[] = [
  {
    id: 'r1',
    title: 'Dog Lovers Happy Hour',
    topic: 'Bring your pup stories · camera on welcome',
    hostName: 'Lavey Host',
    hostAvatar: pickMockAvatarPath(0),
    status: 'live',
    visibility: 'public',
    accessCode: 'PAWS-4821',
    participantCount: 18,
    maxParticipants: 24,
    coverImage: pickMockFeedImagePath(0),
    tags: ['Dogs', 'Casual'],
  },
  {
    id: 'r2',
    title: '80s Music Trivia',
    topic: 'Quick rounds · camera optional',
    hostName: 'DJ Riley',
    hostAvatar: pickMockAvatarPath(4),
    status: 'live',
    visibility: 'public',
    accessCode: 'VIBE-8033',
    participantCount: 31,
    maxParticipants: 40,
    coverImage: pickMockFeedImagePath(1),
    tags: ['Music', 'Games'],
  },
  {
    id: 'r3',
    title: 'Sunset Coffee Chats',
    topic: 'Low-pressure first vibes',
    hostName: 'Maya',
    hostAvatar: pickMockAvatarPath(0),
    status: 'starting-soon',
    visibility: 'public',
    accessCode: 'BREW-1190',
    participantCount: 6,
    maxParticipants: 16,
    startsInMinutes: 12,
    coverImage: MOCK_MEDIA_PATHS.flower,
    tags: ['Coffee', 'Chill'],
  },
  {
    id: 'r5',
    title: 'Double Date Night',
    topic: 'Two couples · low-pressure intro',
    hostName: 'Maya',
    hostAvatar: pickMockAvatarPath(0),
    status: 'live',
    visibility: 'private',
    accessCode: 'DOUBLE-2026',
    participantCount: 3,
    maxParticipants: 4,
    coverImage: pickMockFeedImagePath(2),
    tags: ['Double', 'Chill'],
  },
  {
    id: 'r4',
    title: 'Climbing Gym Crew',
    topic: 'Share your send of the week',
    hostName: 'Alex',
    hostAvatar: pickMockAvatarPath(3),
    status: 'scheduled',
    visibility: 'public',
    accessCode: 'SEND-7744',
    participantCount: 0,
    maxParticipants: 20,
    startsInMinutes: 90,
    coverImage: pickMockFeedImagePath(3),
    tags: ['Climbing', 'Fitness'],
  },
];

export const MOCK_DATE_INVITES: DateInviteDto[] = [
  {
    id: 'inv1',
    dateId: 'priv1',
    fromName: 'Jordan',
    fromAvatar: pickMockAvatarPath(1),
    title: 'Quick vibe check',
    topic: '15 min · just us two',
    scheduledLabel: 'Tonight · 8:00 PM',
    accessCode: 'JORD-5529',
    coverImage: pickMockFeedImagePath(4),
    status: 'pending',
  },
  {
    id: 'inv2',
    dateId: 'priv2',
    fromName: 'Sofia',
    fromAvatar: pickMockAvatarPath(2),
    title: 'Bookshop date',
    topic: 'Virtual coffee + chapter swap',
    scheduledLabel: 'Tomorrow · 6:30 PM',
    accessCode: 'READ-3318',
    coverImage: pickMockFeedImagePath(5),
    status: 'pending',
  },
];
