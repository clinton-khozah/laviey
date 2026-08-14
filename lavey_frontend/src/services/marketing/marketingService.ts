import { apiConfig } from '@/config/api.config';

const VISITOR_KEY = 'lavey:website-visitor-id';
const REFERRAL_KEY = 'lavey:active-referral';
const REFERRAL_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Latest preview APK — used when Netlify env is missing so download never breaks. */
const DEFAULT_APK_ARTIFACT_URL =
  'https://expo.dev/artifacts/eas/92pkNvRXYyej8_t7dPdSSSdEEpedf0cNnYkSCAE1bv0.apk';

export const APK_DOWNLOAD_FILENAME = 'Lavey.apk';
export const APK_PROXY_DOWNLOAD_URL = `${apiConfig.baseUrl}/marketing/apk-url?download=1`;
export const APK_DIRECT_DOWNLOAD_URL =
  import.meta.env.VITE_ANDROID_DOWNLOAD_URL?.trim() || DEFAULT_APK_ARTIFACT_URL;
/** Same-origin static file baked into each Netlify build as Lavey.apk. */
export const APK_DOWNLOAD_URL = '/Lavey.apk';

export async function downloadApkFile(): Promise<void> {
  try {
    const response = await fetch(APK_DOWNLOAD_URL, { credentials: 'same-origin' });
    if (!response.ok) throw new Error('Download unavailable');
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) throw new Error('APK not deployed yet');
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = APK_DOWNLOAD_FILENAME;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.location.assign(APK_DOWNLOAD_URL);
  }
}

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
