import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const authRoutes = Router();

authRoutes.get('/google', (req, res, next) => {
  void authController.startGoogleOAuth(req, res).catch(next);
});
authRoutes.get('/google/callback', (req, res, next) => {
  void authController.googleOAuthCallback(req, res).catch(next);
});
authRoutes.post('/google', (req, res, next) => {
  void authController.signInWithGoogleToken(req, res).catch(next);
});
authRoutes.post('/login', (req, res, next) => {
  void authController.loginWithEmail(req, res).catch(next);
});
authRoutes.post('/register', (req, res, next) => {
  void authController.registerWithEmail(req, res).catch(next);
});
authRoutes.post('/verify-email', (req, res, next) => {
  void authController.verifyEmail(req, res).catch(next);
});
authRoutes.post('/resend-verification', (req, res, next) => {
  void authController.resendVerification(req, res).catch(next);
});
authRoutes.get('/me', requireAuth, (req, res, next) => {
  void authController.getCurrentUser(req, res).catch(next);
});
authRoutes.post('/logout', requireAuth, (req, res, next) => {
  void authController.logout(req, res).catch(next);
});
authRoutes.post('/change-password', requireAuth, (req, res, next) => {
  void authController.changePassword(req, res).catch(next);
});
