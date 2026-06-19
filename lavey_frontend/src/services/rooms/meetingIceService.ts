import { env, usesBackendApi } from '@/config/env';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { httpClient } from '@/services/api/httpClient';
import type { ApiResponse } from '@/types';

function buildLocalFallbackIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ];

  if (env.turnUrl && env.turnUsername && env.turnCredential) {
    servers.push({
      urls: env.turnUrl.includes(',')
        ? env.turnUrl.split(',').map((url: string) => url.trim())
        : env.turnUrl,
      username: env.turnUsername,
      credential: env.turnCredential,
    });
    return servers;
  }

  servers.push({
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp',
      'turns:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  });

  servers.push({
    urls: [
      'turn:relay.metered.ca:80',
      'turn:relay.metered.ca:443',
      'turn:relay.metered.ca:443?transport=tcp',
      'turns:relay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  });

  return servers;
}

interface TurnCredentialsResponse {
  iceServers: RTCIceServer[];
  ttlSeconds: number;
}

let cached: { servers: RTCIceServer[]; expiresAt: number } | null = null;
let inflight: Promise<RTCIceServer[]> | null = null;

/** Fetch STUN/TURN servers for meetup WebRTC (cached ~50 min). */
export async function getMeetingIceServers(): Promise<RTCIceServer[]> {
  if (cached && Date.now() < cached.expiresAt) {
    return cached.servers;
  }

  if (inflight) return inflight;

  inflight = (async () => {
    if (usesBackendApi()) {
      try {
        const res = await httpClient.get<ApiResponse<TurnCredentialsResponse>>(
          API_ENDPOINTS.meetings.turnCredentials,
          { skipErrorPage: true },
        );
        const servers = res.data.iceServers;
        if (servers.length > 0) {
          const ttlMs = Math.max(60, res.data.ttlSeconds ?? 3600) * 1000;
          cached = { servers, expiresAt: Date.now() + ttlMs * 0.9 };
          return servers;
        }
      } catch {
        /* fall through to local fallback */
      }
    }

    const servers = buildLocalFallbackIceServers();
    cached = { servers, expiresAt: Date.now() + 30 * 60 * 1000 };
    return servers;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export function hasTurnRelay(servers: RTCIceServer[]): boolean {
  return servers.some((server) => {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    return urls.some(
      (url) => typeof url === 'string' && (url.startsWith('turn:') || url.startsWith('turns:')),
    );
  });
}
