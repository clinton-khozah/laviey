import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import {
  blockUser,
  deleteUserAccount,
  exportUserData,
  getPrivacySettings,
  importContacts,
  listBlockedUsers,
  unblockUser,
  updatePrivacySettings,
} from '../services/privacy.service.js';
import { getUserProfile, markIdentityVerified, updateUserLocation, updateUserProfile } from '../services/profile.service.js';
import { getUserSettings, updateUserSettings } from '../services/settings.service.js';
import { successResponse } from '../utils/apiResponse.js';

const updateProfileBodySchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  bio: z.string().max(500).optional(),
  headline: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
  pronouns: z.string().max(40).optional(),
  interestKeys: z.array(z.string().min(1).max(40)).min(1).max(5).optional(),
});

const onboardingLocationBodySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  country: z.string().min(1).max(80),
  province: z.string().min(1).max(80),
  suburb: z.string().min(1).max(80),
});

const locationBodySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  country: z.string().trim().max(80).optional(),
  province: z.string().trim().max(80).optional(),
  suburb: z.string().trim().max(80).optional(),
});

const updatePrivacyBodySchema = z.object({
  showInDiscover: z.boolean().optional(),
  hideFromPeople: z.boolean().optional(),
  readReceipts: z.boolean().optional(),
  contactsCanFindMe: z.boolean().optional(),
  phone: z.string().min(7).max(20).optional(),
});

const importContactsBodySchema = z.object({
  phones: z.array(z.string().min(1)).min(1).max(500),
});

const updateSettingsBodySchema = z.object({
  theme: z.enum(['night', 'light']).optional(),
  chatTypingStyle: z.enum(['romantic', 'classic', 'neon', 'minimal']).optional(),
  language: z.enum(['en', 'es', 'fr', 'de', 'pt', 'ja', 'ko', 'zh']).optional(),
  pushNotificationsEnabled: z.boolean().optional(),
});

const submitOnboardingBodySchema = z.object({
  purpose: z.string().min(1),
  agePreference: z.string().min(1),
  interestedIn: z.string().min(1),
  orientation: z.string().min(1),
  religion: z.string().min(1),
  interests: z.array(z.string().min(1)).min(3).max(12),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  vibe: z.enum(['chill', 'bold', 'fun']).optional(),
  location: onboardingLocationBodySchema,
});

export const usersController = {
  async getMyProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const profile = await getUserProfile(req.authUser!, req.accessToken!);
    res.json(successResponse(profile));
  },

  async updateMyProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const body = updateProfileBodySchema.parse(req.body);
    const profile = await updateUserProfile(req.authUser!, req.accessToken!, body);
    res.json(successResponse(profile, 'Profile updated'));
  },

  async updateMyLocation(req: AuthenticatedRequest, res: Response): Promise<void> {
    const body = locationBodySchema.parse(req.body);
    await updateUserLocation(req.authUser!, req.accessToken!, body);
    res.json(successResponse({ ok: true }, 'Location updated'));
  },

  async getOnboarding(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { getUserOnboardingStatus } = await import('../services/onboarding.service.js');
    const status = await getUserOnboardingStatus(req.authUser!.id, req.accessToken!);
    res.json(successResponse(status));
  },

  async submitOnboarding(req: AuthenticatedRequest, res: Response): Promise<void> {
    const body = submitOnboardingBodySchema.parse(req.body);
    const { submitUserOnboarding } = await import('../services/onboarding.service.js');
    const status = await submitUserOnboarding(req.authUser!, req.accessToken!, body);
    res.json(successResponse(status, 'Onboarding saved'));
  },

  async getPrivacySettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    const settings = await getPrivacySettings(req.authUser!, req.accessToken!);
    res.json(successResponse(settings));
  },

  async getSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    const settings = await getUserSettings(req.authUser!, req.accessToken!);
    res.json(successResponse(settings));
  },

  async updateSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    const body = updateSettingsBodySchema.parse(req.body);
    const settings = await updateUserSettings(req.authUser!, req.accessToken!, body);
    res.json(successResponse(settings, 'Settings saved'));
  },

  async updatePrivacySettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    const body = updatePrivacyBodySchema.parse(req.body);
    const settings = await updatePrivacySettings(req.authUser!, req.accessToken!, body);
    res.json(successResponse(settings, 'Privacy updated'));
  },

  async listBlockedUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    const users = await listBlockedUsers(req.authUser!, req.accessToken!);
    res.json(successResponse(users));
  },

  async blockUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = z.string().uuid().parse(req.params.userId);
    await blockUser(req.authUser!, req.accessToken!, userId);
    res.json(successResponse({ ok: true }, 'User blocked'));
  },

  async unblockUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = z.string().uuid().parse(req.params.userId);
    await unblockUser(req.authUser!, req.accessToken!, userId);
    res.json(successResponse({ ok: true }, 'User unblocked'));
  },

  async importContacts(req: AuthenticatedRequest, res: Response): Promise<void> {
    const body = importContactsBodySchema.parse(req.body);
    const result = await importContacts(req.authUser!, req.accessToken!, body.phones);
    res.json(successResponse(result));
  },

  async exportMyData(req: AuthenticatedRequest, res: Response): Promise<void> {
    const data = await exportUserData(req.authUser!, req.accessToken!);
    res.json(successResponse(data));
  },

  async deleteAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    await deleteUserAccount(req.authUser!);
    res.json(successResponse({ ok: true }, 'Account deleted'));
  },

  async completeVerification(req: AuthenticatedRequest, res: Response): Promise<void> {
    const profile = await markIdentityVerified(req.authUser!, req.accessToken!);
    res.json(successResponse(profile, 'Identity verified'));
  },
};
