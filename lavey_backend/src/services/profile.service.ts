import { createSupabaseUserClient } from '../lib/supabase.user.js';
import { AppError } from '../utils/appError.js';
import type { AuthUser } from '../types/api.types.js';
import { listUserPosts, type ProfilePostDto } from './content.service.js';

export interface ProfileInterestItem {
  key: string;
  label: string;
  emoji: string;
}

export interface UserProfileDto {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  bio: string;
  headline?: string;
  city?: string;
  pronouns?: string;
  interests: ProfileInterestItem[];
  isPremium: boolean;
  verified: boolean;
  stats: {
    flamesSent: number;
    matches: number;
    vibeScore: number;
    profileViews: number;
    giftEarnings: number;
  };
  posts: ProfilePostDto[];
}

export interface UpdateProfileInput {
  displayName?: string;
  bio?: string;
  headline?: string;
  city?: string;
  pronouns?: string;
  interestKeys?: string[];
}

export interface UpdateLocationInput {
  latitude: number;
  longitude: number;
  country?: string;
  province?: string;
  suburb?: string;
}

interface ProfileRow {
  user_id: string;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  headline: string | null;
  city: string | null;
  pronouns: string | null;
  is_premium: boolean;
  is_verified: boolean;
}

interface StatsRow {
  flames_sent: number;
  matches_count: number;
  vibe_score: number;
  profile_views: number;
  gift_earnings_cents: number;
}

function mapProfile(
  authUser: AuthUser,
  profile: ProfileRow | null,
  stats: StatsRow | null,
  interests: ProfileInterestItem[],
  posts: ProfilePostDto[],
): UserProfileDto {
  return {
    id: authUser.id,
    displayName: profile?.display_name ?? authUser.displayName,
    email: profile?.email ?? authUser.email,
    avatarUrl: profile?.avatar_url ?? authUser.avatarUrl,
    bio: profile?.bio ?? '',
    headline: profile?.headline ?? undefined,
    city: profile?.city ?? undefined,
    pronouns: profile?.pronouns ?? undefined,
    interests,
    isPremium: profile?.is_premium ?? false,
    verified: profile?.is_verified ?? false,
    stats: {
      flamesSent: stats?.flames_sent ?? 0,
      matches: stats?.matches_count ?? 0,
      vibeScore: stats?.vibe_score ?? 80,
      profileViews: stats?.profile_views ?? 0,
      giftEarnings: (stats?.gift_earnings_cents ?? 0) / 100,
    },
    posts,
  };
}

export async function ensureProfileRow(
  authUser: AuthUser,
  accessToken: string,
): Promise<ProfileRow> {
  const supabase = createSupabaseUserClient(accessToken);

  const { data: existing, error: readError } = await supabase
    .from('profiles')
    .select(
      'user_id, email, display_name, avatar_url, bio, headline, city, pronouns, is_premium, is_verified',
    )
    .eq('user_id', authUser.id)
    .maybeSingle();

  if (readError) {
    throw new AppError(500, 'PROFILE_READ_FAILED', readError.message);
  }

  if (existing) return existing as ProfileRow;

  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({
      user_id: authUser.id,
      email: authUser.email,
      display_name: authUser.displayName,
      avatar_url: authUser.avatarUrl ?? null,
      bio: '',
    })
    .select(
      'user_id, email, display_name, avatar_url, bio, headline, city, pronouns, is_premium, is_verified',
    )
    .single();

  if (insertError || !created) {
    throw new AppError(500, 'PROFILE_CREATE_FAILED', insertError?.message ?? 'Could not create profile');
  }

  return created as ProfileRow;
}

async function loadInterests(
  userId: string,
  accessToken: string,
): Promise<ProfileInterestItem[]> {
  const supabase = createSupabaseUserClient(accessToken);
  const { data, error } = await supabase
    .from('profile_interests')
    .select('sort_order, onboarding_options(option_key, label, emoji)')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new AppError(500, 'PROFILE_INTERESTS_READ_FAILED', error.message);
  }

  return (data ?? [])
    .map((row) => {
      const option = row.onboarding_options as
        | { option_key: string; label: string; emoji: string }
        | { option_key: string; label: string; emoji: string }[]
        | null;

      const resolved = Array.isArray(option) ? option[0] : option;
      if (!resolved) return null;

      return {
        key: resolved.option_key,
        label: resolved.label,
        emoji: resolved.emoji ?? '',
      };
    })
    .filter((item): item is ProfileInterestItem => item !== null);
}

async function seedInterestsFromOnboardingIfEmpty(
  userId: string,
  accessToken: string,
): Promise<void> {
  const supabase = createSupabaseUserClient(accessToken);
  const { error } = await supabase.rpc('seed_profile_interests_from_onboarding', {
    p_user_id: userId,
  });

  if (error && error.code !== 'PGRST202') {
    throw new AppError(500, 'PROFILE_INTERESTS_SEED_FAILED', error.message);
  }
}

