import { AppError } from '../utils/appError.js';
import { getSupabaseAdmin, isAdminDataSourceReady } from '../lib/supabase.admin.js';

export type AdminUsersView = 'all' | 'subscribed' | 'new' | 'matches' | 'top';

export interface AdminQuizAnswer {
  question: string;
  answer: string;
}

export interface AdminUserRecord {
  id: string;
  name: string;
  handle: string;
  email: string;
  avatarUrl?: string;
  bio: string;
  city?: string;
  likes: number;
  clickthrough: number;
  age: number | null;
  gender: string;
  totalMatches: number;
  matches: number;
  plan: 'Platinum' | 'Free';
  lastSeen: string;
  subscribed: boolean;
  isNew: boolean;
  topUser: boolean;
  quizCompletion: number;
  quizAnswers: AdminQuizAnswer[];
  posts: string[];
  meetings: string[];
}

export interface AdminUsersSummary {
  activeUsers: number;
  subscribedMembers: number;
  highMatchUsers: number;
}

export interface ListAdminUsersResult {
  users: AdminUserRecord[];
  summary: AdminUsersSummary;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ListAdminUsersParams {
  view: AdminUsersView;
  page: number;
  limit: number;
  search?: string;
}

interface MemberRow {
  user_id: string;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  pronouns: string | null;
  is_premium: boolean;
  date_of_birth: string | null;
  last_active_at: string;
  created_at: string;
  onboarding_completed_at: string | null;
  matches_count: number;
  profile_views: number;
  likes_received_count: number;
  is_new_user: boolean;
  is_top_user: boolean;
}

interface OnboardingRow {
  user_id: string;
  purpose_label: string;
  age_preference_label: string;
  interested_in_label: string;
  orientation_label: string;
  religion_label: string;
  interests: { key: string; label: string; emoji?: string }[] | null;
  completed_at: string | null;
}

function calcAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

function formatLastSeen(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'Unknown';
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function handleFromName(name: string, userId: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24);
  return `@${slug || userId.slice(0, 8)}`;
}

function buildQuizAnswers(onboarding: OnboardingRow | undefined, completed: boolean): AdminQuizAnswer[] {
  if (!onboarding || !completed) return [];

  const interestLabels = (onboarding.interests ?? []).map((item) => item.label).join(', ');

  return [
    { question: 'What are you here for?', answer: onboarding.purpose_label },
    { question: 'Who are you interested in?', answer: onboarding.interested_in_label },
    { question: 'Your age preference?', answer: onboarding.age_preference_label },
    { question: 'Orientation', answer: onboarding.orientation_label },
    { question: 'Religion preference?', answer: onboarding.religion_label },
    { question: 'Top interests?', answer: interestLabels || 'Not set' },
  ];
}

function mapMemberRow(row: MemberRow, onboarding?: OnboardingRow): AdminUserRecord {
  const completed = Boolean(row.onboarding_completed_at);
  const quizAnswers = buildQuizAnswers(onboarding, completed);
  const likes = row.likes_received_count ?? 0;

  return {
    id: row.user_id,
    name: row.display_name,
    handle: handleFromName(row.display_name, row.user_id),
    email: row.email ?? '',
    avatarUrl: row.avatar_url ?? undefined,
    bio: row.bio ?? '',
    city: row.city ?? undefined,
    likes,
    clickthrough: likes,
    age: calcAge(row.date_of_birth),
    gender: row.pronouns?.trim() || onboarding?.orientation_label || 'Not set',
    totalMatches: row.matches_count ?? 0,
    matches: row.matches_count ?? 0,
    plan: row.is_premium ? 'Platinum' : 'Free',
    lastSeen: formatLastSeen(row.last_active_at),
    subscribed: row.is_premium,
    isNew: row.is_new_user,
    topUser: row.is_top_user,
    quizCompletion: completed ? 100 : 0,
    quizAnswers,
    posts: [],
    meetings: [],
  };
}

function applyViewFilter<T extends { eq: (col: string, val: boolean) => T; gte: (col: string, val: number) => T }>(
  query: T,
  view: AdminUsersView,
): T {
  if (view === 'all') return query;
  if (view === 'subscribed') return query.eq('is_premium', true);
  if (view === 'new') return query.eq('is_new_user', true);
  if (view === 'matches') return query.gte('matches_count', 10);
  return query.eq('is_top_user', true);
}

function orderColumn(view: AdminUsersView): string {
  if (view === 'matches') return 'matches_count';
  if (view === 'top') return 'vibe_score';
  if (view === 'new') return 'created_at';
  return 'last_active_at';
}

export async function listAdminUsers(params: ListAdminUsersParams): Promise<ListAdminUsersResult> {
  if (!isAdminDataSourceReady()) {
    throw new AppError(
      503,
      'ADMIN_DATA_UNAVAILABLE',
      'Admin user listing requires SUPABASE_SERVICE_ROLE_KEY on the API server',
    );
  }

  const page = Math.max(1, params.page);
  const limit = Math.min(50, Math.max(1, params.limit));
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const search = params.search?.trim();

  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('admin_member_records')
    .select(
      'user_id, email, display_name, avatar_url, bio, city, pronouns, is_premium, date_of_birth, last_active_at, created_at, onboarding_completed_at, matches_count, profile_views, likes_received_count, is_new_user, is_top_user',
      { count: 'exact' },
    );

  query = applyViewFilter(query, params.view);

  if (search) {
    const term = `%${search}%`;
    query = query.or(`display_name.ilike.${term},email.ilike.${term}`);
  }

  query = query.order(orderColumn(params.view), { ascending: false }).range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw new AppError(500, 'ADMIN_USERS_LIST_FAILED', error.message);
  }

