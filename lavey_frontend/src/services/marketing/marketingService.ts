import { apiConfig } from "@/config/api.config";

const VISITOR_KEY = "lavey:website-visitor-id";
const REFERRAL_KEY = "lavey:active-referral";
const REFERRAL_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Latest preview APK — used when Netlify env is missing so download never breaks. */
const DEFAULT_APK_ARTIFACT_URL =
  "https://expo.dev/artifacts/eas/92pkNvRXYyej8_t7dPdSSSdEEpedf0cNnYkSCAE1bv0.apk";

export const APK_DOWNLOAD_FILENAME = "Lavey.apk";
export const APK_PROXY_DOWNLOAD_URL = `${apiConfig.baseUrl}/marketing/apk-url?download=1`;
export const APK_DIRECT_DOWNLOAD_URL =
  import.meta.env.VITE_ANDROID_DOWNLOAD_URL?.trim() || DEFAULT_APK_ARTIFACT_URL;
/** Same-origin static file baked into each Netlify build as Lavey.apk. */
export const APK_DOWNLOAD_URL = "/Lavey.apk";

export type ApkDownloadProgress = {
  loaded: number;
  total: number | null;
  percent: number | null;
};

function triggerBlobDownload(blob: Blob): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = APK_DOWNLOAD_FILENAME;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

async function readResponseWithProgress(
  response: Response,
  onProgress?: (progress: ApkDownloadProgress) => void,
): Promise<Blob> {
  if (!response.body) return response.blob();

  const totalHeader = response.headers.get("content-length");
  const total = totalHeader ? Number(totalHeader) : null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    const percent =
      total && total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : null;
    onProgress?.({ loaded, total, percent });
  }

  onProgress?.({ loaded, total: total ?? loaded, percent: 100 });
  return new Blob(chunks, {
    type:
      response.headers.get("content-type") ||
      "application/vnd.android.package-archive",
  });
}

export async function downloadApkFile(
  onProgress?: (progress: ApkDownloadProgress) => void,
): Promise<void> {
  try {
    const response = await fetch(APK_DOWNLOAD_URL, {
      credentials: "same-origin",
    });
    if (!response.ok) throw new Error("Download unavailable");
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html"))
      throw new Error("APK not deployed yet");

    const blob = await readResponseWithProgress(response, onProgress);
    triggerBlobDownload(blob);
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
  const incoming = new URLSearchParams(location.search).get("ref")?.trim();
  if (incoming) {
    localStorage.setItem(
      REFERRAL_KEY,
      JSON.stringify({
        code: incoming,
        expiresAt: Date.now() + REFERRAL_WINDOW_MS,
      }),
    );
    return incoming;
  }
  try {
    const stored = JSON.parse(localStorage.getItem(REFERRAL_KEY) || "null") as {
      code?: string;
      expiresAt?: number;
    } | null;
    if (stored?.code && Number(stored.expiresAt) > Date.now())
      return stored.code;
  } catch {
    /* discard invalid attribution */
  }
  localStorage.removeItem(REFERRAL_KEY);
  return undefined;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiConfig.baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok)
    throw new Error("Could not connect to Lavey. Please try again.");
  const body = (await response.json()) as { data: T };
  return body.data;
}

export const marketingService = {
  recordVisit(): Promise<unknown> {
    const query = new URLSearchParams(location.search);
    return request("/marketing/visit", {
      method: "POST",
      body: JSON.stringify({
        visitorId: visitorId(),
        path: `${location.pathname}${location.search}`,
        referrer: document.referrer || undefined,
        source: query.get("utm_source") || undefined,
        medium: query.get("utm_medium") || undefined,
        campaign: query.get("utm_campaign") || undefined,
        referralCode: activeReferralCode(),
      }),
    });
  },
  getStats(): Promise<{ downloadCount: number }> {
    return request("/marketing/stats");
  },
  getApkDownloadUrl(): Promise<string | null> {
    return request<{ downloadUrl: string | null }>("/marketing/apk-url").then(
      (value) => value.downloadUrl?.trim() || null,
    );
  },
  recordDownload(): Promise<{ downloadCount: number }> {
    return request("/marketing/download", {
      method: "POST",
      body: JSON.stringify({
        visitorId: visitorId(),
        source: "landing-page",
        referralCode: activeReferralCode(),
      }),
    });
  },
  getReferral(
    displayName: string,
    email: string,
  ): Promise<{
    code: string;
    displayName: string;
    referrals: number;
    rewardUsd: number;
    nextRewardAt: number;
  }> {
    return request("/marketing/referral", {
      method: "POST",
      body: JSON.stringify({ visitorId: visitorId(), displayName, email }),
    });
  },
};
