import { createSupabaseUserClient } from '../lib/supabase.user.js';
import type { AuthUser } from '../types/api.types.js';
import { AppError } from '../utils/appError.js';
import { loadBlockedUserIds } from './privacy.service.js';
import {
  nextNearbyDistanceTier,
  parseDistanceTierKm,
  profileWithinDistanceKm,
} from '../utils/discoverDistanceTiers.js';

export type DiscoverFilter = 'for-you' | 'nearby';

interface DiscoverAlgorithmVariantRow {
  id: string;
  feed_type: DiscoverFilter;
  name: string;
  code: string;
  description: string;
  score_weights: Record<string, number> | null;
}

interface DiscoverProfileRow {
  user_id: string;
  display_name: string;
  bio: string | null;
  headline: string | null;
  city: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  date_of_birth: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface DiscoverStatsRow {
  user_id: string;
  vibe_score: number | null;
  profile_views: number | null;
  matches_count: number | null;
}

interface DiscoverPostRow {
  id: string;
  user_id: string;
  kind: 'image' | 'video';
  public_url: string;
  poster_url: string | null;
  duration_sec: number | null;
  created_at: string;
}

interface UserLocationRow {
  latitude: number | null;
  longitude: number | null;
}

interface SwipePairRow {
  actor_user_id: string;
  target_user_id: string;
  action: 'pass' | 'like' | 'super_like' | 'hide' | 'report';
}

interface MatchPairRow {
  user_one_id: string;
  user_two_id: string;
  status: 'active' | 'hidden' | 'blocked' | 'unmatched';
}

interface InterestJoinRow {
  user_id: string;
  onboarding_options:
    | { option_key: string; label: string; emoji: string | null }
    | { option_key: string; label: string; emoji: string | null }[]
    | null;
}

interface RankedCandidate {
  profile: DiscoverProfileRow;
  score: number;
  distanceKm: number | null;
  likedYou: boolean;
}

export interface DiscoverProfileDto {
  id: string;
  name: string;
  age: number;
  bio: string;
  distance: string;
  distanceKm?: number;
  verified: boolean;
  vibeScore: number;
  interests: string[];
  avatar: string;
  likedYou: boolean;
  posts: Array<{
    id: string;
    type: 'image' | 'video';
    src: string;
    poster?: string;
    durationSec?: number;
  }>;
}

export interface DiscoverFeedResult {
  profiles: DiscoverProfileDto[];
  nextCursor: string | null;
  algorithm: {
    id: string;
    name: string;
    code: string;
    description: string;
  } | null;
  /** Active distance cap for this page (null = any distance). */
  distanceTierKm: number | null;
  /** Next wider nearby tier when the current one is exhausted (null = expand to any distance). */
  nextDistanceTierKm: number | null;
  expandedDistance: boolean;
  canExpandDistance: boolean;
}

const DEFAULT_SCORE_WEIGHTS: Record<string, number> = {
  interest_overlap: 0.24,
  distance: 0.18,
  vibe_score: 0.16,
  liked_you: 0.22,
  recency_decay: 0.1,
  verified_boost: 0.06,
  engagement_quality: 0.04,
};

function isMissingDiscoverSchema(message: string): boolean {
  return /discover_swipe_events|match_pairs|discover_algorithm_variants|discover_algorithm_assignments/i.test(
    message,
  );
}

function normalizeFilter(value: string | undefined): DiscoverFilter {
  return value === 'nearby' ? 'nearby' : 'for-you';
}

function clampLimit(input: number | undefined): number {
  const parsed = Number(input ?? 18);
  if (!Number.isFinite(parsed)) return 18;
  return Math.max(6, Math.min(50, Math.trunc(parsed)));
}

function clampAge(input: number | undefined, fallback: number): number {
  const parsed = Number(input ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(18, Math.min(99, Math.trunc(parsed)));
}

function clampMaxDistanceKm(input: number | undefined): number {
  const parsed = Number(input ?? 50);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(1, Math.min(100, Math.trunc(parsed)));
}

function parseExpandDistance(value: string | boolean | undefined): boolean {
  if (value === true) return true;
  if (value === 'true' || value === '1') return true;
  return false;
}

function matchesDiscoverAge(
  profile: DiscoverProfileRow,
  ageMin: number,
  ageMax: number,
): boolean {
  const age = ageFromDate(profile.date_of_birth);
  return age >= ageMin && age <= ageMax;
}

function applyDistanceCap(
  ranked: RankedCandidate[],
  filter: DiscoverFilter,
  maxDistanceKm: number | null,
): RankedCandidate[] {
  const withinDistance = ranked.filter((item) =>
    profileWithinDistanceKm(item.distanceKm, maxDistanceKm),
  );

  if (filter !== 'nearby') return withinDistance;

  return [...withinDistance].sort((a, b) => {
    const aDistance = a.distanceKm ?? Number.POSITIVE_INFINITY;
    const bDistance = b.distanceKm ?? Number.POSITIVE_INFINITY;
    if (aDistance !== bDistance) return aDistance - bDistance;
    if (b.score !== a.score) return b.score - a.score;
    return a.profile.user_id.localeCompare(b.profile.user_id);
  });
}

function ageFromDate(dateIso: string | null | undefined): number {
  if (!dateIso) return 25;
  const dob = new Date(dateIso);
  if (Number.isNaN(dob.getTime())) return 25;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    today.getMonth() < dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return Math.max(18, age);
}

function haversineKm(
  lat1: number | null,
  lon1: number | null,
  lat2: number | null,
  lon2: number | null,
): number | null {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

function distanceLabelFromKm(distanceKm: number | null): string {
  if (distanceKm === null) return '0.0 km away';
  if (distanceKm < 0.1) return '< 0.1 km away';
  return `${distanceKm.toFixed(1)} km away`;
}

function encodeCursor(score: number, userId: string): string {
  return Buffer.from(`${score.toFixed(6)}|${userId}`, 'utf8').toString('base64url');
}

function decodeCursor(cursor: string | undefined): { score: number; userId: string } | null {
  if (!cursor) return null;
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const [scoreText, userId] = decoded.split('|');
    const score = Number(scoreText);
    if (!Number.isFinite(score) || !userId) return null;
    return { score, userId };
  } catch {
    return null;
  }
}

function readWeight(
  variant: DiscoverAlgorithmVariantRow | null,
  key: keyof typeof DEFAULT_SCORE_WEIGHTS,
): number {
  const raw = variant?.score_weights?.[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  return DEFAULT_SCORE_WEIGHTS[key];
}

async function resolveAlgorithmVariant(
  userId: string,
  filter: DiscoverFilter,
  accessToken: string,
): Promise<DiscoverAlgorithmVariantRow | null> {
  const supabase = createSupabaseUserClient(accessToken);

  const assignment = await supabase
    .from('discover_algorithm_assignments')
    .select('algorithm_id, discover_algorithm_variants(id, feed_type, name, code, description, score_weights)')
    .eq('user_id', userId)
    .eq('feed_type', filter)
    .eq('is_active', true)
    .maybeSingle();

  if (assignment.error) {
    if (!isMissingDiscoverSchema(assignment.error.message)) {
      throw new AppError(500, 'DISCOVER_ALGO_ASSIGNMENT_FAILED', assignment.error.message);
    }
  } else {
    const joined = assignment.data?.discover_algorithm_variants as DiscoverAlgorithmVariantRow | DiscoverAlgorithmVariantRow[] | null;
    const variant = Array.isArray(joined) ? joined[0] : joined;
    if (variant) return variant;
  }

  const fallback = await supabase
    .from('discover_algorithm_variants')
    .select('id, feed_type, name, code, description, score_weights')
    .eq('feed_type', filter)
    .eq('is_active', true)
    .eq('is_default', true)
    .maybeSingle();

  if (fallback.error) {
    if (isMissingDiscoverSchema(fallback.error.message)) return null;
    throw new AppError(500, 'DISCOVER_ALGO_FAILED', fallback.error.message);
  }
  return (fallback.data as DiscoverAlgorithmVariantRow | null) ?? null;
}

async function loadCurrentUserContext(
  userId: string,
  accessToken: string,
): Promise<{
  location: UserLocationRow;
  interests: Set<string>;
}> {
  const supabase = createSupabaseUserClient(accessToken);
  const [locationResult, interestsResult] = await Promise.all([
    supabase.from('profiles').select('latitude, longitude').eq('user_id', userId).maybeSingle(),
    supabase
      .from('profile_interests')
      .select('onboarding_options(option_key)')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true }),
  ]);

  if (locationResult.error) {
    throw new AppError(500, 'DISCOVER_CONTEXT_FAILED', locationResult.error.message);
  }
  if (interestsResult.error) {
    throw new AppError(500, 'DISCOVER_CONTEXT_FAILED', interestsResult.error.message);
  }

  const interestKeys = new Set<string>();
  for (const row of interestsResult.data ?? []) {
    const option = row.onboarding_options as { option_key: string } | { option_key: string }[] | null;
    const resolved = Array.isArray(option) ? option[0] : option;
    if (resolved?.option_key) interestKeys.add(resolved.option_key);
  }

  return {
    location: (locationResult.data as UserLocationRow | null) ?? { latitude: null, longitude: null },
    interests: interestKeys,
  };
}

async function loadCandidates(
  authUser: AuthUser,
  accessToken: string,
): Promise<{
  profiles: DiscoverProfileRow[];
  statsByUserId: Map<string, DiscoverStatsRow>;
  postsByUserId: Map<string, DiscoverPostRow[]>;
  interestsByUserId: Map<string, string[]>;
  swipes: SwipePairRow[];
  matches: MatchPairRow[];
}> {
  const supabase = createSupabaseUserClient(accessToken);
  const profileResult = await supabase
    .from('profiles')
    .select(
      'user_id, display_name, bio, headline, city, avatar_url, is_verified, date_of_birth, latitude, longitude',
    )
    .neq('user_id', authUser.id)
    .eq('show_on_discover', true)
    .order('last_active_at', { ascending: false })
    .limit(220);

  if (profileResult.error) {
    throw new AppError(500, 'DISCOVER_PROFILES_FAILED', profileResult.error.message);
  }

  const profiles = (profileResult.data as DiscoverProfileRow[] | null) ?? [];
  const userIds = profiles.map((p) => p.user_id);

  if (userIds.length === 0) {
    return {
      profiles: [],
      statsByUserId: new Map(),
      postsByUserId: new Map(),
      interestsByUserId: new Map(),
      swipes: [],
      matches: [],
    };
  }

  const [statsResult, postsResult, interestsResult, swipesResult, reverseSwipesResult, matchesResult] =
    await Promise.all([
      supabase
        .from('profile_stats')
        .select('user_id, vibe_score, profile_views, matches_count')
        .in('user_id', userIds),
      supabase
        .from('profile_posts')
        .select('id, user_id, kind, public_url, poster_url, duration_sec, created_at')
        .eq('is_visible', true)
        .in('user_id', userIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('profile_interests')
        .select('user_id, onboarding_options(option_key, label, emoji)')
        .in('user_id', userIds)
        .order('sort_order', { ascending: true }),
      supabase
        .from('discover_swipe_events')
        .select('actor_user_id, target_user_id, action')
        .eq('actor_user_id', authUser.id)
        .in('target_user_id', userIds)
        .eq('is_active', true),
      supabase
        .from('discover_swipe_events')
        .select('actor_user_id, target_user_id, action')
        .in('actor_user_id', userIds)
        .eq('target_user_id', authUser.id)
        .in('action', ['like', 'super_like'])
        .eq('is_active', true),
      supabase
        .from('match_pairs')
        .select('user_one_id, user_two_id, status')
        .or(`user_one_id.eq.${authUser.id},user_two_id.eq.${authUser.id}`),
    ]);

  if (statsResult.error) throw new AppError(500, 'DISCOVER_STATS_FAILED', statsResult.error.message);
  if (postsResult.error) throw new AppError(500, 'DISCOVER_POSTS_FAILED', postsResult.error.message);
  if (interestsResult.error) throw new AppError(500, 'DISCOVER_INTERESTS_FAILED', interestsResult.error.message);
  if (swipesResult.error && !isMissingDiscoverSchema(swipesResult.error.message)) {
    throw new AppError(500, 'DISCOVER_SWIPES_FAILED', swipesResult.error.message);
  }
  if (reverseSwipesResult.error && !isMissingDiscoverSchema(reverseSwipesResult.error.message)) {
    throw new AppError(500, 'DISCOVER_REVERSE_SWIPES_FAILED', reverseSwipesResult.error.message);
  }
  if (matchesResult.error && !isMissingDiscoverSchema(matchesResult.error.message)) {
    throw new AppError(500, 'DISCOVER_MATCHES_FAILED', matchesResult.error.message);
  }

  const statsByUserId = new Map<string, DiscoverStatsRow>();
  for (const row of (statsResult.data as DiscoverStatsRow[] | null) ?? []) {
    statsByUserId.set(row.user_id, row);
  }

  const postsByUserId = new Map<string, DiscoverPostRow[]>();
  for (const row of (postsResult.data as DiscoverPostRow[] | null) ?? []) {
    const list = postsByUserId.get(row.user_id) ?? [];
    if (list.length < 3) list.push(row);
    postsByUserId.set(row.user_id, list);
  }

  const interestsByUserId = new Map<string, string[]>();
  for (const row of (interestsResult.data as InterestJoinRow[] | null) ?? []) {
    const option = row.onboarding_options;
    const resolved = Array.isArray(option) ? option[0] : option;
    if (!resolved?.option_key) continue;
    const list = interestsByUserId.get(row.user_id) ?? [];
    const label = resolved.label?.trim() || resolved.option_key;
    if (!list.includes(label)) list.push(label);
    interestsByUserId.set(row.user_id, list);
  }

  const swipes = [
    ...((swipesResult.data as SwipePairRow[] | null) ?? []),
    ...((reverseSwipesResult.data as SwipePairRow[] | null) ?? []),
  ];

  return {
    profiles,
    statsByUserId,
    postsByUserId,
    interestsByUserId,
    swipes,
    matches: (matchesResult.data as MatchPairRow[] | null) ?? [],
  };
}

function rankCandidates(params: {
  filter: DiscoverFilter;
  candidates: DiscoverProfileRow[];
  userLocation: UserLocationRow;
  userInterestKeys: Set<string>;
  statsByUserId: Map<string, DiscoverStatsRow>;
  interestsByUserId: Map<string, string[]>;
  reverseLikes: Set<string>;
  variant: DiscoverAlgorithmVariantRow | null;
}): RankedCandidate[] {
  const {
    filter,
    candidates,
    userLocation,
    userInterestKeys,
    statsByUserId,
    interestsByUserId,
    reverseLikes,
    variant,
  } = params;

  const now = Date.now();
  const ranked: RankedCandidate[] = [];

  for (const candidate of candidates) {
    const candidateInterests = interestsByUserId.get(candidate.user_id) ?? [];
    const overlapCount = candidateInterests.reduce(
      (count, key) => count + (userInterestKeys.has(key) ? 1 : 0),
      0,
    );
    const overlapScore =
      candidateInterests.length > 0 ? overlapCount / candidateInterests.length : 0;

    const distanceKm = haversineKm(
      userLocation.latitude,
      userLocation.longitude,
      candidate.latitude,
      candidate.longitude,
    );
    const distanceScore =
      distanceKm === null
        ? 0.35
        : filter === 'nearby'
          ? Math.max(0, 1 - distanceKm / 35)
          : Math.max(0, 1 - distanceKm / 100);

    const stats = statsByUserId.get(candidate.user_id);
    const vibeScore = Math.min(1, Math.max(0, (stats?.vibe_score ?? 80) / 100));
    const engagementScore = Math.min(1, ((stats?.profile_views ?? 0) + (stats?.matches_count ?? 0) * 20) / 1200);
    const recencyDecay = Math.max(0.15, 1 - (now - now) / 1_000_000); // placeholder stable signal

    const likedYou = reverseLikes.has(candidate.user_id);
    const likedYouScore = likedYou ? 1 : 0;
    const verifiedBoost = candidate.is_verified ? 1 : 0;

    const score =
      overlapScore * readWeight(variant, 'interest_overlap') +
      distanceScore * readWeight(variant, 'distance') +
      vibeScore * readWeight(variant, 'vibe_score') +
      likedYouScore * readWeight(variant, 'liked_you') +
      recencyDecay * readWeight(variant, 'recency_decay') +
      verifiedBoost * readWeight(variant, 'verified_boost') +
      engagementScore * readWeight(variant, 'engagement_quality');

    ranked.push({
      profile: candidate,
      score,
      distanceKm,
      likedYou,
    });
  }

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.profile.user_id.localeCompare(b.profile.user_id);
  });

