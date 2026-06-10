import { createSupabaseUserClient } from '../lib/supabase.user.js';
import { pickMockFeedImagePath } from '../data/mockMedia.js';
import type { AuthUser } from '../types/api.types.js';
import { AppError } from '../utils/appError.js';
import { orderedPair } from './match-pair.util.js';

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
  fromProfileId?: string;
  fromAvatar: string;
  title: string;
  topic: string;
  scheduledLabel: string;
  accessCode?: string;
  coverImage: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface MeetingJoinResultDto {
  joinUrl: string;
  date: OnlineDateDto;
}

export interface CreateDateInput {
  title: string;
  topic: string;
  visibility: 'public' | 'private';
  mode: 'post' | 'invite';
  inviteToProfileId?: string;
  inviteToName?: string;
  startsInMinutes: number;
}

interface MeetupRow {
  id: string;
  host_user_id: string;
  title: string;
  topic: string;
  visibility: 'public' | 'private';
  access_code: string;
  starts_at: string;
  max_participants: number;
  participant_count: number;
  cover_image_url: string | null;
  tags: string[] | null;
}

interface InviteRow {
  id: string;
  meetup_id: string;
  host_user_id: string;
  invitee_user_id: string;
  status: 'pending' | 'accepted' | 'declined';
}

interface ProfileLiteRow {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

function isMissingMeetupSchema(message: string): boolean {
  return /online_meetups|online_meetup_invites/i.test(message);
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function generateAccessCode(): string {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${part()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function deriveStatus(startsAtIso: string): OnlineDateDto['status'] {
  const startsAt = new Date(startsAtIso);
  const diffMin = (startsAt.getTime() - Date.now()) / 60_000;
  if (diffMin <= 0) return 'live';
  if (diffMin <= 15) return 'starting-soon';
  return 'scheduled';
}

function startsInMinutesFrom(startsAtIso: string): number | undefined {
  const diffMin = Math.ceil((new Date(startsAtIso).getTime() - Date.now()) / 60_000);
  return diffMin > 0 ? diffMin : undefined;
}

function formatScheduledLabel(startsAtIso: string): string {
  const startsAt = new Date(startsAtIso);
  const diffMin = Math.ceil((startsAt.getTime() - Date.now()) / 60_000);
  if (diffMin <= 15) return 'Starting soon';
  if (diffMin < 120) return `In ${diffMin} min`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `Later today · ${startsAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  return `Tomorrow · ${startsAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

function mapMeetupRow(
  row: MeetupRow,
  host: ProfileLiteRow | undefined,
  viewerId: string,
): OnlineDateDto {
  const status = deriveStatus(row.starts_at);
  return {
    id: row.id,
    title: row.title,
    topic: row.topic,
    hostName: host?.display_name ?? 'Host',
    hostAvatar: host?.avatar_url ?? '',
    status,
    visibility: row.visibility,
    accessCode: row.access_code,
    participantCount: row.participant_count,
    maxParticipants: row.max_participants,
    startsInMinutes: status !== 'live' ? startsInMinutesFrom(row.starts_at) : undefined,
    coverImage: row.cover_image_url ?? pickMockFeedImagePath(0),
    tags: row.tags ?? [],
    isHostedByYou: row.host_user_id === viewerId,
  };
}

async function loadProfiles(
  supabase: ReturnType<typeof createSupabaseUserClient>,
  userIds: string[],
): Promise<Map<string, ProfileLiteRow>> {
  const map = new Map<string, ProfileLiteRow>();
  if (userIds.length === 0) return map;

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, display_name, avatar_url')
    .in('user_id', userIds);

  if (error) {
    throw new AppError(500, 'MEETUP_PROFILES_FAILED', error.message);
  }

  for (const row of (data as ProfileLiteRow[] | null) ?? []) {
    map.set(row.user_id, row);
  }
  return map;
}

async function assertUsersMatched(
  supabase: ReturnType<typeof createSupabaseUserClient>,
  userId: string,
  otherUserId: string,
): Promise<void> {
  const pair = orderedPair(userId, otherUserId);
  const { data, error } = await supabase
    .from('match_pairs')
    .select('id')
    .eq('user_one_id', pair.one)
    .eq('user_two_id', pair.two)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    if (/match_pairs/i.test(error.message)) {
      throw new AppError(
        500,
        'MATCHING_SCHEMA_MISSING',
        'Matching tables are missing. Run sql/008_discover_matching_engine.sql in Supabase.',
      );
    }
    throw new AppError(500, 'MATCH_LOOKUP_FAILED', error.message);
  }
  if (!data) {
    throw new AppError(403, 'NOT_MATCHED', 'You can only invite someone you have matched with');
  }
}

async function findMeetupById(
  supabase: ReturnType<typeof createSupabaseUserClient>,
  meetupId: string,
): Promise<MeetupRow | null> {
  const { data, error } = await supabase
    .from('online_meetups')
    .select(
      'id, host_user_id, title, topic, visibility, access_code, starts_at, max_participants, participant_count, cover_image_url, tags',
    )
    .eq('id', meetupId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'MEETUP_READ_FAILED', error.message);
  }
  return (data as MeetupRow | null) ?? null;
}

async function findMeetupByCode(
  supabase: ReturnType<typeof createSupabaseUserClient>,
  accessCode: string,
): Promise<MeetupRow | null> {
  const { data, error } = await supabase
    .from('online_meetups')
    .select(
      'id, host_user_id, title, topic, visibility, access_code, starts_at, max_participants, participant_count, cover_image_url, tags',
    )
    .eq('access_code', normalizeCode(accessCode))
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'MEETUP_READ_FAILED', error.message);
  }
  return (data as MeetupRow | null) ?? null;
}

async function assertCanJoinMeetup(
  supabase: ReturnType<typeof createSupabaseUserClient>,
  meetup: MeetupRow,
  userId: string,
): Promise<void> {
  if (meetup.visibility === 'public') return;
  if (meetup.host_user_id === userId) return;

  const { data, error } = await supabase
    .from('online_meetup_invites')
    .select('id')
    .eq('meetup_id', meetup.id)
    .eq('invitee_user_id', userId)
    .eq('status', 'accepted')
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'MEETUP_ACCESS_CHECK_FAILED', error.message);
  }
  if (!data) {
    throw new AppError(
      403,
      'MEETUP_INVITE_REQUIRED',
      'This is a private meetup — accept the invite from your match first',
    );
  }
}

