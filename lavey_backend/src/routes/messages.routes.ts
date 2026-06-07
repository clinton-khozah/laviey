import { Router } from 'express';
import { messagesController } from '../controllers/messages.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const messagesRoutes = Router();

messagesRoutes.get('/conversations', requireAuth, (req, res, next) => {
  messagesController.getConversations(req, res).catch(next);
});

messagesRoutes.get('/conversations/by-profile/:profileId', requireAuth, (req, res, next) => {
  messagesController.findByProfile(req, res).catch(next);
});

messagesRoutes.get('/conversations/:id', requireAuth, (req, res, next) => {
  messagesController.getThread(req, res).catch(next);
});

messagesRoutes.post('/conversations/:id/messages', requireAuth, (req, res, next) => {
  messagesController.sendMessage(req, res).catch(next);
});

messagesRoutes.patch('/conversations/:id/messages/:messageId', requireAuth, (req, res, next) => {
  messagesController.setMessageReaction(req, res).catch(next);
});

messagesRoutes.post('/conversations/:id/read', requireAuth, (req, res, next) => {
  messagesController.markRead(req, res).catch(next);
});

messagesRoutes.post('/conversations/:id/typing', requireAuth, (req, res, next) => {
  messagesController.setTyping(req, res).catch(next);
});

messagesRoutes.patch('/conversations/:id/pin', requireAuth, (req, res, next) => {
  messagesController.setPinned(req, res).catch(next);
});

messagesRoutes.delete('/conversations/:id', requireAuth, (req, res, next) => {
  messagesController.deleteConversation(req, res).catch(next);
});

messagesRoutes.post('/presence', requireAuth, (req, res, next) => {
  messagesController.touchPresence(req, res).catch(next);
});
