export type MeetingReactionType = 'like' | 'love' | 'live';

export interface MeetingReactionBurst {
  id: string;
  type: MeetingReactionType;
  fromUserId: string;
  fromName: string;
  isLocal?: boolean;
}

export const MEETING_REACTION_EMOJI: Record<MeetingReactionType, string> = {
  like: '❤️',
  love: '💕',
  live: '🔥',
};

export const MEETING_REACTION_LABEL: Record<MeetingReactionType, string> = {
  like: 'Like',
  love: 'Love',
  live: 'Live',
};