function buildJoinResult(date: OnlineDateDto): MeetingJoinResultDto {
  return {
    joinUrl: `#meet-${date.id}`,
    date,
  };
}

export async function listOnlineDates(
  authUser: AuthUser,
  accessToken: string,
): Promise<OnlineDateDto[]> {
  const supabase = createSupabaseUserClient(accessToken);

  const [publicResult, hostedResult, acceptedResult] = await Promise.all([
    supabase
      .from('online_meetups')
      .select(
        'id, host_user_id, title, topic, visibility, access_code, starts_at, max_participants, participant_count, cover_image_url, tags',
      )
      .eq('visibility', 'public')
      .order('starts_at', { ascending: true })
      .limit(40),
    supabase
      .from('online_meetups')
      .select(
        'id, host_user_id, title, topic, visibility, access_code, starts_at, max_participants, participant_count, cover_image_url, tags',
      )
      .eq('host_user_id', authUser.id)
      .order('starts_at', { ascending: true })
      .limit(40),
    supabase
      .from('online_meetup_invites')
      .select('meetup_id')
      .eq('invitee_user_id', authUser.id)
      .eq('status', 'accepted'),
  ]);

  if (publicResult.error && !isMissingMeetupSchema(publicResult.error.message)) {
    throw new AppError(500, 'MEETUP_LIST_FAILED', publicResult.error.message);
  }
  if (hostedResult.error && !isMissingMeetupSchema(hostedResult.error.message)) {
    throw new AppError(500, 'MEETUP_LIST_FAILED', hostedResult.error.message);
  }
  if (acceptedResult.error && !isMissingMeetupSchema(acceptedResult.error.message)) {
    throw new AppError(500, 'MEETUP_LIST_FAILED', acceptedResult.error.message);
  }

  if (
    isMissingMeetupSchema(publicResult.error?.message ?? '') ||
    isMissingMeetupSchema(hostedResult.error?.message ?? '')
  ) {
    throw new AppError(
      500,
      'MEETUP_SCHEMA_MISSING',
      'Meetup tables are missing. Run sql/021_online_meetups.sql in Supabase.',
    );
  }

  const byId = new Map<string, MeetupRow>();
  for (const row of (publicResult.data as MeetupRow[] | null) ?? []) {
    byId.set(row.id, row);
  }
  for (const row of (hostedResult.data as MeetupRow[] | null) ?? []) {
    byId.set(row.id, row);
  }

  const acceptedIds = ((acceptedResult.data as Array<{ meetup_id: string }> | null) ?? []).map(
    (row) => row.meetup_id,
  );

  if (acceptedIds.length > 0) {
    const acceptedMeetups = await supabase
      .from('online_meetups')
      .select(
        'id, host_user_id, title, topic, visibility, access_code, starts_at, max_participants, participant_count, cover_image_url, tags',
      )
      .in('id', acceptedIds);

    if (acceptedMeetups.error) {
      throw new AppError(500, 'MEETUP_LIST_FAILED', acceptedMeetups.error.message);
    }
    for (const row of (acceptedMeetups.data as MeetupRow[] | null) ?? []) {
      byId.set(row.id, row);
    }
  }

  const rows = [...byId.values()];
  const hostIds = [...new Set(rows.map((row) => row.host_user_id))];
  const profiles = await loadProfiles(supabase, hostIds);

  return rows
    .map((row) => mapMeetupRow(row, profiles.get(row.host_user_id), authUser.id))
    .sort((a, b) => {
      const order = { live: 0, 'starting-soon': 1, scheduled: 2 };
      return order[a.status] - order[b.status];
    });
}

