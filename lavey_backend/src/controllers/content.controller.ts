import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import {
  createProfilePost,
  deleteProfilePost,
  listUserPosts,
  updateProfilePostVisibility,
  uploadAvatar,
} from '../services/content.service.js';
import { successResponse } from '../utils/apiResponse.js';
import { AppError } from '../utils/appError.js';

const updatePostBodySchema = z.object({
  isVisible: z.boolean(),
});

const createPostFieldsSchema = z.object({
  caption: z.string().max(120).optional(),
  tags: z.string().optional(),
  durationSec: z.coerce.number().int().min(1).max(60).optional(),
});

function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
  } catch {
    return raw
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

export const contentController = {
  async listMyPosts(req: AuthenticatedRequest, res: Response): Promise<void> {
    const posts = await listUserPosts(req.authUser!.id, req.accessToken!);
    res.json(successResponse(posts));
  },

  async uploadAvatar(req: AuthenticatedRequest, res: Response): Promise<void> {
    const file = req.file;
    if (!file) {
      throw new AppError(400, 'AVATAR_REQUIRED', 'Choose a photo to upload');
    }

    const avatarUrl = await uploadAvatar(req.authUser!, req.accessToken!, file);
    res.json(successResponse({ avatarUrl }, 'Avatar updated'));
  },

  async createPost(req: AuthenticatedRequest, res: Response): Promise<void> {
    const media = req.files && !Array.isArray(req.files) ? req.files.media?.[0] : undefined;
    const poster =
      req.files && !Array.isArray(req.files) ? req.files.poster?.[0] : undefined;

    if (!media) {
      throw new AppError(400, 'MEDIA_REQUIRED', 'Photo file is required');
    }

    const fields = createPostFieldsSchema.parse(req.body);
    const post = await createProfilePost(req.authUser!, req.accessToken!, media, poster, {
      caption: fields.caption,
      tags: parseTags(fields.tags),
      durationSec: fields.durationSec,
    });

    res.status(201).json(successResponse(post, 'Post published'));
  },

  async updatePost(req: AuthenticatedRequest, res: Response): Promise<void> {
    const postId = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
    const body = updatePostBodySchema.parse(req.body);
    await updateProfilePostVisibility(req.authUser!, req.accessToken!, postId, body.isVisible);
    res.json(successResponse({ updated: true }, 'Post updated'));
  },

  async deletePost(req: AuthenticatedRequest, res: Response): Promise<void> {
    const postId = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
    await deleteProfilePost(req.authUser!, req.accessToken!, postId);
    res.json(successResponse({ deleted: true }, 'Post deleted'));
  },
};
