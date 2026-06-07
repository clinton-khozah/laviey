import { Router } from 'express';
import { roomsController } from '../controllers/rooms.controller.js';

export const roomsRoutes = Router();

roomsRoutes.get('/vibe-check', (req, res, next) => {
  try {
    roomsController.listVibeCheck(req, res);
  } catch (error) {
    next(error);
  }
});

roomsRoutes.post('/vibe-check/:id/join', (req, res, next) => {
  try {
    roomsController.joinVibeCheck(req, res);
  } catch (error) {
    next(error);
  }
});