export async function listDateInvites(
  authUser: AuthUser,
  accessToken: string,
): Promise<DateInviteDto[]> {
  const supabase = createSupabaseUserClient(accessToken);

  const { data, error } = await supabase
    .from('online_meetup_invites')
    .select('id, meetup_id, host_user_id, invitee_user_id, status')
    .eq('invitee_user_id', authUser.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingMeetupSchema(error.message)) {
      return [];
    }
    throw new AppError(500, 'MEETUP_INVITES_FAILED', error.message);
  }

  const invites = (data as InviteRow[] | null) ?? [];
  if (invites.length === 0) return [];

  const meetupIds = invites.map((invite) => invite.meetup_id);
  const hostIds = invites.map((invite) => invite.host_user_id);

  const [meetupsResult, profiles] = await Promise.all([
    supabase
      .from('online_meetups')
      .select(
        'id, host_user_id, title, topic, visibility, access_code, starts_at, max_participants, participant_count, cover_image_url, tags',
      )
      .in('id', meetupIds),
    loadProfiles(supabase, hostIds),
  ]);

  if (meetupsResult.error) {
    throw new AppError(500, 'MEETUP_INVITES_FAILED', meetupsResult.error.message);
  }

  const meetupById = new Map<string, MeetupRow>();
  for (const row of (meetupsResult.data as MeetupRow[] | null) ?? []) {
    meetupById.set(row.id, row);
  }

  return invites.flatMap((invite): DateInviteDto[] => {
    const meetup = meetupById.get(invite.meetup_id);
    const host = profiles.get(invite.host_user_id);
    if (!meetup) return [];
    return [
      {
        id: invite.id,
        dateId: meetup.id,
        fromName: host?.display_name ?? 'Match',
        fromProfileId: invite.host_user_id,
        fromAvatar: host?.avatar_url ?? '',
        title: meetup.title,
        topic: meetup.topic,
        scheduledLabel: formatScheduledLabel(meetup.starts_at),
        coverImage: meetup.cover_image_url ?? pickMockFeedImagePath(4),
        status: 'pending',
      },
    ];
  });
}

