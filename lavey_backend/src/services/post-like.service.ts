import { createSupabaseUserClient } from '../lib/supabase.user.js';
import type { AuthUser } from '../types/api.types.js';
import { AppError } from '../utils/appError.js';
import { ensureActiveMatch } from './match-pair.util.js';

interface PostOwnerRow {
  id: string;
  user_id: string;
  is_visible: boolean;
  public_url: string;
}

interface ProfileLiteRow {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface PostLikerDto {
  userId: string;
  name: string;
  avatar: string;
  likedAt: string;
}

export interface LikePostResult {
  liked: boolean;
  likeCount: number;
  matched: boolean;
  matchId?: string;
  ownerUserId: string;
  ownerName: string;
  ownerAvatar: string;
  myAvatar: string;
}

export interface ReceivedPostLikeDto {
  userId: string;
  name: string;
  avatar: string;
  postId: string;
  postThumbnail: string;
  likedBack: boolean;
}

function isMissingSchema(message: string): boolean {
  return /profile_post_likes|match_pairs|discover_swipe_events/i.test(message);
}

async function loadPostForLike(
  supabase: ReturnType<typeof createSupabaseUserClient>,
  postId: string,
): Promise<PostOwnerRow> {
  const { data, error } = await supabase
    .from('profile_posts')
    .select('id, user_id, is_visible, public_url')
    .eq('id', postId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'POST_READ_FAILED', error.message);
  }
  if (!data || !data.is_visible) {
    throw new AppError(404, 'POST_NOT_FOUND', 'Post not found');
  }

  return data as PostOwnerRow;
}

async function countLikes(
  supabase: ReturnType<typeof createSupabaseUserClient>,
  postId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from('profile_post_likes')
    .select('id', { count: 'exact', head: true })
    .eq('post_id', postId);

  if (error) {
    if (isMissingSchema(error.message)) {
      throw new AppError(
        500,
        'POST_LIKES_SCHEMA_MISSING',
        'Post likes table is missing. Run sql/010_profile_post_likes.sql in Supabase.',
      );
    }
    throw new AppError(500, 'POST_LIKE_COUNT_FAILED', error.message);
  }

  return count ?? 0;
}

async function hasReciprocalEngagement(
  supabase: ReturnType<typeof createSupabaseUserClient>,
  ownerUserId: string,
  likerUserId: string,
): Promise<boolean> {
  const ownerPosts = await supabase
    .from('profile_posts')
    .select('id')
    .eq('user_id', likerUserId)
    .eq('is_visible', true);

  if (ownerPosts.error) {
    throw new AppError(500, 'POST_RECIPROCAL_POSTS_FAILED', ownerPosts.error.message);
  }

  const postIds = ((ownerPosts.data ?? []) as Array<{ id: string }>).map((row) => row.id);
  if (postIds.length > 0) {
    const likedBack = await supabase
      .from('profile_post_likes')
      .select('id')
      .eq('liker_user_id', ownerUserId)
      .in('post_id', postIds)
      .limit(1)
      .maybeSingle();

    if (likedBack.error && !isMissingSchema(likedBack.error.message)) {
      throw new AppError(500, 'POST_RECIPROCAL_CHECK_FAILED', likedBack.error.message);
    }
    if (likedBack.data) return true;
  }

  const profileLike = await supabase
    .from('discover_swipe_events')
    .select('id')
    .eq('actor_user_id', ownerUserId)
    .eq('target_user_id', likerUserId)
    .in('action', ['like', 'super_like'])
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (profileLike.error && !isMissingSchema(profileLike.error.message)) {
    throw new AppError(500, 'PROFILE_RECIPROCAL_CHECK_FAILED', profileLike.error.message);
  }

  return Boolean(profileLike.data);
}

