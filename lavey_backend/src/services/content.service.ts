import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import {
  ALLOWED_IMAGE_MIME,
  ALLOWED_VIDEO_MIME,
  CONTENT_BUCKET,
  MAX_CONTENT_BYTES,
  MAX_PROFILE_POSTS,
  avatarStoragePath,
  extensionForMime,
  postMediaStoragePath,
  postPosterStoragePath,
} from '../constants/content.js';
import { createSupabaseUserClient } from '../lib/supabase.user.js';
import { AppError } from '../utils/appError.js';
import type { AuthUser } from '../types/api.types.js';
import { enrichPostsWithLikes } from './post-like.service.js';

export interface ProfilePostDto {
  id: string;
  type: 'image' | 'video';
  src: string;
  poster?: string;
  durationSec?: number;
  likeCount: number;
  likedByMe?: boolean;
  likerIds?: string[];
}

interface PostRow {
  id: string;
  kind: 'image' | 'video';
  public_url: string;
  poster_url: string | null;
  duration_sec: number | null;
  storage_path: string;
  poster_path: string | null;
  sort_order: number;
}

export interface CreatePostInput {
  caption?: string;
  tags?: string[];
  durationSec?: number;
}

function publicUrlForPath(path: string): string {
  return `${env.SUPABASE_URL}/storage/v1/object/public/${CONTENT_BUCKET}/${path}`;
}

function assertFileSize(bytes: number, label: string): void {
  if (bytes <= 0) {
    throw new AppError(400, 'CONTENT_EMPTY', `${label} is empty`);
  }
  if (bytes > MAX_CONTENT_BYTES) {
    throw new AppError(
      400,
      'CONTENT_TOO_LARGE',
      `${label} must be 3 MB or smaller`,
    );
  }
}

async function uploadBuffer(
  accessToken: string,
  path: string,
  buffer: Buffer,
  contentType: string,
  upsert: boolean,
): Promise<string> {
  const client = createSupabaseUserClient(accessToken);
  const { error } = await client.storage.from(CONTENT_BUCKET).upload(path, buffer, {
    contentType,
    upsert,
    cacheControl: '31536000',
  });

  if (error) {
    throw new AppError(400, 'CONTENT_UPLOAD_FAILED', error.message);
  }

  return publicUrlForPath(path);
}

async function removeStoragePaths(accessToken: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const client = createSupabaseUserClient(accessToken);
  const { error } = await client.storage.from(CONTENT_BUCKET).remove(paths);
  if (error) {
    throw new AppError(500, 'CONTENT_DELETE_FAILED', error.message);
  }
}

function mapPostRow(row: PostRow): ProfilePostDto {
  return {
    id: row.id,
    type: row.kind,
    src: row.public_url,
    poster: row.poster_url ?? undefined,
    durationSec: row.duration_sec ?? undefined,
    likeCount: 0,
  };
}

export async function listUserPosts(userId: string, accessToken: string): Promise<ProfilePostDto[]> {
  const client = createSupabaseUserClient(accessToken);
  const { data, error } = await client
    .from('profile_posts')
    .select('id, kind, public_url, poster_url, duration_sec, storage_path, poster_path, sort_order')
    .eq('user_id', userId)
    .eq('is_visible', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(500, 'POSTS_READ_FAILED', error.message);
  }

  const rows = ((data ?? []) as PostRow[]).map(mapPostRow);
  const likeMeta = await enrichPostsWithLikes(userId, accessToken, rows.map((row) => row.id));

  return rows.map((row) => {
    const meta = likeMeta.get(row.id);
    if (!meta) return row;
    return {
      ...row,
      likeCount: meta.likeCount,
      likerIds: meta.likerIds,
      likedByMe: meta.likedByMe,
    };
  });
}

async function countUserPosts(userId: string, accessToken: string): Promise<number> {
  const client = createSupabaseUserClient(accessToken);
  const { count, error } = await client
    .from('profile_posts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    throw new AppError(500, 'POSTS_COUNT_FAILED', error.message);
  }

  return count ?? 0;
}

export async function uploadAvatar(
  authUser: AuthUser,
  accessToken: string,
  file: Express.Multer.File,
): Promise<string> {
  if (!ALLOWED_IMAGE_MIME.has(file.mimetype)) {
    throw new AppError(400, 'INVALID_AVATAR_TYPE', 'Avatar must be JPEG, PNG, or WebP');
  }

  assertFileSize(file.size, 'Avatar');

  const path = avatarStoragePath(authUser.id);
  const publicUrl = await uploadBuffer(accessToken, path, file.buffer, file.mimetype, true);

  const client = createSupabaseUserClient(accessToken);
  const { error } = await client
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('user_id', authUser.id);

  if (error) {
    throw new AppError(500, 'AVATAR_UPDATE_FAILED', error.message);
  }

  return publicUrl;
}