export async function joinOnlineDate(
  authUser: AuthUser,
  accessToken: string,
  dateId: string,
  accessCode: string,
): Promise<MeetingJoinResultDto> {
  const supabase = createSupabaseUserClient(accessToken);
  const meetup = await findMeetupById(supabase, dateId);
  if (!meetup) {
    throw new AppError(404, 'DATE_NOT_FOUND', 'Meetup not found');
  }
  if (normalizeCode(accessCode) !== normalizeCode(meetup.access_code)) {
    throw new AppError(400, 'INVALID_ACCESS_CODE', 'Invalid access code');
  }
  await assertCanJoinMeetup(supabase, meetup, authUser.id);

  const profiles = await loadProfiles(supabase, [meetup.host_user_id]);
  const date = mapMeetupRow(meetup, profiles.get(meetup.host_user_id), authUser.id);
  return buildJoinResult(date);
}

export async function joinOnlineDateByCode(
  authUser: AuthUser,
  accessToken: string,
  accessCode: string,
): Promise<MeetingJoinResultDto> {
  const supabase = createSupabaseUserClient(accessToken);
  const normalized = normalizeCode(accessCode);
  const meetup = await findMeetupByCode(supabase, accessCode);

  if (!meetup) {
    const pendingInvite = await supabase
      .from('online_meetup_invites')
      .select('id, meetup_id')
      .eq('invitee_user_id', authUser.id)
      .eq('status', 'pending');

    if (!pendingInvite.error && pendingInvite.data) {
      const meetupIds = (pendingInvite.data as Array<{ meetup_id: string }>).map((row) => row.meetup_id);
      if (meetupIds.length > 0) {
        const linked = await supabase
          .from('online_meetups')
          .select('access_code')
          .in('id', meetupIds)
          .eq('access_code', normalized)
          .maybeSingle();
        if (linked.data) {
          throw new AppError(
            403,
            'MEETUP_INVITE_PENDING',
            'Accept the meetup invite first to unlock this code',
          );
        }
      }
    }

    throw new AppError(404, 'DATE_NOT_FOUND', 'No meeting found for that code');
  }

  await assertCanJoinMeetup(supabase, meetup, authUser.id);
  const profiles = await loadProfiles(supabase, [meetup.host_user_id]);
  const date = mapMeetupRow(meetup, profiles.get(meetup.host_user_id), authUser.id);
  return buildJoinResult(date);
}