export async function likePost(
  authUser: AuthUser,
  accessToken: string,
  postId: string,
): Promise<LikePostResult> {
  const supabase = createSupabaseUserClient(accessToken);
  const post = await loadPostForLike(supabase, postId);

  if (post.user_id === authUser.id) {
    throw new AppError(400, 'CANNOT_LIKE_OWN_POST', 'You cannot like your own post');
  }

  const ownerResult = await supabase
    .from('profiles')
    .select('user_id, display_name, avatar_url')
    .eq('user_id', post.user_id)
    .maybeSingle();

  if (ownerResult.error || !ownerResult.data) {
    throw new AppError(404, 'PROFILE_NOT_FOUND', 'Post owner no longer available');
  }

  const owner = ownerResult.data as ProfileLiteRow;

  const meResult = await supabase
    .from('profiles')
    .select('user_id, display_name, avatar_url')
    .eq('user_id', authUser.id)
    .maybeSingle();

  if (meResult.error || !meResult.data) {
    throw new AppError(500, 'PROFILE_READ_FAILED', meResult.error?.message ?? 'Could not load your profile');
  }

  const me = meResult.data as ProfileLiteRow;

  const { error: insertError } = await supabase.from('profile_post_likes').insert({
    post_id: postId,
    liker_user_id: authUser.id,
  });

  if (insertError) {
    if (insertError.code === '23505') {
      const likeCount = await countLikes(supabase, postId);
      return {
        liked: true,
        likeCount,
        matched: false,
        ownerUserId: owner.user_id,
        ownerName: owner.display_name,
        ownerAvatar: owner.avatar_url ?? '',
        myAvatar: me.avatar_url ?? '',
      };
    }
    if (isMissingSchema(insertError.message)) {
      throw new AppError(
        500,
        'POST_LIKES_SCHEMA_MISSING',
        'Post likes table is missing. Run sql/010_profile_post_likes.sql in Supabase.',
      );
    }
    throw new AppError(500, 'POST_LIKE_FAILED', insertError.message);
  }

  const likeCount = await countLikes(supabase, postId);
  const reciprocal = await hasReciprocalEngagement(supabase, post.user_id, authUser.id);

  let matchId: string | undefined;
  if (reciprocal) {
    matchId = await ensureActiveMatch(
      supabase,
      authUser.id,
      post.user_id,
      'for-you',
      'post_like',
      authUser.id,
      accessToken,
    );
  }

  return {
    liked: true,
    likeCount,
    matched: reciprocal,
    matchId,
    ownerUserId: owner.user_id,
    ownerName: owner.display_name,
    ownerAvatar: owner.avatar_url ?? '',
    myAvatar: me.avatar_url ?? '',
  };
}

export async function unlikePost(
  authUser: AuthUser,
  accessToken: string,
  postId: string,
): Promise<{ likeCount: number }> {
  const supabase = createSupabaseUserClient(accessToken);
  await loadPostForLike(supabase, postId);

  const { error } = await supabase
    .from('profile_post_likes')
    .delete()
    .eq('post_id', postId)
    .eq('liker_user_id', authUser.id);

  if (error) {
    throw new AppError(500, 'POST_UNLIKE_FAILED', error.message);
  }

  const likeCount = await countLikes(supabase, postId);
  return { likeCount };
}

export async function listPostLikers(
  authUser: AuthUser,
  accessToken: string,
  postId: string,
): Promise<PostLikerDto[]> {
  const supabase = createSupabaseUserClient(accessToken);
  const post = await loadPostForLike(supabase, postId);

  if (post.user_id !== authUser.id) {
    throw new AppError(403, 'FORBIDDEN', 'Only the post owner can see who liked this post');
  }

  const { data, error } = await supabase
    .from('profile_post_likes')
    .select('liker_user_id, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(500, 'POST_LIKERS_READ_FAILED', error.message);
  }

  const rows = (data ?? []) as Array<{ liker_user_id: string; created_at: string }>;
  if (rows.length === 0) return [];

  const likerIds = rows.map((row) => row.liker_user_id);
  const profilesResult = await supabase
    .from('profiles')
    .select('user_id, display_name, avatar_url')
    .in('user_id', likerIds);

  if (profilesResult.error) {
    throw new AppError(500, 'POST_LIKERS_PROFILE_FAILED', profilesResult.error.message);
  }

  const profileById = new Map<string, ProfileLiteRow>();
  for (const row of (profilesResult.data as ProfileLiteRow[] | null) ?? []) {
    profileById.set(row.user_id, row);
  }

  return rows
    .map((row) => {
      const profile = profileById.get(row.liker_user_id);
      if (!profile) return null;
      return {
        userId: profile.user_id,
        name: profile.display_name,
        avatar: profile.avatar_url ?? '',
        likedAt: row.created_at,
      };
    })
    .filter((item): item is PostLikerDto => item !== null);
}