export async function createProfilePost(
  authUser: AuthUser,
  accessToken: string,
  mediaFile: Express.Multer.File,
  posterFile: Express.Multer.File | undefined,
  input: CreatePostInput,
): Promise<ProfilePostDto> {
  const isImage = ALLOWED_IMAGE_MIME.has(mediaFile.mimetype);

  if (!isImage) {
    if (ALLOWED_VIDEO_MIME.has(mediaFile.mimetype)) {
      throw new AppError(400, 'VIDEO_NOT_ALLOWED', 'Only photos are allowed. Videos are not supported.');
    }
    throw new AppError(400, 'INVALID_MEDIA_TYPE', 'Upload a photo (JPEG, PNG, WebP, or GIF)');
  }

  assertFileSize(mediaFile.size, 'Photo');

  if (posterFile) {
    throw new AppError(400, 'POSTER_NOT_ALLOWED', 'Posters are only used for videos');
  }

  const postId = randomUUID();
  const mediaExt = extensionForMime(mediaFile.mimetype);
  const mediaPath = postMediaStoragePath(authUser.id, postId, mediaExt);

  const publicUrl = await uploadBuffer(
    accessToken,
    mediaPath,
    mediaFile.buffer,
    mediaFile.mimetype,
    false,
  );

  const caption = (input.caption ?? '').trim().slice(0, 120);
  const tags = (input.tags ?? [])
    .map((tag) => tag.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 4);

  const client = createSupabaseUserClient(accessToken);

  const postCount = await countUserPosts(authUser.id, accessToken);
  if (postCount >= MAX_PROFILE_POSTS) {
    throw new AppError(
      400,
      'POST_LIMIT_REACHED',
      `You can have at most ${MAX_PROFILE_POSTS} posts on your profile`,
    );
  }

  const { data: sortRow } = await client
    .from('profile_posts')
    .select('sort_order')
    .eq('user_id', authUser.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSort = ((sortRow?.sort_order as number | undefined) ?? 0) + 1;

  const { data, error } = await client
    .from('profile_posts')
    .insert({
      id: postId,
      user_id: authUser.id,
      kind: 'image',
      storage_path: mediaPath,
      poster_path: null,
      public_url: publicUrl,
      poster_url: null,
      caption,
      tags,
      duration_sec: null,
      file_size_bytes: mediaFile.size,
      mime_type: mediaFile.mimetype,
      sort_order: nextSort,
    })
    .select('id, kind, public_url, poster_url, duration_sec, storage_path, poster_path, sort_order')
    .single();

  if (error || !data) {
    await removeStoragePaths(accessToken, [mediaPath]);
    throw new AppError(500, 'POST_CREATE_FAILED', error?.message ?? 'Could not save post');
  }

  return mapPostRow(data as PostRow);
}

export async function updateProfilePostVisibility(
  authUser: AuthUser,
  accessToken: string,
  postId: string,
  isVisible: boolean,
): Promise<void> {
  const client = createSupabaseUserClient(accessToken);
  const { data, error } = await client
    .from('profile_posts')
    .update({ is_visible: isVisible })
    .eq('id', postId)
    .eq('user_id', authUser.id)
    .select('id')
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'POST_UPDATE_FAILED', error.message);
  }

  if (!data) {
    throw new AppError(404, 'POST_NOT_FOUND', 'Post not found');
  }
}

export async function deleteProfilePost(
  authUser: AuthUser,
  accessToken: string,
  postId: string,
): Promise<void> {
  const client = createSupabaseUserClient(accessToken);
  const { data, error } = await client
    .from('profile_posts')
    .select('storage_path, poster_path')
    .eq('id', postId)
    .eq('user_id', authUser.id)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'POST_READ_FAILED', error.message);
  }

  if (!data) {
    throw new AppError(404, 'POST_NOT_FOUND', 'Post not found');
  }

  const paths = [data.storage_path as string, data.poster_path as string | null].filter(
    (path): path is string => Boolean(path),
  );

  try {
    await removeStoragePaths(accessToken, paths);
  } catch {
    /* storage files may already be removed */
  }

  const { error: deleteError } = await client
    .from('profile_posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', authUser.id);

  if (deleteError) {
    throw new AppError(500, 'POST_DELETE_FAILED', deleteError.message);
  }
}