  return ranked;
}

function applyCursor(items: RankedCandidate[], cursor: { score: number; userId: string } | null): RankedCandidate[] {
  if (!cursor) return items;
  return items.filter((item) => {
    if (item.score < cursor.score) return true;
    if (item.score > cursor.score) return false;
    return item.profile.user_id > cursor.userId;
  });
}

function resolveDiscoverBio(profile: DiscoverProfileRow): string {
  const bio = profile.bio?.trim() ?? '';
  if (bio) return bio;
  return profile.headline?.trim() ?? '';
}

function mapDiscoverProfile(params: {
  candidate: RankedCandidate;
  stats: DiscoverStatsRow | undefined;
  posts: DiscoverPostRow[];
  interestKeys: string[];
}): DiscoverProfileDto {
  const { candidate, stats, posts, interestKeys } = params;
  return {
    id: candidate.profile.user_id,
    name: candidate.profile.display_name,
    age: ageFromDate(candidate.profile.date_of_birth),
    bio: resolveDiscoverBio(candidate.profile),
    distance: distanceLabelFromKm(candidate.distanceKm),
    distanceKm: candidate.distanceKm ?? undefined,
    verified: candidate.profile.is_verified,
    vibeScore: stats?.vibe_score ?? 80,
    interests: interestKeys,
    avatar: candidate.profile.avatar_url ?? '',
    likedYou: candidate.likedYou,
    posts: posts.map((post) => ({
      id: post.id,
      type: post.kind,
      src: post.public_url,
      poster: post.poster_url ?? undefined,
      durationSec: post.duration_sec ?? undefined,
    })),
  };
}

