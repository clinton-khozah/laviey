import { Router } from 'express';
import { postLikeController } from '../controllers/post-like.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const postsRoutes = Router();

postsRoutes.post('/:postId/like', requireAuth, (req, res, next) => {
  postLikeController.like(req, res).catch(next);
});

postsRoutes.delete('/:postId/like', requireAuth, (req, res, next) => {
  postLikeController.unlike(req, res).catch(next);
});
