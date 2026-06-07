import { Router } from 'express';
import { contentController } from '../controllers/content.controller.js';
import { payoutController } from '../controllers/payout.controller.js';
import { postLikeController } from '../controllers/post-like.controller.js';
import { usersController } from '../controllers/users.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { contentUpload } from '../middleware/upload.middleware.js';

export const usersRoutes = Router();

usersRoutes.get('/me', requireAuth, (req, res, next) => {
  usersController.getMyProfile(req, res).catch(next);
});

usersRoutes.patch('/me', requireAuth, (req, res, next) => {
  usersController.updateMyProfile(req, res).catch(next);
});

usersRoutes.post('/me/verification', requireAuth, (req, res, next) => {
  usersController.completeVerification(req, res).catch(next);
});

usersRoutes.patch('/me/location', requireAuth, (req, res, next) => {
  usersController.updateMyLocation(req, res).catch(next);
});

usersRoutes.get('/me/privacy', requireAuth, (req, res, next) => {
  usersController.getPrivacySettings(req, res).catch(next);
});

usersRoutes.get('/me/settings', requireAuth, (req, res, next) => {
  usersController.getSettings(req, res).catch(next);
});

usersRoutes.patch('/me/settings', requireAuth, (req, res, next) => {
  usersController.updateSettings(req, res).catch(next);
});

usersRoutes.patch('/me/privacy', requireAuth, (req, res, next) => {
  usersController.updatePrivacySettings(req, res).catch(next);
});

usersRoutes.get('/me/blocked', requireAuth, (req, res, next) => {
  usersController.listBlockedUsers(req, res).catch(next);
});

usersRoutes.post('/me/blocked/:userId', requireAuth, (req, res, next) => {
  usersController.blockUser(req, res).catch(next);
});

usersRoutes.delete('/me/blocked/:userId', requireAuth, (req, res, next) => {
  usersController.unblockUser(req, res).catch(next);
});

usersRoutes.post('/me/contacts/import', requireAuth, (req, res, next) => {
  usersController.importContacts(req, res).catch(next);
});

usersRoutes.get('/me/data-export', requireAuth, (req, res, next) => {
  usersController.exportMyData(req, res).catch(next);
});

usersRoutes.delete('/me', requireAuth, (req, res, next) => {
  usersController.deleteAccount(req, res).catch(next);
});

usersRoutes.get('/me/onboarding', requireAuth, (req, res, next) => {
  usersController.getOnboarding(req, res).catch(next);
});

usersRoutes.post('/me/onboarding', requireAuth, (req, res, next) => {
  usersController.submitOnboarding(req, res).catch(next);
});

usersRoutes.get('/me/posts', requireAuth, (req, res, next) => {
  contentController.listMyPosts(req, res).catch(next);
});

usersRoutes.get('/me/posts/:id/likes', requireAuth, (req, res, next) => {
  postLikeController.listForMyPost(req, res).catch(next);
});

usersRoutes.get('/me/received-post-likes', requireAuth, (req, res, next) => {
  postLikeController.listReceived(req, res).catch(next);
});

usersRoutes.post(
  '/me/posts',
  requireAuth,
  contentUpload.fields([
    { name: 'media', maxCount: 1 },
    { name: 'poster', maxCount: 1 },
  ]),
  (req, res, next) => {
    contentController.createPost(req, res).catch(next);
  },
);

usersRoutes.patch('/me/posts/:id', requireAuth, (req, res, next) => {
  contentController.updatePost(req, res).catch(next);
});

usersRoutes.delete('/me/posts/:id', requireAuth, (req, res, next) => {
  contentController.deletePost(req, res).catch(next);
});

usersRoutes.post(
  '/me/avatar',
  requireAuth,
  contentUpload.single('avatar'),
  (req, res, next) => {
    contentController.uploadAvatar(req, res).catch(next);
  },
);

usersRoutes.get('/me/gifts/wallet', requireAuth, (req, res, next) => {
  payoutController.getWallet(req, res).catch(next);
});

usersRoutes.put('/me/gifts/payout-account', requireAuth, (req, res, next) => {
  payoutController.saveAccount(req, res).catch(next);
});

usersRoutes.post('/me/gifts/withdraw', requireAuth, (req, res, next) => {
  payoutController.withdraw(req, res).catch(next);
});
