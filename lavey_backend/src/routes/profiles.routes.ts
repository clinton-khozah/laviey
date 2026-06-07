import { Router } from 'express';
import { profilesController } from '../controllers/profiles.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const profilesRoutes = Router();

profilesRoutes.get('/discover', requireAuth, (req, res, next) => {
  profilesController.getDiscoverFeed(req, res).catch(next);
});
profilesRoutes.get('/:id', requireAuth, (req, res, next) => {
  profilesController.getProfileById(req, res).catch(next);
});
