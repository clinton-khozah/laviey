import { getSupabaseAdmin, isAdminDataSourceReady } from '../lib/supabase.admin.js';
import { createSupabaseUserClient } from '../lib/supabase.user.js';
import type { AuthUser } from '../types/api.types.js';
import { AppError } from '../utils/appError.js';
import { hashPhone, hashPhones } from '../utils/phoneHash.js';
import { orderedPair } from './match-pair.util.js';
import { ensureProfileRow } from './profile.service.js';

interface PrivacyRow {
  show_on_discover: boolean;
  read_receipts_enabled: boolean;
  contacts_can_find_me: boolean;
  phone_hash: string | null;
}

export interface PrivacySettingsDto {
  showInDiscover: boolean;
  hideFromPeople: boolean;
  readReceipts: boolean;
  contactsCanFindMe: boolean;
  hasPhoneLinked: boolean;
}

export interface BlockedUserDto {
  userId: string;
  displayName: string;
  avatarUrl: string;
  blockedAt: string;
}

export interface ContactImportResult {
  imported: number;
  matches: Array<{ userId: string; displayName: string; avatarUrl: string }>;
}

export interface UpdatePrivacyInput {
  showInDiscover?: boolean;
  hideFromPeople?: boolean;
  readReceipts?: boolean;
  contactsCanFindMe?: boolean;
  phone?: string;
}

function mapPrivacyRow(row: PrivacyRow): PrivacySettingsDto {
  return {
    showInDiscover: row.show_on_discover,
    hideFromPeople: !row.show_on_discover,
    readReceipts: row.read_receipts_enabled,
    contactsCanFindMe: row.contacts_can_find_me,
    hasPhoneLinked: Boolean(row.phone_hash),
  };
}

function isMissingPrivacySchema(message: string): boolean {
  return /read_receipts_enabled|contacts_can_find_me|phone_hash|user_blocks|user_imported_contacts/i.test(
    message,
  );
}

async function loadPrivacyRow(
  authUser: AuthUser,
  accessToken: string,
): Promise<PrivacyRow> {
  await ensureProfileRow(authUser, accessToken);

  const supabase = createSupabaseUserClient(accessToken);
  const { data, error } = await supabase
    .from('profiles')
    .select('show_on_discover, read_receipts_enabled, contacts_can_find_me, phone_hash')
    .eq('user_id', authUser.id)
    .maybeSingle();

  if (error) {
    if (isMissingPrivacySchema(error.message)) {
      throw new AppError(
        500,
        'PRIVACY_SCHEMA_MISSING',
        'Privacy columns are missing. Run sql/015_user_privacy.sql in Supabase.',
      );
    }
    throw new AppError(500, 'PRIVACY_READ_FAILED', error.message);
  }

  return (data as PrivacyRow | null) ?? {
    show_on_discover: true,
    read_receipts_enabled: true,
    contacts_can_find_me: false,
    phone_hash: null,
  };
}

export async function getPrivacySettings(
  authUser: AuthUser,
  accessToken: string,
): Promise<PrivacySettingsDto> {
  const row = await loadPrivacyRow(authUser, accessToken);
  return mapPrivacyRow(row);
}

