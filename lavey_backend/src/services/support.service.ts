import { getSupabaseAdmin, isAdminDataSourceReady } from '../lib/supabase.admin.js';
import { createSupabaseUserClient } from '../lib/supabase.user.js';
import type { AuthUser } from '../types/api.types.js';
import { AppError } from '../utils/appError.js';
import { ensureProfileRow } from './profile.service.js';

interface SupportConfigRow {
  welcome_message: string;
  auto_reply_message: string;
  support_display_name: string;
  support_status_text: string;
}

interface ConversationRow {
  id: string;
  user_id: string;
  status: string;
  auto_reply_sent: boolean;
  last_message_at: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'system' | 'admin';
  body: string;
  created_at: string;
}

export interface SupportConfigDto {
  displayName: string;
  statusText: string;
  welcomeMessage: string;
  quickTopics: string[];
}

export interface SupportMessageDto {
  id: string;
  sender: 'me' | 'support';
  text: string;
  sentAt: string;
  isAutoReply?: boolean;
}

export interface SupportConversationDto {
  conversationId: string;
  status: string;
  messages: SupportMessageDto[];
  config: SupportConfigDto;
}

function isMissingSupportSchema(message: string): boolean {
  return /support_config|support_quick_topics|support_conversations|support_messages/i.test(
    message,
  );
}

function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 90_000) return 'Just now';
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function mapMessage(row: MessageRow): SupportMessageDto {
  return {
    id: row.id,
    sender: row.sender_type === 'user' ? 'me' : 'support',
    text: row.body,
    sentAt: formatMessageTime(row.created_at),
    isAutoReply: row.sender_type === 'system',
  };
}

async function loadConfig(supabase: ReturnType<typeof createSupabaseUserClient>): Promise<SupportConfigDto> {
  const [configResult, topicsResult] = await Promise.all([
    supabase
      .from('support_config')
      .select('welcome_message, auto_reply_message, support_display_name, support_status_text')
      .eq('id', 'default')
      .maybeSingle(),
    supabase
      .from('support_quick_topics')
      .select('label')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ]);

  if (configResult.error) {
    if (isMissingSupportSchema(configResult.error.message)) {
      throw new AppError(
        500,
        'SUPPORT_SCHEMA_MISSING',
        'Support tables are missing. Run sql/017_support_messaging.sql in Supabase.',
      );
    }
    throw new AppError(500, 'SUPPORT_CONFIG_FAILED', configResult.error.message);
  }

  const config = (configResult.data as SupportConfigRow | null) ?? {
    welcome_message:
      "Hi! 👋 We're the Lavey team. Tell us what's going on — we usually reply within a few hours.",
    auto_reply_message:
      'Thanks for reaching out. A member of our team has received your message and will get back to you at the email on your account, usually within a few hours.',
    support_display_name: 'Lavey Support',
    support_status_text: "We're here to help",
  };

  return {
    displayName: config.support_display_name,
    statusText: config.support_status_text,
    welcomeMessage: config.welcome_message,
    quickTopics: ((topicsResult.data ?? []) as Array<{ label: string }>).map((t) => t.label),
  };
}

async function ensureConversation(
  authUser: AuthUser,
  accessToken: string,
  config: SupportConfigDto,
): Promise<ConversationRow> {
  await ensureProfileRow(authUser, accessToken);
  const supabase = createSupabaseUserClient(accessToken);

  const existing = await supabase
    .from('support_conversations')
    .select('id, user_id, status, auto_reply_sent, last_message_at')
    .eq('user_id', authUser.id)
    .maybeSingle();

  if (existing.error) {
    throw new AppError(500, 'SUPPORT_CONVERSATION_READ_FAILED', existing.error.message);
  }

  if (existing.data) return existing.data as ConversationRow;

  const created = await supabase
    .from('support_conversations')
    .insert({
      user_id: authUser.id,
      last_message_preview: config.welcomeMessage.slice(0, 120),
    })
    .select('id, user_id, status, auto_reply_sent, last_message_at')
    .single();

  if (created.error || !created.data) {
    throw new AppError(
      500,
      'SUPPORT_CONVERSATION_CREATE_FAILED',
      created.error?.message ?? 'Could not start support chat',
    );
  }

  const conversation = created.data as ConversationRow;

  if (isAdminDataSourceReady()) {
    const adminClient = getSupabaseAdmin();
    const { error: welcomeError } = await adminClient.from('support_messages').insert({
      conversation_id: conversation.id,
      sender_type: 'system',
      body: config.welcomeMessage,
    });
    if (welcomeError) {
      throw new AppError(500, 'SUPPORT_WELCOME_FAILED', welcomeError.message);
    }
  }

  return conversation;
}