async function persistImpressions(
  accessToken: string,
  userId: string,
  filter: DiscoverFilter,
  algorithmId: string | null,
  items: RankedCandidate[],
): Promise<void> {
  if (items.length === 0) return;
  const supabase = createSupabaseUserClient(accessToken);
  const payload = items.map((item, index) => ({
    actor_user_id: userId,
    target_user_id: item.profile.user_id,
    feed_type: filter,
    algorithm_id: algorithmId,
    rank_position: index + 1,
    score: Number(item.score.toFixed(5)),
  }));
  const { error } = await supabase.from('discover_feed_impressions').insert(payload);
  if (error) {
    if (isMissingDiscoverSchema(error.message)) return;
    // Telemetry must not break feed delivery.
    console.warn('[discover] impression logging skipped:', error.message);
  }
}

export async function getDiscoverFeed(
  authUser: AuthUser,
  accessToken: string,
  input: {
    filter?: string;
    limit?: number;
    cursor?: string;
    distanceTierKm?: string;
    maxDistanceKm?: number;
    ageMin?: number;
    ageMax?: number;
    expandDistance?: string | boolean;
  },
): Promise<DiscoverFeedResult> {
  const filter = normalizeFilter(input.filter);
  const limit = clampLimit(input.limit);
  const decodedCursor = decodeCursor(input.cursor);
  const ageMin = clampAge(input.ageMin, 18);
  const ageMax = Math.max(ageMin, clampAge(input.ageMax, 35));
  const maxFilterDistanceKm = clampMaxDistanceKm(input.maxDistanceKm);
  const expandedDistance = parseExpandDistance(input.expandDistance);
  const activeDistanceTierKm = expandedDistance
    ? null
    : parseDistanceTierKm(input.distanceTierKm, filter, maxFilterDistanceKm);

  const maxDistanceKm: number | null = expandedDistance
    ? null
    : filter === 'nearby'
      ? activeDistanceTierKm
      : maxFilterDistanceKm;

  const [variant, context, loaded, blockedIds] = await Promise.all([
    resolveAlgorithmVariant(authUser.id, filter, accessToken),
    loadCurrentUserContext(authUser.id, accessToken),
    loadCandidates(authUser, accessToken),
    loadBlockedUserIds(authUser.id, accessToken).catch(() => new Set<string>()),
  ]);

  const alreadySwiped = new Set(
    loaded.swipes
      .filter((event) => event.actor_user_id === authUser.id)
      .map((event) => event.target_user_id),
  );

  const blockedOrMatched = new Set<string>();
  for (const pair of loaded.matches) {
    if (pair.status !== 'active' && pair.status !== 'hidden' && pair.status !== 'blocked') continue;
    const counterpart =
      pair.user_one_id === authUser.id ? pair.user_two_id : pair.user_two_id === authUser.id ? pair.user_one_id : null;
    if (counterpart) blockedOrMatched.add(counterpart);
  }

  const reverseLikes = new Set(
    loaded.swipes
      .filter(
        (event) =>
          event.target_user_id === authUser.id &&
          (event.action === 'like' || event.action === 'super_like'),
      )
      .map((event) => event.actor_user_id),
  );

  const candidates = loaded.profiles.filter(
    (profile) =>
      !alreadySwiped.has(profile.user_id) &&
      !blockedOrMatched.has(profile.user_id) &&
      !blockedIds.has(profile.user_id),
  );

  const ranked = applyDistanceCap(
    rankCandidates({
      filter,
      candidates: candidates.filter((profile) =>
        matchesDiscoverAge(profile, ageMin, ageMax),
      ),
      userLocation: context.location,
      userInterestKeys: context.interests,
      statsByUserId: loaded.statsByUserId,
      interestsByUserId: loaded.interestsByUserId,
      reverseLikes,
      variant,
    }),
    filter,
    maxDistanceKm,
  );

  const paged = applyCursor(ranked, decodedCursor).slice(0, limit);
  const profiles = paged.map((candidate) =>
    mapDiscoverProfile({
      candidate,
      stats: loaded.statsByUserId.get(candidate.profile.user_id),
      posts: loaded.postsByUserId.get(candidate.profile.user_id) ?? [],
      interestKeys: loaded.interestsByUserId.get(candidate.profile.user_id) ?? [],
    }),
  );

  const next = applyCursor(ranked, decodedCursor)[limit] ?? null;
  const nextCursor = next ? encodeCursor(next.score, next.profile.user_id) : null;

  const nextDistanceTierKm =
    !expandedDistance && filter === 'nearby'
      ? nextNearbyDistanceTier(activeDistanceTierKm, maxFilterDistanceKm)
      : null;

  const canExpandDistance =
    !expandedDistance &&
    nextCursor === null &&
    (filter === 'for-you' || nextDistanceTierKm === null);

  await persistImpressions(accessToken, authUser.id, filter, variant?.id ?? null, paged);

  return {
    profiles,
    nextCursor,
    algorithm: variant
      ? {
          id: variant.id,
          name: variant.name,
          code: variant.code,
          description: variant.description,
        }
      : null,
    distanceTierKm: activeDistanceTierKm,
    nextDistanceTierKm,
    expandedDistance,
    canExpandDistance,
  };
}