export async function updatePrivacySettings(
  authUser: AuthUser,
  accessToken: string,
  input: UpdatePrivacyInput,
): Promise<PrivacySettingsDto> {
  const current = await loadPrivacyRow(authUser, accessToken);
  const patch: Record<string, unknown> = {};

  if (input.showInDiscover !== undefined) {
    patch.show_on_discover = input.showInDiscover;
  }
  if (input.hideFromPeople !== undefined) {
    patch.show_on_discover = !input.hideFromPeople;
  }
  if (input.readReceipts !== undefined) {
    patch.read_receipts_enabled = input.readReceipts;
  }
  if (input.contactsCanFindMe !== undefined) {
    patch.contacts_can_find_me = input.contactsCanFindMe;
  }
  if (input.phone?.trim()) {
    patch.phone_hash = hashPhone(input.phone.trim());
  }

  const nextContactsCanFindMe =
    (patch.contacts_can_find_me as boolean | undefined) ?? current.contacts_can_find_me;
  const nextPhoneHash =
    (patch.phone_hash as string | undefined | null) ?? current.phone_hash;

  if (nextContactsCanFindMe && !nextPhoneHash) {
    throw new AppError(
      400,
      'PHONE_REQUIRED',
      'Link a phone number before enabling “Let contacts find me”.',
    );
  }

  if (Object.keys(patch).length === 0) {
    return mapPrivacyRow(current);
  }

  const supabase = createSupabaseUserClient(accessToken);
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('user_id', authUser.id)
    .select('show_on_discover, read_receipts_enabled, contacts_can_find_me, phone_hash')
    .single();

  if (error) {
    throw new AppError(500, 'PRIVACY_UPDATE_FAILED', error.message);
  }

  return mapPrivacyRow(data as PrivacyRow);
}

export async function listBlockedUsers(
  authUser: AuthUser,
  accessToken: string,
): Promise<BlockedUserDto[]> {
  const supabase = createSupabaseUserClient(accessToken);
  const { data: blocks, error } = await supabase
    .from('user_blocks')
    .select('blocked_user_id, created_at')
    .eq('blocker_user_id', authUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingPrivacySchema(error.message)) {
      return [];
    }
    throw new AppError(500, 'BLOCK_LIST_FAILED', error.message);
  }

  const rows = (blocks ?? []) as Array<{ blocked_user_id: string; created_at: string }>;
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.blocked_user_id);
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, display_name, avatar_url')
    .in('user_id', ids);

  if (profileError) {
    throw new AppError(500, 'BLOCK_LIST_PROFILE_FAILED', profileError.message);
  }

  const profileById = new Map(
    ((profiles ?? []) as Array<{ user_id: string; display_name: string; avatar_url: string | null }>).map(
      (p) => [p.user_id, p],
    ),
  );

  return rows.map((row) => {
    const profile = profileById.get(row.blocked_user_id);
    return {
      userId: row.blocked_user_id,
      displayName: profile?.display_name ?? 'User',
      avatarUrl: profile?.avatar_url ?? '',
      blockedAt: row.created_at,
    };
  });
}

export async function blockUser(
  authUser: AuthUser,
  accessToken: string,
  blockedUserId: string,
): Promise<void> {
  if (blockedUserId === authUser.id) {
    throw new AppError(400, 'INVALID_BLOCK', 'You cannot block yourself');
  }

  const supabase = createSupabaseUserClient(accessToken);

  const target = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', blockedUserId)
    .maybeSingle();

  if (target.error) {
    throw new AppError(500, 'BLOCK_TARGET_LOOKUP_FAILED', target.error.message);
  }
  if (!target.data) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }

  const { error: blockError } = await supabase.from('user_blocks').upsert(
    {
      blocker_user_id: authUser.id,
      blocked_user_id: blockedUserId,
    },
    { onConflict: 'blocker_user_id,blocked_user_id' },
  );

  if (blockError) {
    throw new AppError(500, 'BLOCK_FAILED', blockError.message);
  }

  const pair = orderedPair(authUser.id, blockedUserId);
  const existing = await supabase
    .from('match_pairs')
    .select('id, status')
    .eq('user_one_id', pair.one)
    .eq('user_two_id', pair.two)
    .maybeSingle();

  if (!existing.error && existing.data?.id) {
    await supabase
      .from('match_pairs')
      .update({ status: 'blocked', updated_at: new Date().toISOString() })
      .eq('id', existing.data.id);

    await supabase.from('match_events').insert({
      match_id: existing.data.id,
      actor_user_id: authUser.id,
      event_type: 'blocked',
      metadata: { source: 'safety-privacy' },
    });
  }
}

