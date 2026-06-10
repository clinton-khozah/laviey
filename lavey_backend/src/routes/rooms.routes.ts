import { Router } from 'express';
import { roomsController } from '../controllers/rooms.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const roomsRoutes = Router();

roomsRoutes.get('/vibe-check', requireAuth, (req, res, next) => {
  roomsController.listVibeCheck(req, res).catch(next);
});

roomsRoutes.post('/vibe-check/:id/join', requireAuth, (req, res, next) => {
  roomsController.joinVibeCheck(req, res).catch(next);
});