export async function createOnlineDate(
  authUser: AuthUser,
  accessToken: string,
  input: CreateDateInput,
): Promise<OnlineDateDto> {
  const supabase = createSupabaseUserClient(accessToken);
  const isPrivate = input.visibility === 'private';
  const isInvite = input.mode === 'invite' || isPrivate;
  const inviteeId = input.inviteToProfileId?.trim();

  if (isInvite) {
    if (!inviteeId) {
      throw new AppError(400, 'INVITE_MATCH_REQUIRED', 'Choose a match to invite');
    }
    if (inviteeId === authUser.id) {
      throw new AppError(400, 'INVALID_INVITEE', 'You cannot invite yourself');
    }
    await assertUsersMatched(supabase, authUser.id, inviteeId);
  }

  const startsAt = new Date(Date.now() + input.startsInMinutes * 60_000).toISOString();
  const accessCode = generateAccessCode();
  const tags = isPrivate ? ['Private'] : ['Public'];

  const { data: created, error } = await supabase
    .from('online_meetups')
    .insert({
      host_user_id: authUser.id,
      title: input.title.trim(),
      topic: input.topic.trim(),
      visibility: input.visibility,
      access_code: accessCode,
      starts_at: startsAt,
      max_participants: isPrivate ? 2 : 24,
      participant_count: isInvite ? 0 : 1,
      cover_image_url: pickMockFeedImagePath(2),
      tags,
    })
    .select(
      'id, host_user_id, title, topic, visibility, access_code, starts_at, max_participants, participant_count, cover_image_url, tags',
    )
    .single();

  if (error || !created) {
    if (isMissingMeetupSchema(error?.message ?? '')) {
      throw new AppError(
        500,
        'MEETUP_SCHEMA_MISSING',
        'Meetup tables are missing. Run sql/021_online_meetups.sql in Supabase.',
      );
    }
    throw new AppError(500, 'MEETUP_CREATE_FAILED', error?.message ?? 'Could not create meetup');
  }

  const meetup = created as MeetupRow;

  if (isInvite && inviteeId) {
    const inviteInsert = await supabase.from('online_meetup_invites').insert({
      meetup_id: meetup.id,
      host_user_id: authUser.id,
      invitee_user_id: inviteeId,
      status: 'pending',
    });
    if (inviteInsert.error) {
      throw new AppError(500, 'MEETUP_INVITE_CREATE_FAILED', inviteInsert.error.message);
    }
  }

  const me = await loadProfiles(supabase, [authUser.id]);
  return mapMeetupRow(meetup, me.get(authUser.id), authUser.id);
}

export async function respondToDateInvite(
  authUser: AuthUser,
  accessToken: string,
  inviteId: string,
  action: 'accept' | 'decline',
): Promise<{ invite: DateInviteDto; date?: OnlineDateDto }> {
  const supabase = createSupabaseUserClient(accessToken);

  const { data: inviteRow, error: inviteError } = await supabase
    .from('online_meetup_invites')
    .select('id, meetup_id, host_user_id, invitee_user_id, status')
    .eq('id', inviteId)
    .eq('invitee_user_id', authUser.id)
    .maybeSingle();

  if (inviteError) {
    throw new AppError(500, 'MEETUP_INVITE_READ_FAILED', inviteError.message);
  }
  if (!inviteRow) {
    throw new AppError(404, 'INVITE_NOT_FOUND', 'Invite not found');
  }

  const invite = inviteRow as InviteRow;
  if (invite.status !== 'pending') {
    throw new AppError(400, 'INVITE_ALREADY_HANDLED', 'This invite was already handled');
  }

  const nextStatus = action === 'accept' ? 'accepted' : 'declined';
  const { error: updateError } = await supabase
    .from('online_meetup_invites')
    .update({ status: nextStatus })
    .eq('id', inviteId);

  if (updateError) {
    throw new AppError(500, 'MEETUP_INVITE_UPDATE_FAILED', updateError.message);
  }

  const meetup = await findMeetupById(supabase, invite.meetup_id);
  if (!meetup) {
    throw new AppError(404, 'DATE_NOT_FOUND', 'Meetup not found');
  }

  const profiles = await loadProfiles(supabase, [invite.host_user_id]);
  const host = profiles.get(invite.host_user_id);

  const inviteDto: DateInviteDto = {
    id: invite.id,
    dateId: meetup.id,
    fromName: host?.display_name ?? 'Match',
    fromProfileId: invite.host_user_id,
    fromAvatar: host?.avatar_url ?? '',
    title: meetup.title,
    topic: meetup.topic,
    scheduledLabel: formatScheduledLabel(meetup.starts_at),
    coverImage: meetup.cover_image_url ?? pickMockFeedImagePath(4),
    status: nextStatus,
    accessCode: action === 'accept' ? meetup.access_code : undefined,
  };

  if (action === 'decline') {
    return { invite: inviteDto };
  }

  return {
    invite: inviteDto,
    date: mapMeetupRow(meetup, host, authUser.id),
  };
}