export async function listReceivedPostLikes(
  authUser: AuthUser,
  accessToken: string,
): Promise<ReceivedPostLikeDto[]> {
  const supabase = createSupabaseUserClient(accessToken);

  const { data: myPosts, error: postsError } = await supabase
    .from('profile_posts')
    .select('id, public_url')
    .eq('user_id', authUser.id);

  if (postsError) {
    throw new AppError(500, 'POSTS_READ_FAILED', postsError.message);
  }

  const posts = (myPosts ?? []) as Array<{ id: string; public_url: string }>;
  if (posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);
  const thumbByPostId = new Map(posts.map((p) => [p.id, p.public_url]));

  const { data: likes, error: likesError } = await supabase
    .from('profile_post_likes')
    .select('post_id, liker_user_id, created_at')
    .in('post_id', postIds)
    .order('created_at', { ascending: false });

  if (likesError) {
    if (isMissingSchema(likesError.message)) return [];
    throw new AppError(500, 'RECEIVED_LIKES_READ_FAILED', likesError.message);
  }

  const likeRows = (likes ?? []) as Array<{
    post_id: string;
    liker_user_id: string;
    created_at: string;
  }>;
  if (likeRows.length === 0) return [];

  const likerIds = [...new Set(likeRows.map((row) => row.liker_user_id))];

  const [profilesResult, mySwipesResult, matchesResult] = await Promise.all([
    supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', likerIds),
    supabase
      .from('discover_swipe_events')
      .select('target_user_id')
      .eq('actor_user_id', authUser.id)
      .in('target_user_id', likerIds)
      .in('action', ['like', 'super_like'])
      .eq('is_active', true),
    supabase
      .from('match_pairs')
      .select('user_one_id, user_two_id')
      .eq('status', 'active')
      .or(`user_one_id.eq.${authUser.id},user_two_id.eq.${authUser.id}`),
  ]);

  if (profilesResult.error) {
    throw new AppError(500, 'RECEIVED_LIKERS_PROFILE_FAILED', profilesResult.error.message);
  }

  const profileById = new Map<string, ProfileLiteRow>();
  for (const row of (profilesResult.data as ProfileLiteRow[] | null) ?? []) {
    profileById.set(row.user_id, row);
  }

  const likedBackIds = new Set<string>();
  for (const row of (mySwipesResult.data ?? []) as Array<{ target_user_id: string }>) {
    likedBackIds.add(row.target_user_id);
  }
  for (const row of (matchesResult.data ?? []) as Array<{ user_one_id: string; user_two_id: string }>) {
    const other = row.user_one_id === authUser.id ? row.user_two_id : row.user_one_id;
    likedBackIds.add(other);
  }

  const seen = new Set<string>();
  const items: ReceivedPostLikeDto[] = [];

  for (const row of likeRows) {
    if (seen.has(row.liker_user_id)) continue;
    seen.add(row.liker_user_id);
    const profile = profileById.get(row.liker_user_id);
    if (!profile) continue;
    items.push({
      userId: profile.user_id,
      name: profile.display_name,
      avatar: profile.avatar_url ?? '',
      postId: row.post_id,
      postThumbnail: thumbByPostId.get(row.post_id) ?? '',
      likedBack: likedBackIds.has(profile.user_id),
    });
  }

  return items;
}

export async function enrichPostsWithLikes(
  authUserId: string,
  accessToken: string,
  postIds: string[],
): Promise<Map<string, { likeCount: number; likerIds: string[]; likedByMe: boolean }>> {
  const result = new Map<string, { likeCount: number; likerIds: string[]; likedByMe: boolean }>();
  if (postIds.length === 0) return result;

  const supabase = createSupabaseUserClient(accessToken);

  const { data, error } = await supabase
    .from('profile_post_likes')
    .select('post_id, liker_user_id')
    .in('post_id', postIds);

  if (error) {
    if (isMissingSchema(error.message)) return result;
    throw new AppError(500, 'POST_LIKES_ENRICH_FAILED', error.message);
  }

  for (const postId of postIds) {
    result.set(postId, { likeCount: 0, likerIds: [], likedByMe: false });
  }

  for (const row of (data ?? []) as Array<{ post_id: string; liker_user_id: string }>) {
    const entry = result.get(row.post_id);
    if (!entry) continue;
    entry.likeCount += 1;
    entry.likerIds.push(row.liker_user_id);
    if (row.liker_user_id === authUserId) {
      entry.likedByMe = true;
    }
  }

  return result;
}
