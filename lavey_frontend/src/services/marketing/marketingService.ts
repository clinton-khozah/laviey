import { apiConfig } from '@/config/api.config';

const VISITOR_KEY = 'lavey:website-visitor-id';
const REFERRAL_KEY = 'lavey:active-referral';
const REFERRAL_WINDOW_MS = 24 * 60 * 60 * 1000;
export const APK_DOWNLOAD_FILENAME = 'Lavey.apk';
export const APK_DOWNLOAD_URL = `${apiConfig.baseUrl}/marketing/apk`;

function visitorId(): string {
  const existing = localStorage.getItem(VISITOR_KEY);
  if (existing) return existing;
  const value = crypto.randomUUID();
  localStorage.setItem(VISITOR_KEY, value);
  return value;
}

function activeReferralCode(): string | undefined {
  const incoming = new URLSearchParams(location.search).get('ref')?.trim();
  if (incoming) {
    localStorage.setItem(REFERRAL_KEY, JSON.stringify({ code: incoming, expiresAt: Date.now() + REFERRAL_WINDOW_MS }));
    return incoming;
  }
  try {
    const stored = JSON.parse(localStorage.getItem(REFERRAL_KEY) || 'null') as { code?: string; expiresAt?: number } | null;
    if (stored?.code && Number(stored.expiresAt) > Date.now()) return stored.code;
  } catch { /* discard invalid attribution */ }
  localStorage.removeItem(REFERRAL_KEY);
  return undefined;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiConfig.baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!response.ok) throw new Error('Could not connect to Lavey. Please try again.');
  const body = await response.json() as { data: T };
  return body.data;
}

export const marketingService = {
  recordVisit(): Promise<unknown> {
    const query = new URLSearchParams(location.search);
    return request('/marketing/visit', { method: 'POST', body: JSON.stringify({ visitorId: visitorId(), path: `${location.pathname}${location.search}`, referrer: document.referrer || undefined, source: query.get('utm_source') || undefined, medium: query.get('utm_medium') || undefined, campaign: query.get('utm_campaign') || undefined, referralCode: activeReferralCode() }) });
  },
  getStats(): Promise<{ downloadCount: number }> { return request('/marketing/stats'); },
  getApkDownloadUrl(): Promise<string | null> {
    return request<{ downloadUrl: string | null }>('/marketing/apk-url').then((value) => value.downloadUrl?.trim() || null);
  },
  recordDownload(): Promise<{ downloadCount: number }> {
    return request('/marketing/download', { method: 'POST', body: JSON.stringify({ visitorId: visitorId(), source: 'landing-page', referralCode: activeReferralCode() }) });
  },
  getReferral(displayName: string, email: string): Promise<{ code: string; displayName: string; referrals: number; rewardUsd: number; nextRewardAt: number }> {
    return request('/marketing/referral', { method: 'POST', body: JSON.stringify({ visitorId: visitorId(), displayName, email }) });
  },
};
