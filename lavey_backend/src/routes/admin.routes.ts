import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { adminAuthController } from '../controllers/admin-auth.controller.js';
import { requireAdmin } from '../middleware/admin.middleware.js';

export const adminRoutes = Router();

adminRoutes.get('/auth/registration-status', (req, res, next) => {
  void adminAuthController.registrationStatus(req, res).catch(next);
});

adminRoutes.post('/auth/register', (req, res, next) => {
  void adminAuthController.register(req, res).catch(next);
});

adminRoutes.post('/auth/login', (req, res, next) => {
  void adminAuthController.login(req, res).catch(next);
});

adminRoutes.get('/auth/me', requireAdmin, (req, res, next) => {
  void adminAuthController.me(req, res).catch(next);
});

adminRoutes.use(requireAdmin);

adminRoutes.get('/users', (req, res, next) => {
  void adminController.listUsers(req, res).catch(next);
});

adminRoutes.get('/users/:id', (req, res, next) => {
  void adminController.getUser(req, res).catch(next);
});

adminRoutes.get('/support/tickets', (req, res, next) => {
  void adminController.listSupportTickets(req, res).catch(next);
});

adminRoutes.get('/support/tickets/:id', (req, res, next) => {
  void adminController.getSupportTicket(req, res).catch(next);
});

adminRoutes.post('/support/tickets/:id/messages', (req, res, next) => {
  void adminController.replySupportTicket(req, res).catch(next);
});

adminRoutes.patch('/support/tickets/:id', (req, res, next) => {
  void adminController.updateSupportTicket(req, res).catch(next);
});
