import { Router } from 'express';
import { metaController } from '../controllers/meta.controller.js';

export const metaRoutes = Router();

metaRoutes.get('/routes', metaController.listRoutes);
