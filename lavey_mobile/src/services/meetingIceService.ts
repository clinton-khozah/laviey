import { meetingApi } from '../api/services';

function buildFallbackIceServers(): RTCIceServer[] {
  return [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
        'turns:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ];
}

let cached: { servers: RTCIceServer[]; expiresAt: number } | null = null;
let inflight: Promise<RTCIceServer[]> | null = null;

/** Fetch STUN/TURN servers for meetup WebRTC (cached ~50 min), mirrors lavey_frontend's meetingIceService. */
export async function getMeetingIceServers(): Promise<RTCIceServer[]> {
  if (cached && Date.now() < cached.expiresAt) return cached.servers;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await meetingApi.turnCredentials();
      if (res.iceServers.length > 0) {
        const ttlMs = Math.max(60, res.ttlSeconds ?? 3600) * 1000;
        cached = { servers: res.iceServers, expiresAt: Date.now() + ttlMs * 0.9 };
        return res.iceServers;
      }
    } catch {
      /* fall through to local fallback */
    }

    const servers = buildFallbackIceServers();
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
    return urls.some((url) => typeof url === 'string' && (url.startsWith('turn:') || url.startsWith('turns:')));
  });
}