async function loadStats(userId: string, accessToken: string): Promise<StatsRow | null> {
  const supabase = createSupabaseUserClient(accessToken);
  const { data, error } = await supabase
    .from('profile_stats')
    .select('flames_sent, matches_count, vibe_score, profile_views, gift_earnings_cents')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'PROFILE_STATS_READ_FAILED', error.message);
  }

  return (data as StatsRow | null) ?? null;
}

export async function getUserProfile(
  authUser: AuthUser,
  accessToken: string,
): Promise<UserProfileDto> {
  const profile = await ensureProfileRow(authUser, accessToken);
  let interests = await loadInterests(authUser.id, accessToken);

  if (interests.length === 0) {
    await seedInterestsFromOnboardingIfEmpty(authUser.id, accessToken);
    interests = await loadInterests(authUser.id, accessToken);
  }

  const stats = await loadStats(authUser.id, accessToken);
  const posts = await listUserPosts(authUser.id, accessToken);

  await createSupabaseUserClient(accessToken)
    .from('profiles')
    .update({ last_active_at: new Date().toISOString() })
    .eq('user_id', authUser.id);

  return mapProfile(authUser, profile, stats, interests, posts);
}

export async function updateUserProfile(
  authUser: AuthUser,
  accessToken: string,
  input: UpdateProfileInput,
): Promise<UserProfileDto> {
  await ensureProfileRow(authUser, accessToken);
  const supabase = createSupabaseUserClient(accessToken);

  const patch: Record<string, string | null> = {};

  if (input.displayName !== undefined) {
    const name = input.displayName.trim().slice(0, 80);
    if (!name) {
      throw new AppError(400, 'INVALID_DISPLAY_NAME', 'Display name is required');
    }
    patch.display_name = name;
  }

  if (input.bio !== undefined) {
    patch.bio = input.bio.trim().slice(0, 500);
  }

  if (input.headline !== undefined) {
    const headline = input.headline.trim().slice(0, 80);
    patch.headline = headline || null;
  }

  if (input.city !== undefined) {
    const city = input.city.trim().slice(0, 80);
    patch.city = city || null;
  }

  if (input.pronouns !== undefined) {
    const pronouns = input.pronouns.trim().slice(0, 40);
    patch.pronouns = pronouns || null;
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from('profiles').update(patch).eq('user_id', authUser.id);
    if (error) {
      throw new AppError(500, 'PROFILE_UPDATE_FAILED', error.message);
    }
  }

  if (input.interestKeys !== undefined) {
    const seen = new Set<string>();
    const keys: string[] = [];

    for (const key of input.interestKeys) {
      const normalized = key.trim();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      keys.push(normalized);
      if (keys.length >= 12) break;
    }

    const { error } = await supabase.rpc('replace_profile_interest_keys', {
      p_user_id: authUser.id,
      p_option_keys: keys,
    });

    if (error) {
      throw new AppError(500, 'PROFILE_INTERESTS_UPDATE_FAILED', error.message);
    }
  }

  return getUserProfile(authUser, accessToken);
}

export async function markIdentityVerified(authUser: AuthUser, accessToken: string): Promise<UserProfileDto> {
  await ensureProfileRow(authUser, accessToken);
  const supabase = createSupabaseUserClient(accessToken);

  const { error } = await supabase
    .from('profiles')
    .update({ is_verified: true })
    .eq('user_id', authUser.id);

  if (error) {
    throw new AppError(500, 'VERIFICATION_SAVE_FAILED', error.message);
  }

  return getUserProfile(authUser, accessToken);
}

export async function updateUserLocation(
  authUser: AuthUser,
  accessToken: string,
  input: UpdateLocationInput,
): Promise<void> {
  await ensureProfileRow(authUser, accessToken);
  const supabase = createSupabaseUserClient(accessToken);
  const city = input.suburb?.trim() || null;

  const locationPayload = {
    latitude: input.latitude,
    longitude: input.longitude,
    country: input.country?.trim() || null,
    province: input.province?.trim() || null,
    suburb: city,
    city,
    location_updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('profiles')
    .update(locationPayload)
    .eq('user_id', authUser.id);

  if (error) {
    const missingLocationSchema =
      /country|province|suburb|latitude|longitude|location_updated_at/i.test(error.message) &&
      /schema cache|column/i.test(error.message);

    if (missingLocationSchema) {
      const { error: fallbackError } = await supabase
        .from('profiles')
        .update({ city })
        .eq('user_id', authUser.id);
      if (fallbackError) {
        throw new AppError(500, 'PROFILE_LOCATION_UPDATE_FAILED', fallbackError.message);
      }
      return;
    }
    throw new AppError(500, 'PROFILE_LOCATION_UPDATE_FAILED', error.message);
  }
}