async function loadMessages(
  accessToken: string,
  conversationId: string,
): Promise<SupportMessageDto[]> {
  const supabase = createSupabaseUserClient(accessToken);
  const { data, error } = await supabase
    .from('support_messages')
    .select('id, conversation_id, sender_type, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) {
    throw new AppError(500, 'SUPPORT_MESSAGES_READ_FAILED', error.message);
  }

  return ((data ?? []) as MessageRow[]).map(mapMessage);
}

export async function getSupportConfig(accessToken: string): Promise<SupportConfigDto> {
  const supabase = createSupabaseUserClient(accessToken);
  return loadConfig(supabase);
}

export async function getSupportConversation(
  authUser: AuthUser,
  accessToken: string,
): Promise<SupportConversationDto> {
  const supabase = createSupabaseUserClient(accessToken);
  const config = await loadConfig(supabase);
  const conversation = await ensureConversation(authUser, accessToken, config);
  const messages = await loadMessages(accessToken, conversation.id);

  return {
    conversationId: conversation.id,
    status: conversation.status,
    messages,
    config,
  };
}

export async function sendSupportMessage(
  authUser: AuthUser,
  accessToken: string,
  body: string,
): Promise<SupportConversationDto> {
  const trimmed = body.trim();
  if (!trimmed) throw new AppError(400, 'MESSAGE_EMPTY', 'Message cannot be empty');

  const supabase = createSupabaseUserClient(accessToken);
  const config = await loadConfig(supabase);
  const conversation = await ensureConversation(authUser, accessToken, config);

  const { error: insertError } = await supabase.from('support_messages').insert({
    conversation_id: conversation.id,
    sender_type: 'user',
    body: trimmed,
  });

  if (insertError) {
    throw new AppError(500, 'SUPPORT_MESSAGE_SEND_FAILED', insertError.message);
  }

  await supabase
    .from('support_conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: trimmed.slice(0, 120),
      unread_by_admin: true,
      status: 'open',
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversation.id);

  if (!conversation.auto_reply_sent) {
    const configRow = await supabase
      .from('support_config')
      .select('auto_reply_message')
      .eq('id', 'default')
      .maybeSingle();

    const autoReply =
      (configRow.data as { auto_reply_message: string } | null)?.auto_reply_message ??
      'Thanks for reaching out. A member of our team has received your message and will get back to you at the email on your account, usually within a few hours.';

    if (isAdminDataSourceReady()) {
      const adminClient = getSupabaseAdmin();
      await adminClient.from('support_messages').insert({
        conversation_id: conversation.id,
        sender_type: 'system',
        body: autoReply,
      });
    }

    await supabase
      .from('support_conversations')
      .update({ auto_reply_sent: true, updated_at: new Date().toISOString() })
      .eq('id', conversation.id);
  }

  const messages = await loadMessages(accessToken, conversation.id);

  return {
    conversationId: conversation.id,
    status: conversation.status,
    messages,
    config,
  };
}

export interface AdminSupportTicketListItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string;
  status: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: boolean;
}

export interface AdminSupportTicketDetail {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string;
  status: string;
  messages: Array<{
    id: string;
    sender: 'user' | 'admin' | 'system';
    text: string;
    sentAt: string;
    adminName?: string;
  }>;
}

function requireAdminClient() {
  if (!isAdminDataSourceReady()) {
    throw new AppError(503, 'ADMIN_DATA_UNAVAILABLE', 'Admin data source is not configured');
  }
  return getSupabaseAdmin();
}

export async function listSupportTicketsForAdmin(): Promise<AdminSupportTicketListItem[]> {
  const admin = requireAdminClient();

  const { data: conversations, error } = await admin
    .from('support_conversations')
    .select('id, user_id, status, last_message_preview, last_message_at, unread_by_admin')
    .order('last_message_at', { ascending: false })
    .limit(100);

  if (error) {
    if (isMissingSupportSchema(error.message)) return [];
    throw new AppError(500, 'ADMIN_SUPPORT_LIST_FAILED', error.message);
  }

  const rows = (conversations ?? []) as Array<{
    id: string;
    user_id: string;
    status: string;
    last_message_preview: string;
    last_message_at: string;
    unread_by_admin: boolean;
  }>;

  if (rows.length === 0) return [];

  const userIds = rows.map((r) => r.user_id);
  const { data: profiles } = await admin
    .from('profiles')
    .select('user_id, display_name, email, avatar_url')
    .in('user_id', userIds);

  const profileById = new Map(
    ((profiles ?? []) as Array<{
      user_id: string;
      display_name: string;
      email: string | null;
      avatar_url: string | null;
    }>).map((p) => [p.user_id, p]),
  );

  return rows.map((row) => {
    const profile = profileById.get(row.user_id);
    return {
      id: row.id,
      userId: row.user_id,
      userName: profile?.display_name ?? 'User',
      userEmail: profile?.email ?? '',
      userAvatar: profile?.avatar_url ?? '',
      status: row.status,
      lastMessage: row.last_message_preview || 'New support request',
      lastMessageAt: formatMessageTime(row.last_message_at),
      unread: row.unread_by_admin,
    };
  });
}

