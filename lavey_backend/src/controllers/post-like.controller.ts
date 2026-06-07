import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import {
  likePost,
  listPostLikers,
  listReceivedPostLikes,
  unlikePost,
} from '../services/post-like.service.js';
import { successResponse } from '../utils/apiResponse.js';

export const postLikeController = {
  async like(req: AuthenticatedRequest, res: Response): Promise<void> {
    const postId = typeof req.params.postId === 'string' ? req.params.postId : req.params.postId[0];
    const result = await likePost(req.authUser!, req.accessToken!, postId);
    res.json(successResponse(result, result.matched ? "It's a match!" : 'Post liked'));
  },

  async unlike(req: AuthenticatedRequest, res: Response): Promise<void> {
    const postId = typeof req.params.postId === 'string' ? req.params.postId : req.params.postId[0];
    const result = await unlikePost(req.authUser!, req.accessToken!, postId);
    res.json(successResponse(result, 'Like removed'));
  },

  async listForMyPost(req: AuthenticatedRequest, res: Response): Promise<void> {
    const postId = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
    const likers = await listPostLikers(req.authUser!, req.accessToken!, postId);
    res.json(successResponse(likers));
  },

  async listReceived(req: AuthenticatedRequest, res: Response): Promise<void> {
    const items = await listReceivedPostLikes(req.authUser!, req.accessToken!);
    res.json(successResponse(items));
  },
};
