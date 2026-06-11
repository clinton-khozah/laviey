import { usesBackendApi } from '@/config/env';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { httpClient } from '@/services/api/httpClient';
import type { ApiResponse } from '@/types';
import {
  loadPrivacySettings,
  savePrivacySettings,
  type PrivacySettings,
} from '@/utils/privacy/privacySettingsStorage';
import { sleep } from '@/utils/sleep';

export interface PrivacySettingsResponse extends PrivacySettings {
  hasPhoneLinked: boolean;
}

export interface BlockedUser {
  userId: string;
  displayName: string;
  avatarUrl: string;
  blockedAt: string;
}

export interface ContactImportResponse {
  imported: number;
  matches: Array<{ userId: string; displayName: string; avatarUrl: string }>;
}

function usesBackendPrivacy(): boolean {
  return usesBackendApi();
}

function toLocalSettings(data: PrivacySettingsResponse): PrivacySettings {
  return {
    showInDiscover: data.showInDiscover,
    hideFromPeople: data.hideFromPeople,
    readReceipts: data.readReceipts,
    contactsCanFindMe: data.contactsCanFindMe,
  };
}

export const privacyService = {
  async getSettings(): Promise<PrivacySettingsResponse> {
    if (!usesBackendPrivacy()) {
      await sleep(150);
      const local = loadPrivacySettings();
      return { ...local, hasPhoneLinked: false };
    }

    const res = await httpClient.get<ApiResponse<PrivacySettingsResponse>>(
      API_ENDPOINTS.users.privacy,
    );
    savePrivacySettings(toLocalSettings(res.data));
    return res.data;
  },

  async updateSettings(
    patch: Partial<PrivacySettings> & { phone?: string },
  ): Promise<PrivacySettingsResponse> {
    if (!usesBackendPrivacy()) {
      await sleep(200);
      const next = { ...loadPrivacySettings(), ...patch };
      savePrivacySettings(next);
      return { ...next, hasPhoneLinked: Boolean(patch.phone) };
    }

    const res = await httpClient.patch<ApiResponse<PrivacySettingsResponse>>(
      API_ENDPOINTS.users.privacy,
      { body: patch },
    );
    savePrivacySettings(toLocalSettings(res.data));
    return res.data;
  },

  async listBlockedUsers(): Promise<BlockedUser[]> {
    if (!usesBackendPrivacy()) {
      await sleep(150);
      return [];
    }

    const res = await httpClient.get<ApiResponse<BlockedUser[]>>(API_ENDPOINTS.users.blocked);
    return res.data;
  },

  async blockUser(userId: string): Promise<void> {
    if (!usesBackendPrivacy()) {
      await sleep(150);
      return;
    }

    await httpClient.post<ApiResponse<{ ok: boolean }>>(API_ENDPOINTS.users.blockUser(userId));
  },

  async unblockUser(userId: string): Promise<void> {
    if (!usesBackendPrivacy()) {
      await sleep(150);
      return;
    }

    await httpClient.delete<ApiResponse<{ ok: boolean }>>(API_ENDPOINTS.users.blockUser(userId));
  },

  async importContacts(phones: string[]): Promise<ContactImportResponse> {
    if (!usesBackendPrivacy()) {
      await sleep(300);
      return { imported: phones.length, matches: [] };
    }

    const res = await httpClient.post<ApiResponse<ContactImportResponse>>(
      API_ENDPOINTS.users.contactsImport,
      { body: { phones } },
    );
    return res.data;
  },

  async exportMyData(): Promise<Record<string, unknown>> {
    if (!usesBackendPrivacy()) {
      await sleep(400);
      return {
        exportedAt: new Date().toISOString(),
        note: 'Mock export — connect the backend for a full data download.',
        settings: loadPrivacySettings(),
      };
    }

    const res = await httpClient.get<ApiResponse<Record<string, unknown>>>(
      API_ENDPOINTS.users.dataExport,
    );
    return res.data;
  },

  async deleteAccount(): Promise<void> {
    if (!usesBackendPrivacy()) {
      await sleep(400);
      return;
    }

    await httpClient.delete<ApiResponse<{ ok: boolean }>>(API_ENDPOINTS.users.deleteAccount);
  },
};
