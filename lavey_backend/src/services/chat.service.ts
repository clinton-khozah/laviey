import { getSupabaseAdmin, isAdminDataSourceReady } from '../lib/supabase.admin.js';
import { createSupabaseUserClient } from '../lib/supabase.user.js';
import type { AuthUser } from '../types/api.types.js';
import { AppError } from '../utils/appError.js';

const ONLINE_WINDOW_MS = 90_000;
const TYPING_WINDOW_MS = 5_000;

interface MatchPairRow {
  id: string;
  user_one_id: string;
  user_two_id: string;
  matched_at: string;
  status: string;
}

interface ConversationRow {
  id: string;
  match_id: string;
  last_message_at: string | null;
  last_message_preview: string;
  created_at: string;
}

interface ProfileRow {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

interface ParticipantStateRow {
  conversation_id: string;
  user_id: string;
  last_read_at: string | null;
  is_pinned: boolean;
  hidden_at: string | null;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  body: string;
  reaction: string | null;
  created_at: string;
}

interface TypingRow {
  conversation_id: string;
  user_id: string;
  is_typing: boolean;
  updated_at: string;
}

interface PresenceRow {
  user_id: string;
  last_active_at: string;
}

export interface ConversationDto {
  id: string;
  participantProfileId: string;
  participantName: string;
  participantAvatar: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isOnline: boolean;
  isTyping: boolean;
  lastSeenLabel: string | null;
  lastSeenAt: string | null;
  matchedAt: string;
  vibeScore: number;
  isPinned: boolean;
}

export interface ChatMessageDto {
  id: string;
  conversationId: string;
  senderId: 'me' | 'them';
  text: string;
  sentAt: string;
  read: boolean;
  reaction?: string;
}

function isMissingChatSchema(message: string): boolean {
  return /chat_conversations|chat_messages|chat_participant_state|chat_typing_signals|chat_user_presence|schema cache/i.test(
    message,
  );
}

function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatListTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) return formatMessageTime(iso);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatMatchedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatLastSeen(lastActiveAt: string | null, isOnline: boolean): string | null {
  if (isOnline || !lastActiveAt) return null;

  const then = new Date(lastActiveAt);
  if (Number.isNaN(then.getTime())) return null;

  const diffMs = Date.now() - then.getTime();
  if (diffMs < 60_000) return 'Last seen just now';
  if (diffMs < 3600_000) {
    const mins = Math.max(1, Math.floor(diffMs / 60_000));
    return `Last seen ${mins}m ago`;
  }

  const now = new Date();
  const sameDay =
    then.getFullYear() === now.getFullYear() &&
    then.getMonth() === now.getMonth() &&
    then.getDate() === now.getDate();

  if (sameDay) {
    const time = then.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `Last seen today at ${time}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const wasYesterday =
    then.getFullYear() === yesterday.getFullYear() &&
    then.getMonth() === yesterday.getMonth() &&
    then.getDate() === yesterday.getDate();

  if (wasYesterday) {
    const time = then.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `Last seen yesterday at ${time}`;
  }

  return `Last seen ${then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

function counterpartId(match: MatchPairRow, userId: string): string {
  return match.user_one_id === userId ? match.user_two_id : match.user_one_id;
}

async function assertUserInActiveMatch(
  accessToken: string,
  userId: string,
  matchId: string,
): Promise<void> {
  const userClient = createSupabaseUserClient(accessToken);
  const { data, error } = await userClient
    .from('match_pairs')
    .select('id')
    .eq('id', matchId)
    .eq('status', 'active')
    .or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'MATCH_ACCESS_CHECK_FAILED', error.message);
  }
  if (!data) {
    throw new AppError(403, 'NOT_MATCH_PARTICIPANT', 'You are not part of this match');
  }
}

export async function ensureChatConversationForMatch(
  userId: string,
  accessToken: string,
  matchId: string,
): Promise<string> {
  await assertUserInActiveMatch(accessToken, userId, matchId);

  const writeClient = isAdminDataSourceReady()
    ? getSupabaseAdmin()
    : createSupabaseUserClient(accessToken);

  const existing = await writeClient
    .from('chat_conversations')
    .select('id')
    .eq('match_id', matchId)
    .maybeSingle();

  if (existing.error) {
    if (isMissingChatSchema(existing.error.message)) {
      console.warn('[chat] schema missing — run sql/011_chat_messaging.sql');
      return matchId;
    }
    throw new AppError(500, 'CHAT_CONVERSATION_LOOKUP_FAILED', existing.error.message);
  }

  if (existing.data?.id) return existing.data.id as string;

  const created = await writeClient
    .from('chat_conversations')
    .insert({ match_id: matchId })
    .select('id')
    .single();

  if (created.error || !created.data) {
    throw new AppError(
      500,
      'CHAT_CONVERSATION_CREATE_FAILED',
      created.error?.message ?? 'Could not create chat',
    );
  }

  return created.data.id as string;
}

export async function touchUserPresence(authUser: AuthUser, accessToken: string): Promise<void> {
  const supabase = createSupabaseUserClient(accessToken);
  const { error } = await supabase.from('chat_user_presence').upsert({
    user_id: authUser.id,
    last_active_at: new Date().toISOString(),
  });

  if (error && !isMissingChatSchema(error.message)) {
    throw new AppError(500, 'PRESENCE_UPDATE_FAILED', error.message);
  }
}

export async function listConversations(
  authUser: AuthUser,
  accessToken: string,
): Promise<ConversationDto[]> {
  const supabase = createSupabaseUserClient(accessToken);

  const matchesResult = await supabase
    .from('match_pairs')
    .select('id, user_one_id, user_two_id, matched_at, status')
    .eq('status', 'active')
    .or(`user_one_id.eq.${authUser.id},user_two_id.eq.${authUser.id}`);

  if (matchesResult.error) {
    if (isMissingChatSchema(matchesResult.error.message)) {
      throw new AppError(
        500,
        'CHAT_SCHEMA_MISSING',
        'Chat tables are missing. In Supabase SQL Editor run sql/011_chat_messaging.sql (requires 008 first), then run: NOTIFY pgrst, \'reload schema\';',
      );
    }
    throw new AppError(500, 'CHAT_MATCHES_READ_FAILED', matchesResult.error.message);
  }

  const matches = (matchesResult.data ?? []) as MatchPairRow[];
  if (matches.length === 0) return [];

  const matchIds = matches.map((m) => m.id);
  const matchById = new Map(matches.map((m) => [m.id, m]));

  const conversationsResult = await supabase
    .from('chat_conversations')
    .select('id, match_id, last_message_at, last_message_preview, created_at')
    .in('match_id', matchIds);

  if (conversationsResult.error) {
    throw new AppError(500, 'CHAT_CONVERSATIONS_READ_FAILED', conversationsResult.error.message);
  }

  let conversations = (conversationsResult.data ?? []) as ConversationRow[];

  if (conversations.length < matches.length) {
    for (const match of matches) {
      if (!conversations.some((c) => c.match_id === match.id)) {
        await ensureChatConversationForMatch(authUser.id, accessToken, match.id);
      }
    }
    const retry = await supabase
      .from('chat_conversations')
      .select('id, match_id, last_message_at, last_message_preview, created_at')
      .in('match_id', matchIds);
    if (retry.error) {
      throw new AppError(500, 'CHAT_CONVERSATIONS_READ_FAILED', retry.error.message);
    }
    conversations = (retry.data ?? []) as ConversationRow[];
  }

  if (conversations.length === 0) return [];

  const conversationIds = conversations.map((c) => c.id);
  const counterpartIds = conversations.map((c) => {
    const match = matchById.get(c.match_id)!;
    return counterpartId(match, authUser.id);
  });

  const [profilesResult, statesResult, typingResult, presenceResult, statsResult] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', counterpartIds),
      supabase
        .from('chat_participant_state')
        .select('conversation_id, user_id, last_read_at, is_pinned, hidden_at')
        .eq('user_id', authUser.id)
        .in('conversation_id', conversationIds),
      supabase
        .from('chat_typing_signals')
        .select('conversation_id, user_id, is_typing, updated_at')
        .in('conversation_id', conversationIds),
      supabase
        .from('chat_user_presence')
        .select('user_id, last_active_at')
        .in('user_id', counterpartIds),
      supabase
        .from('profile_stats')
        .select('user_id, vibe_score')
        .in('user_id', counterpartIds),
    ]);

  if (profilesResult.error) {
    throw new AppError(500, 'CHAT_PROFILES_READ_FAILED', profilesResult.error.message);
  }

  const profileById = new Map<string, ProfileRow>();
  for (const row of (profilesResult.data as ProfileRow[] | null) ?? []) {
    profileById.set(row.user_id, row);
  }

  const myStateByConv = new Map<string, ParticipantStateRow>();
  for (const row of (statesResult.data as ParticipantStateRow[] | null) ?? []) {
    myStateByConv.set(row.conversation_id, row);
  }

  const typingByConv = new Map<string, TypingRow>();
  for (const row of (typingResult.data as TypingRow[] | null) ?? []) {
    if (row.user_id !== authUser.id) typingByConv.set(row.conversation_id, row);
  }

  const presenceByUser = new Map<string, PresenceRow>();
  for (const row of (presenceResult.data as PresenceRow[] | null) ?? []) {
    presenceByUser.set(row.user_id, row);
  }

  const vibeByUser = new Map<string, number>();
  for (const row of (statsResult.data as Array<{ user_id: string; vibe_score: number }> | null) ??
    []) {
    vibeByUser.set(row.user_id, row.vibe_score ?? 0);
  }

  const now = Date.now();
  const items: ConversationDto[] = [];

  for (const conv of conversations) {
    const myState = myStateByConv.get(conv.id);
    if (myState?.hidden_at) continue;

    const match = matchById.get(conv.match_id);
    if (!match) continue;

    const otherId = counterpartId(match, authUser.id);
    const profile = profileById.get(otherId);
    if (!profile) continue;

    const { count: unreadCount } = await supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conv.id)
      .neq('sender_user_id', authUser.id)
      .gt('created_at', myState?.last_read_at ?? '1970-01-01T00:00:00Z');

    const typing = typingByConv.get(conv.id);
    const isTyping =
      Boolean(typing?.is_typing) &&
      now - new Date(typing!.updated_at).getTime() < TYPING_WINDOW_MS;

    const presence = presenceByUser.get(otherId);
    const lastSeenAt = presence?.last_active_at ?? null;
    const isOnline =
      Boolean(presence) &&
      now - new Date(presence!.last_active_at).getTime() < ONLINE_WINDOW_MS;

    items.push({
      id: conv.id,
      participantProfileId: otherId,
      participantName: profile.display_name,
      participantAvatar: profile.avatar_url ?? '',
      lastMessage: conv.last_message_preview || 'Say hi 👋',
      lastMessageAt: formatListTime(conv.last_message_at ?? match.matched_at),
      unreadCount: unreadCount ?? 0,
      isOnline,
      isTyping,
      lastSeenLabel: formatLastSeen(lastSeenAt, isOnline),
      lastSeenAt,
      matchedAt: formatMatchedAt(match.matched_at),
      vibeScore: vibeByUser.get(otherId) ?? 0,
      isPinned: myState?.is_pinned ?? false,
    });
  }

  return items.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return 0;
  });
}

