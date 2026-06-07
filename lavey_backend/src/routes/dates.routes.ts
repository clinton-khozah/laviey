import { Router } from 'express';
import { datesController } from '../controllers/rooms.controller.js';

export const datesRoutes = Router();

datesRoutes.get('/invites', (req, res, next) => {
  try {
    datesController.listInvites(req, res);
  } catch (error) {
    next(error);
  }
});

datesRoutes.post('/join-by-code', (req, res, next) => {
  try {
    datesController.joinByCode(req, res);
  } catch (error) {
    next(error);
  }
});

datesRoutes.post('/', (req, res, next) => {
  try {
    datesController.createDate(req, res);
  } catch (error) {
    next(error);
  }
});

datesRoutes.post('/invites/:id', (req, res, next) => {
  try {
    datesController.respondToInvite(req, res);
  } catch (error) {
    next(error);
  }
});