export async function getDiscoverProfileById(
  profileId: string,
  accessToken: string,
): Promise<DiscoverProfileDto> {
  const supabase = createSupabaseUserClient(accessToken);
  const [profileResult, statsResult, postsResult, interestsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('user_id, display_name, bio, headline, city, avatar_url, is_verified, date_of_birth')
      .eq('user_id', profileId)
      .eq('show_on_discover', true)
      .maybeSingle(),
    supabase
      .from('profile_stats')
      .select('user_id, vibe_score, profile_views, matches_count')
      .eq('user_id', profileId)
      .maybeSingle(),
    supabase
      .from('profile_posts')
      .select('id, user_id, kind, public_url, poster_url, duration_sec, created_at')
      .eq('user_id', profileId)
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('profile_interests')
      .select('user_id, onboarding_options(option_key)')
      .eq('user_id', profileId)
      .order('sort_order', { ascending: true }),
  ]);

  if (profileResult.error) throw new AppError(500, 'PROFILE_READ_FAILED', profileResult.error.message);
  if (!profileResult.data) throw new AppError(404, 'PROFILE_NOT_FOUND', `Profile ${profileId} not found`);
  if (statsResult.error) throw new AppError(500, 'PROFILE_STATS_READ_FAILED', statsResult.error.message);
  if (postsResult.error) throw new AppError(500, 'PROFILE_POSTS_READ_FAILED', postsResult.error.message);
  if (interestsResult.error) throw new AppError(500, 'PROFILE_INTERESTS_READ_FAILED', interestsResult.error.message);

  const profile = profileResult.data as DiscoverProfileRow;
  const stats = statsResult.data as DiscoverStatsRow | null;
  const posts = (postsResult.data as DiscoverPostRow[] | null) ?? [];
  const interests = ((interestsResult.data as InterestJoinRow[] | null) ?? [])
    .map((row) => {
      const option = row.onboarding_options as { option_key: string } | { option_key: string }[] | null;
      const resolved = Array.isArray(option) ? option[0] : option;
      return resolved?.option_key ?? null;
    })
    .filter((item): item is string => Boolean(item));

  return {
    id: profile.user_id,
    name: profile.display_name,
    age: ageFromDate(profile.date_of_birth),
    bio: resolveDiscoverBio(profile),
    distance: profile.city ? `${profile.city}` : 'Unknown distance',
    verified: profile.is_verified,
    vibeScore: stats?.vibe_score ?? 80,
    interests,
    avatar: profile.avatar_url ?? '',
    likedYou: false,
    posts: posts.map((post) => ({
      id: post.id,
      type: post.kind,
      src: post.public_url,
      poster: post.poster_url ?? undefined,
      durationSec: post.duration_sec ?? undefined,
    })),
  };
}