export async function getConversationThread(
  authUser: AuthUser,
  accessToken: string,
  conversationId: string,
): Promise<ChatMessageDto[]> {
  const supabase = createSupabaseUserClient(accessToken);

  const convResult = await supabase
    .from('chat_conversations')
    .select('id, match_id')
    .eq('id', conversationId)
    .maybeSingle();

  if (convResult.error || !convResult.data) {
    throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  }

  const matchResult = await supabase
    .from('match_pairs')
    .select('user_one_id, user_two_id')
    .eq('id', convResult.data.match_id)
    .maybeSingle();

  const match = matchResult.data as { user_one_id: string; user_two_id: string } | null;
  const counterpartId = match
    ? match.user_one_id === authUser.id
      ? match.user_two_id
      : match.user_one_id
    : null;

  const [messagesResult, myStateResult, counterpartStateResult] = await Promise.all([
    supabase
      .from('chat_messages')
      .select('id, conversation_id, sender_user_id, body, reaction, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(500),
    supabase
      .from('chat_participant_state')
      .select('last_read_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', authUser.id)
      .maybeSingle(),
    counterpartId
      ? supabase
          .from('chat_participant_state')
          .select('read_receipt_at')
          .eq('conversation_id', conversationId)
          .eq('user_id', counterpartId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (messagesResult.error) {
    throw new AppError(500, 'CHAT_MESSAGES_READ_FAILED', messagesResult.error.message);
  }

  const lastReadAt =
    (myStateResult.data as { last_read_at: string | null } | null)?.last_read_at ?? null;
  const counterpartReadReceiptAt =
    (counterpartStateResult.data as { read_receipt_at: string | null } | null)?.read_receipt_at ??
    null;

  return ((messagesResult.data ?? []) as MessageRow[]).map((row) =>
    mapMessageRow(row, authUser.id, lastReadAt, counterpartReadReceiptAt),
  );
}

function mapMessageRow(
  row: MessageRow,
  authUserId: string,
  myLastReadAt: string | null,
  counterpartReadReceiptAt: string | null,
): ChatMessageDto {
  const dto: ChatMessageDto = {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_user_id === authUserId ? 'me' : 'them',
    text: row.body,
    sentAt: formatMessageTime(row.created_at),
    read:
      row.sender_user_id === authUserId
        ? counterpartReadReceiptAt
          ? new Date(row.created_at) <= new Date(counterpartReadReceiptAt)
          : false
        : myLastReadAt
          ? new Date(row.created_at) <= new Date(myLastReadAt)
          : false,
  };
  if (row.reaction) dto.reaction = row.reaction;
  return dto;
}

export async function sendChatMessage(
  authUser: AuthUser,
  accessToken: string,
  conversationId: string,
  text: string,
): Promise<ChatMessageDto> {
  const body = text.trim();
  if (!body) throw new AppError(400, 'MESSAGE_EMPTY', 'Message cannot be empty');

  const supabase = createSupabaseUserClient(accessToken);
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender_user_id: authUser.id,
      body,
    })
    .select('id, conversation_id, sender_user_id, body, reaction, created_at')
    .single();

  if (error) {
    throw new AppError(500, 'CHAT_MESSAGE_SEND_FAILED', error.message);
  }

  const row = data as MessageRow;

  await supabase
    .from('chat_typing_signals')
    .upsert({
      conversation_id: conversationId,
      user_id: authUser.id,
      is_typing: false,
      updated_at: new Date().toISOString(),
    });

  return mapMessageRow(row, authUser.id, null, null);
}

export async function setMessageReaction(
  authUser: AuthUser,
  accessToken: string,
  conversationId: string,
  messageId: string,
  reaction: string | null,
): Promise<ChatMessageDto> {
  const supabase = createSupabaseUserClient(accessToken);
  const { data, error } = await supabase
    .from('chat_messages')
    .update({ reaction })
    .eq('id', messageId)
    .eq('conversation_id', conversationId)
    .select('id, conversation_id, sender_user_id, body, reaction, created_at')
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'CHAT_MESSAGE_REACTION_FAILED', error.message);
  }
  if (!data) {
    throw new AppError(404, 'CHAT_MESSAGE_NOT_FOUND', 'Message not found');
  }

  const row = data as MessageRow;
  const { data: stateRow } = await supabase
    .from('chat_participant_state')
    .select('last_read_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', authUser.id)
    .maybeSingle();

  const lastReadAt =
    (stateRow as { last_read_at: string | null } | null)?.last_read_at ?? null;

  return mapMessageRow(row, authUser.id, lastReadAt, null);
}