export async function getSupportTicketForAdmin(ticketId: string): Promise<AdminSupportTicketDetail> {
  const admin = requireAdminClient();

  const convResult = await admin
    .from('support_conversations')
    .select('id, user_id, status')
    .eq('id', ticketId)
    .maybeSingle();

  if (convResult.error) {
    throw new AppError(500, 'ADMIN_SUPPORT_READ_FAILED', convResult.error.message);
  }
  if (!convResult.data) {
    throw new AppError(404, 'SUPPORT_TICKET_NOT_FOUND', 'Support ticket not found');
  }

  const conv = convResult.data as { id: string; user_id: string; status: string };

  const profileResult = await admin
    .from('profiles')
    .select('display_name, email, avatar_url')
    .eq('user_id', conv.user_id)
    .maybeSingle();

  const profile = profileResult.data as {
    display_name: string;
    email: string | null;
    avatar_url: string | null;
  } | null;

  await admin
    .from('support_conversations')
    .update({ unread_by_admin: false, updated_at: new Date().toISOString() })
    .eq('id', ticketId);

  const messagesResult = await admin
    .from('support_messages')
    .select('id, sender_type, body, created_at, sender_admin_id')
    .eq('conversation_id', ticketId)
    .order('created_at', { ascending: true });

  if (messagesResult.error) {
    throw new AppError(500, 'ADMIN_SUPPORT_MESSAGES_FAILED', messagesResult.error.message);
  }

  const rawMessages = (messagesResult.data ?? []) as Array<{
    id: string;
    sender_type: 'user' | 'system' | 'admin';
    body: string;
    created_at: string;
    sender_admin_id: string | null;
  }>;

  const adminIds = rawMessages
    .map((m) => m.sender_admin_id)
    .filter((id): id is string => Boolean(id));

  const adminNameById = new Map<string, string>();
  if (adminIds.length > 0) {
    const adminsResult = await admin
      .from('admin_accounts')
      .select('id, display_name')
      .in('id', adminIds);
    for (const row of (adminsResult.data ?? []) as Array<{ id: string; display_name: string }>) {
      adminNameById.set(row.id, row.display_name);
    }
  }

  const messages = rawMessages.map((row) => ({
    id: row.id,
    sender: row.sender_type,
    text: row.body,
    sentAt: formatMessageTime(row.created_at),
    adminName:
      row.sender_type === 'admin'
        ? (row.sender_admin_id ? adminNameById.get(row.sender_admin_id) : 'Lavey Support')
        : undefined,
  }));

  return {
    id: conv.id,
    userId: conv.user_id,
    userName: profile?.display_name ?? 'User',
    userEmail: profile?.email ?? '',
    userAvatar: profile?.avatar_url ?? '',
    status: conv.status,
    messages,
  };
}

export async function replySupportTicketAsAdmin(
  ticketId: string,
  adminId: string,
  adminName: string,
  body: string,
): Promise<AdminSupportTicketDetail> {
  const trimmed = body.trim();
  if (!trimmed) throw new AppError(400, 'MESSAGE_EMPTY', 'Message cannot be empty');

  const admin = requireAdminClient();

  const convCheck = await admin
    .from('support_conversations')
    .select('id')
    .eq('id', ticketId)
    .maybeSingle();

  if (!convCheck.data) {
    throw new AppError(404, 'SUPPORT_TICKET_NOT_FOUND', 'Support ticket not found');
  }

  const { error: insertError } = await admin.from('support_messages').insert({
    conversation_id: ticketId,
    sender_type: 'admin',
    sender_admin_id: adminId === 'legacy-service-key' ? null : adminId,
    body: trimmed,
  });

  if (insertError) {
    throw new AppError(500, 'ADMIN_SUPPORT_REPLY_FAILED', insertError.message);
  }

  await admin
    .from('support_conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: `${adminName}: ${trimmed}`.slice(0, 120),
      status: 'pending',
      unread_by_admin: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId);

  return getSupportTicketForAdmin(ticketId);
}

export async function updateSupportTicketStatus(
  ticketId: string,
  status: 'open' | 'pending' | 'resolved',
): Promise<void> {
  const admin = requireAdminClient();
  const { error } = await admin
    .from('support_conversations')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', ticketId);

  if (error) {
    throw new AppError(500, 'ADMIN_SUPPORT_UPDATE_FAILED', error.message);
  }
}