  const rows = (data ?? []) as MemberRow[];
  const userIds = rows.map((row) => row.user_id);

  let onboardingByUser = new Map<string, OnboardingRow>();

  if (userIds.length > 0) {
    const { data: onboardingRows, error: onboardingError } = await supabase
      .from('user_onboarding_details')
      .select(
        'user_id, purpose_label, age_preference_label, interested_in_label, orientation_label, religion_label, interests, completed_at',
      )
      .in('user_id', userIds);

    if (onboardingError) {
      throw new AppError(500, 'ADMIN_USERS_ONBOARDING_FAILED', onboardingError.message);
    }

    onboardingByUser = new Map(
      ((onboardingRows ?? []) as OnboardingRow[]).map((row) => [row.user_id, row]),
    );
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const [{ count: activeUsers }, { count: subscribedMembers }, { count: highMatchUsers }] =
    await Promise.all([
      supabase.from('admin_member_records').select('*', { count: 'exact', head: true }),
      supabase.from('admin_member_records').select('*', { count: 'exact', head: true }).eq('is_premium', true),
      supabase
        .from('admin_member_records')
        .select('*', { count: 'exact', head: true })
        .gte('matches_count', 10),
    ]);

  return {
    users: rows.map((row) => mapMemberRow(row, onboardingByUser.get(row.user_id))),
    summary: {
      activeUsers: activeUsers ?? 0,
      subscribedMembers: subscribedMembers ?? 0,
      highMatchUsers: highMatchUsers ?? 0,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export interface AdminProfilePost {
  id: string;
  type: 'image' | 'video';
  src: string;
  poster?: string;
  caption?: string;
}

export interface AdminUserDetail extends AdminUserRecord {
  profilePosts: AdminProfilePost[];
}

export async function getAdminUserById(userId: string): Promise<AdminUserDetail> {
  if (!isAdminDataSourceReady()) {
    throw new AppError(
      503,
      'ADMIN_DATA_UNAVAILABLE',
      'Admin user lookup requires SUPABASE_SERVICE_ROLE_KEY on the API server',
    );
  }

  const supabase = getSupabaseAdmin();

  const { data: member, error } = await supabase
    .from('admin_member_records')
    .select(
      'user_id, email, display_name, avatar_url, bio, city, pronouns, is_premium, date_of_birth, last_active_at, created_at, onboarding_completed_at, matches_count, profile_views, likes_received_count, is_new_user, is_top_user',
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'ADMIN_USER_READ_FAILED', error.message);
  }

  if (!member) {
    throw new AppError(404, 'ADMIN_USER_NOT_FOUND', 'Member not found');
  }

  const row = member as MemberRow;

  const [onboardingResult, postsResult] = await Promise.all([
    supabase
      .from('user_onboarding_details')
      .select(
        'user_id, purpose_label, age_preference_label, interested_in_label, orientation_label, religion_label, interests, completed_at',
      )
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('profile_posts')
      .select('id, kind, public_url, poster_url, caption, sort_order, created_at')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false }),
  ]);

  if (onboardingResult.error) {
    throw new AppError(500, 'ADMIN_USER_ONBOARDING_FAILED', onboardingResult.error.message);
  }

  if (postsResult.error) {
    throw new AppError(500, 'ADMIN_USER_POSTS_FAILED', postsResult.error.message);
  }

  const base = mapMemberRow(row, (onboardingResult.data as OnboardingRow | null) ?? undefined);
  const profilePosts: AdminProfilePost[] = ((postsResult.data ?? []) as Array<{
    id: string;
    kind: 'image' | 'video';
    public_url: string;
    poster_url: string | null;
    caption: string | null;
  }>).map((post) => ({
    id: post.id,
    type: post.kind,
    src: post.public_url,
    poster: post.poster_url ?? undefined,
    caption: post.caption ?? undefined,
  }));

  return {
    ...base,
    posts: profilePosts.map((post) => post.caption || post.src),
    profilePosts,
  };
}
