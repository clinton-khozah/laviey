import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { getSupabaseAdmin, isAdminDataSourceReady } from '../lib/supabase.admin.js';
import { AppError } from '../utils/appError.js';
import { signAdminToken, type AdminJwtPayload } from '../utils/adminJwt.js';
import { formatSupabaseError } from '../utils/supabaseError.js';

const PASSWORD_ROUNDS = 12;

export interface AdminAccount {
  id: string;
  email: string;
  displayName: string;
}

export interface AdminAuthSession {
  token: string;
  admin: AdminAccount;
}

interface AdminAccountRow {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
  last_login_at: string | null;
}

function mapAdminRow(row: Pick<AdminAccountRow, 'id' | 'email' | 'display_name'>): AdminAccount {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
  };
}

function issueSession(row: Pick<AdminAccountRow, 'id' | 'email' | 'display_name'>): AdminAuthSession {
  const admin = mapAdminRow(row);
  const payload: AdminJwtPayload = {
    sub: admin.id,
    email: admin.email,
    displayName: admin.displayName,
  };
  return { token: signAdminToken(payload), admin };
}

function assertAdminDataReady(): void {
  if (!isAdminDataSourceReady()) {
    throw new AppError(
      503,
      'ADMIN_DATA_UNAVAILABLE',
      'Admin auth requires SUPABASE_SERVICE_ROLE_KEY on the API server',
    );
  }
}

async function countAdmins(): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { count, error, status } = await supabase
    .from('admin_accounts')
    .select('*', { count: 'exact', head: true });

  if (error || (status != null && status >= 400)) {
    throw new AppError(500, 'ADMIN_COUNT_FAILED', formatSupabaseError(error, status));
  }

  return count ?? 0;
}

export async function registerAdmin(params: {
  email: string;
  password: string;
  displayName: string;
  inviteCode?: string;
}): Promise<AdminAuthSession> {
  assertAdminDataReady();

  const email = params.email.trim().toLowerCase();
  const displayName = params.displayName.trim();
  const existingCount = await countAdmins();

  if (existingCount > 0) {
    const invite = params.inviteCode?.trim() ?? '';
    if (!invite || invite !== env.ADMIN_REGISTER_SECRET) {
      throw new AppError(
        403,
        'ADMIN_REGISTER_FORBIDDEN',
        'An admin account already exists. Sign in with your existing account, or enter the invite code from ADMIN_REGISTER_SECRET in lavey_backend/.env to add another admin.',
      );
    }
  }

  const passwordHash = await bcrypt.hash(params.password, PASSWORD_ROUNDS);
  const supabase = getSupabaseAdmin();

  const { data, error, status } = await supabase
    .from('admin_accounts')
    .insert({
      email,
      display_name: displayName,
      password_hash: passwordHash,
      last_login_at: new Date().toISOString(),
    })
    .select('id, email, display_name')
    .single();

  if (error || (status != null && status >= 400)) {
    if (error?.code === '23505') {
      throw new AppError(409, 'ADMIN_EMAIL_EXISTS', 'An admin account with this email already exists');
    }
    throw new AppError(500, 'ADMIN_REGISTER_FAILED', formatSupabaseError(error, status));
  }

  return issueSession(data as AdminAccountRow);
}

export async function loginAdmin(email: string, password: string): Promise<AdminAuthSession> {
  assertAdminDataReady();

  const normalizedEmail = email.trim().toLowerCase();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('admin_accounts')
    .select('id, email, display_name, password_hash')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'ADMIN_LOGIN_FAILED', error.message);
  }

  if (!data) {
    throw new AppError(401, 'ADMIN_INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const row = data as AdminAccountRow;
  const valid = await bcrypt.compare(password, row.password_hash);

  if (!valid) {
    throw new AppError(401, 'ADMIN_INVALID_CREDENTIALS', 'Invalid email or password');
  }

  await supabase
    .from('admin_accounts')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', row.id);

  return issueSession(row);
}

export async function getRegistrationStatus(): Promise<{ requiresInviteCode: boolean }> {
  assertAdminDataReady();
  const existingCount = await countAdmins();
  return { requiresInviteCode: existingCount > 0 };
}

export async function getAdminById(adminId: string): Promise<AdminAccount> {
  assertAdminDataReady();

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('admin_accounts')
    .select('id, email, display_name')
    .eq('id', adminId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'ADMIN_LOOKUP_FAILED', error.message);
  }

  if (!data) {
    throw new AppError(401, 'ADMIN_UNAUTHORIZED', 'Admin account not found');
  }

  return mapAdminRow(data as AdminAccountRow);
}