export async function unblockUser(
  authUser: AuthUser,
  accessToken: string,
  blockedUserId: string,
): Promise<void> {
  const supabase = createSupabaseUserClient(accessToken);
  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_user_id', authUser.id)
    .eq('blocked_user_id', blockedUserId);

  if (error) {
    throw new AppError(500, 'UNBLOCK_FAILED', error.message);
  }
}

export async function importContacts(
  authUser: AuthUser,
  accessToken: string,
  phones: string[],
): Promise<ContactImportResult> {
  const hashes = hashPhones(phones);
  if (hashes.length === 0) {
    throw new AppError(400, 'NO_VALID_CONTACTS', 'No valid phone numbers to import');
  }

  const supabase = createSupabaseUserClient(accessToken);
  const rows = hashes.map((phone_hash) => ({
    user_id: authUser.id,
    phone_hash,
  }));

  const { error: importError } = await supabase
    .from('user_imported_contacts')
    .upsert(rows, { onConflict: 'user_id,phone_hash', ignoreDuplicates: true });

  if (importError) {
    throw new AppError(500, 'CONTACT_IMPORT_FAILED', importError.message);
  }

  const { data: matches, error: matchError } = await supabase
    .from('profiles')
    .select('user_id, display_name, avatar_url')
    .in('phone_hash', hashes)
    .eq('contacts_can_find_me', true)
    .eq('show_on_discover', true)
    .neq('user_id', authUser.id);

  if (matchError) {
    throw new AppError(500, 'CONTACT_MATCH_FAILED', matchError.message);
  }

  return {
    imported: hashes.length,
    matches: ((matches ?? []) as Array<{
      user_id: string;
      display_name: string;
      avatar_url: string | null;
    }>).map((row) => ({
      userId: row.user_id,
      displayName: row.display_name,
      avatarUrl: row.avatar_url ?? '',
    })),
  };
}

export async function exportUserData(
  authUser: AuthUser,
  accessToken: string,
): Promise<Record<string, unknown>> {
  const supabase = createSupabaseUserClient(accessToken);

  const [profile, interests, posts, matches, blocks] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', authUser.id).maybeSingle(),
    supabase.from('profile_interests').select('label, sort_order, created_at').eq('user_id', authUser.id),
    supabase.from('profile_posts').select('id, media_type, caption, created_at').eq('user_id', authUser.id),
    supabase
      .from('match_pairs')
      .select('id, status, matched_at')
      .or(`user_one_id.eq.${authUser.id},user_two_id.eq.${authUser.id}`),
    supabase
      .from('user_blocks')
      .select('blocked_user_id, created_at')
      .eq('blocker_user_id', authUser.id),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    userId: authUser.id,
    email: authUser.email,
    profile: profile.data ?? null,
    interests: interests.data ?? [],
    posts: posts.data ?? [],
    matches: matches.data ?? [],
    blockedUsers: blocks.data ?? [],
    note: 'Messages and sensitive fields are included per your account access. Raw phone numbers are never stored.',
  };
}

export async function deleteUserAccount(authUser: AuthUser): Promise<void> {
  if (!isAdminDataSourceReady()) {
    throw new AppError(
      503,
      'DELETE_NOT_CONFIGURED',
      'Account deletion is not configured on this server. Contact support.',
    );
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.auth.admin.deleteUser(authUser.id);

  if (error) {
    throw new AppError(500, 'DELETE_ACCOUNT_FAILED', error.message);
  }
}

export async function loadBlockedUserIds(
  userId: string,
  accessToken: string,
): Promise<Set<string>> {
  const supabase = createSupabaseUserClient(accessToken);
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked_user_id')
    .eq('blocker_user_id', userId);

  if (error) {
    if (isMissingPrivacySchema(error.message)) return new Set();
    throw new AppError(500, 'BLOCK_LIST_FAILED', error.message);
  }

  return new Set(
    ((data ?? []) as Array<{ blocked_user_id: string }>).map((row) => row.blocked_user_id),
  );
}