export async function markConversationRead(
  authUser: AuthUser,
  accessToken: string,
  conversationId: string,
): Promise<void> {
  const supabase = createSupabaseUserClient(accessToken);
  const now = new Date().toISOString();

  const profileResult = await supabase
    .from('profiles')
    .select('read_receipts_enabled')
    .eq('user_id', authUser.id)
    .maybeSingle();

  const readReceiptsEnabled =
    (profileResult.data as { read_receipts_enabled: boolean } | null)?.read_receipts_enabled ??
    true;

  const patch: Record<string, string> = {
    last_read_at: now,
    updated_at: now,
  };
  if (readReceiptsEnabled) {
    patch.read_receipt_at = now;
  }

  const { error } = await supabase
    .from('chat_participant_state')
    .update(patch)
    .eq('conversation_id', conversationId)
    .eq('user_id', authUser.id);

  if (error) {
    throw new AppError(500, 'CHAT_READ_FAILED', error.message);
  }
}

export async function setTypingState(
  authUser: AuthUser,
  accessToken: string,
  conversationId: string,
  isTyping: boolean,
): Promise<void> {
  const supabase = createSupabaseUserClient(accessToken);
  const { error } = await supabase.from('chat_typing_signals').upsert({
    conversation_id: conversationId,
    user_id: authUser.id,
    is_typing: isTyping,
    updated_at: new Date().toISOString(),
  });

  if (error && !isMissingChatSchema(error.message)) {
    throw new AppError(500, 'CHAT_TYPING_FAILED', error.message);
  }
}

export async function setConversationPinned(
  authUser: AuthUser,
  accessToken: string,
  conversationId: string,
  pinned: boolean,
): Promise<void> {
  const supabase = createSupabaseUserClient(accessToken);
  const { error } = await supabase
    .from('chat_participant_state')
    .update({ is_pinned: pinned, updated_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', authUser.id);

  if (error) {
    throw new AppError(500, 'CHAT_PIN_FAILED', error.message);
  }
}

export async function hideConversation(
  authUser: AuthUser,
  accessToken: string,
  conversationId: string,
): Promise<void> {
  const supabase = createSupabaseUserClient(accessToken);
  const { error } = await supabase
    .from('chat_participant_state')
    .update({ hidden_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', authUser.id);

  if (error) {
    throw new AppError(500, 'CHAT_HIDE_FAILED', error.message);
  }
}

export async function findConversationByProfileId(
  authUser: AuthUser,
  accessToken: string,
  profileId: string,
): Promise<string | null> {
  const conversations = await listConversations(authUser, accessToken);
  return conversations.find((c) => c.participantProfileId === profileId)?.id ?? null;
}
