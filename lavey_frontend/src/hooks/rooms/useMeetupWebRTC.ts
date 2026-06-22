import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { hasSupabaseRealtime } from '@/config/env';
import { getSupabaseRealtimeClient } from '@/lib/supabaseClient';
import { getMeetingIceServers, hasTurnRelay } from '@/services/rooms/meetingIceService';
import type { MeetingParticipant } from '@/types';

type MeetupConnectionStatus = 'connecting' | 'connected' | 'unsupported';

interface MeetupPresenceMeta {
  odUserId: string;
  name: string;
  avatarUrl: string;
  isHost: boolean;
}

interface SignalPayload {
  type: 'offer' | 'answer' | 'ice';
  from: string;
  to: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

interface UseMeetupWebRTCOptions {
  meetupId: string;
  localUserId: string;
  localDisplayName: string;
  localAvatarUrl: string;
  isHost: boolean;
  localStream: MediaStream | null;
  /** Join realtime presence/signaling channel */
  enabled: boolean;
  /** Camera/mic granted — required before peer negotiation */
  mediaReady: boolean;
}

interface PeerRecord {
  pc: RTCPeerConnection;
  meta: MeetupPresenceMeta;
  stream: MediaStream | null;
  pendingCandidates: RTCIceCandidateInit[];
  makingOffer: boolean;
  relayOnly: boolean;
  relayRetried: boolean;
}

function parsePresenceMeta(raw: unknown, presenceKey?: string): MeetupPresenceMeta | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const odUserId =
    (typeof obj.odUserId === 'string' ? obj.odUserId.trim() : '') || (presenceKey?.trim() ?? '');
  if (!odUserId) return null;
  return {
    odUserId,
    name: typeof obj.name === 'string' ? obj.name : 'Guest',
    avatarUrl: typeof obj.avatarUrl === 'string' ? obj.avatarUrl : '',
    isHost: Boolean(obj.isHost),
  };
}

function isRemoteVideoOff(stream: MediaStream | null): boolean {
  const track = stream?.getVideoTracks()[0];
  return !track || !track.enabled || track.readyState === 'ended';
}

function isRemoteMuted(stream: MediaStream | null): boolean {
  const track = stream?.getAudioTracks()[0];
  return !track || !track.enabled || track.readyState === 'ended';
}

function peerToParticipant(record: PeerRecord): MeetingParticipant {
  return {
    id: record.meta.odUserId,
    profileId: record.meta.odUserId,
    name: record.meta.name,
    avatarUrl: record.meta.avatarUrl,
    isHost: record.meta.isHost,
    stream: record.stream,
    isConnecting: !record.stream?.getTracks().some((track) => track.readyState === 'live'),
    isVideoOff: isRemoteVideoOff(record.stream),
    isMuted: isRemoteMuted(record.stream),
  };
}

function attachRemoteTrack(record: PeerRecord, track: MediaStreamTrack) {
  if (!record.stream) {
    record.stream = new MediaStream();
  }
  if (!record.stream.getTracks().some((existing) => existing.id === track.id)) {
    record.stream.addTrack(track);
  }
}

function ensureSendRecvTransceivers(pc: RTCPeerConnection) {
  for (const kind of ['audio', 'video'] as const) {
    const hasKind = pc.getTransceivers().some((item) => {
      const trackKind = item.sender.track?.kind ?? item.receiver.track?.kind;
      return trackKind === kind;
    });
    if (!hasKind) {
      pc.addTransceiver(kind, { direction: 'sendrecv' });
    }
  }
}

async function attachLocalTracksToPeer(
  pc: RTCPeerConnection,
  stream: MediaStream,
  options?: { ensureTransceivers?: boolean },
): Promise<boolean> {
  if (options?.ensureTransceivers) {
    ensureSendRecvTransceivers(pc);
  }
  let attached = false;

  for (const track of stream.getTracks()) {
    const sender =
      pc.getSenders().find((item) => item.track?.kind === track.kind) ??
      pc
        .getTransceivers()
        .find((item) => {
          const kind = item.sender.track?.kind ?? item.receiver.track?.kind;
          return kind === track.kind;
        })
        ?.sender;

    if (sender) {
      if (sender.track?.id !== track.id) {
        await sender.replaceTrack(track);
      }
      const transceiver = pc.getTransceivers().find((item) => item.sender === sender);
      if (transceiver && transceiver.direction !== 'sendrecv') {
        transceiver.direction = 'sendrecv';
      }
      attached = true;
      continue;
    }

    pc.addTrack(track, stream);
    attached = true;
  }

  return attached;
}

function isPeerConnectionDead(record: PeerRecord): boolean {
  const state = record.pc.connectionState;
  const iceState = record.pc.iceConnectionState;
  return (
    state === 'failed' ||
    state === 'closed' ||
    iceState === 'failed' ||
    iceState === 'closed'
  );
}

export function useMeetupWebRTC({
  meetupId,
  localUserId,
  localDisplayName,
  localAvatarUrl,
  isHost,
  localStream,
  enabled,
  mediaReady,
}: UseMeetupWebRTCOptions) {
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [status, setStatus] = useState<MeetupConnectionStatus>(
    hasSupabaseRealtime() ? 'connecting' : 'unsupported',
  );

  const peersRef = useRef<Map<string, PeerRecord>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const localStreamRef = useRef(localStream);
  const mediaReadyRef = useRef(mediaReady);
  const iceServersRef = useRef<RTCIceServer[]>([]);
  const turnAvailableRef = useRef(false);
  const iceReadyRef = useRef(false);
  localStreamRef.current = localStream;
  mediaReadyRef.current = mediaReady;

  const [iceReady, setIceReady] = useState(false);

  const syncParticipants = useCallback(() => {
    setParticipants([...peersRef.current.values()].map(peerToParticipant));
    if (peersRef.current.size > 0) {
      setStatus('connected');
    }
  }, []);

  const sendSignal = useCallback((payload: SignalPayload) => {
    void channelRef.current?.send({
      type: 'broadcast',
      event: 'signal',
      payload,
    });
  }, []);

  const lookupPresenceMeta = useCallback((odUserId: string): MeetupPresenceMeta | null => {
    const channel = channelRef.current;
    if (!channel) return null;

    const state = channel.presenceState<MeetupPresenceMeta>();
    for (const [key, presences] of Object.entries(state)) {
      for (const raw of presences) {
        const meta = parsePresenceMeta(raw, key);
        if (meta?.odUserId === odUserId) return meta;
      }
    }
    return null;
  }, []);

  const attachLocalTracks = useCallback(
    async (pc: RTCPeerConnection, ensureTransceivers = false) => {
      const stream = localStreamRef.current;
      if (!stream) return false;
      return attachLocalTracksToPeer(pc, stream, { ensureTransceivers });
    },
    [],
  );

  const flushPendingCandidates = useCallback(async (record: PeerRecord) => {
    if (!record.pc.remoteDescription) return;
    const pending = [...record.pendingCandidates];
    record.pendingCandidates = [];
    for (const candidate of pending) {
      try {
        await record.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        /* ignore stale candidates */
      }
    }
  }, []);

  const removePeerRecord = useCallback(
    (peerId: string) => {
      const record = peersRef.current.get(peerId);
      if (!record) return;
      record.pc.close();
      peersRef.current.delete(peerId);
      syncParticipants();
    },
    [syncParticipants],
  );

  const renegotiatePeer = useCallback(
    async (peerId: string, record: PeerRecord) => {
      if (!mediaReadyRef.current || !localStreamRef.current) return;
      if (record.pc.signalingState !== 'stable' || record.makingOffer) return;

      try {
        record.makingOffer = true;
        await attachLocalTracks(record.pc, true);
        const offer = await record.pc.createOffer();
        await record.pc.setLocalDescription(offer);
        sendSignal({
          type: 'offer',
          from: localUserId,
          to: peerId,
          sdp: offer,
        });
      } catch {
        /* ignore renegotiation races */
      } finally {
        record.makingOffer = false;
      }
    },
    [attachLocalTracks, localUserId, sendSignal],
  );

  const createOfferRef = useRef<
    (meta: MeetupPresenceMeta, relayOnly?: boolean) => Promise<void>
  >(() => Promise.resolve());

  const wirePeerConnection = useCallback(
    (record: PeerRecord) => {
      const { pc, meta } = record;
      const peerId = meta.odUserId;

      pc.ontrack = (event) => {
        if (event.track) {
          attachRemoteTrack(record, event.track);
        }
        for (const remoteStream of event.streams) {
          for (const track of remoteStream.getTracks()) {
            attachRemoteTrack(record, track);
          }
        }

        const refresh = () => syncParticipants();
        if (record.stream) {
          for (const track of record.stream.getTracks()) {
            track.addEventListener('ended', refresh);
            track.addEventListener('mute', refresh);
            track.addEventListener('unmute', refresh);
          }
        }
        syncParticipants();
      };

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        sendSignal({
          type: 'ice',
          from: localUserId,
          to: peerId,
          candidate: event.candidate.toJSON(),
        });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') {
          if (!record.relayRetried && turnAvailableRef.current) {
            record.relayRetried = true;
            const savedMeta = { ...meta };
            removePeerRecord(peerId);
            if (localUserId < peerId) {
              queueMicrotask(() => {
                void createOfferRef.current(savedMeta, true);
              });
            }
            return;
          }
          removePeerRecord(peerId);
        } else if (pc.connectionState === 'closed') {
          peersRef.current.delete(peerId);
          syncParticipants();
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'disconnected') return;
        if (pc.iceConnectionState === 'failed') {
          if (!record.relayRetried && turnAvailableRef.current) {
            record.relayRetried = true;
            const savedMeta = { ...meta };
            removePeerRecord(peerId);
            if (localUserId < peerId) {
              queueMicrotask(() => {
                void createOfferRef.current(savedMeta, true);
              });
            }
            return;
          }
          if (pc.signalingState === 'stable') {
            try {
              pc.restartIce();
              void renegotiatePeer(peerId, record);
            } catch {
              removePeerRecord(peerId);
            }
          }
        }
      };

      pc.onnegotiationneeded = () => {
        if (!mediaReadyRef.current || !localStreamRef.current) return;
        if (localUserId < peerId) {
          void renegotiatePeer(peerId, record);
        }
      };
    },
    [localUserId, removePeerRecord, renegotiatePeer, sendSignal, syncParticipants],
  );

  const createPeerConnection = useCallback(
    (meta: MeetupPresenceMeta, relayOnly = false): PeerRecord => {
      const pc = new RTCPeerConnection({
        iceServers: iceServersRef.current,
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
        iceTransportPolicy: relayOnly ? 'relay' : 'all',
      });
      const record: PeerRecord = {
        pc,
        meta,
        stream: null,
        pendingCandidates: [],
        makingOffer: false,
        relayOnly,
        relayRetried: relayOnly,
      };
      peersRef.current.set(meta.odUserId, record);
      wirePeerConnection(record);
      return record;
    },
    [wirePeerConnection],
  );

  const createOffer = useCallback(
    async (meta: MeetupPresenceMeta, relayOnly = false) => {
      if (!iceReadyRef.current || !mediaReadyRef.current || !localStreamRef.current) return;

      let record = peersRef.current.get(meta.odUserId);
      if (record && isPeerConnectionDead(record)) {
        removePeerRecord(meta.odUserId);
        record = undefined;
      }
      if (record?.makingOffer) return;
      if (record && record.pc.signalingState !== 'stable') return;

      if (!record) {
        record = createPeerConnection(meta, relayOnly);
      }

      try {
        record.makingOffer = true;
        await attachLocalTracks(record.pc, true);
        const offer = await record.pc.createOffer();
        await record.pc.setLocalDescription(offer);
        sendSignal({
          type: 'offer',
          from: localUserId,
          to: meta.odUserId,
          sdp: offer,
        });
        syncParticipants();
      } catch {
        removePeerRecord(meta.odUserId);
      } finally {
        if (record) record.makingOffer = false;
      }
    },
    [
      attachLocalTracks,
      createPeerConnection,
      localUserId,
      removePeerRecord,
      sendSignal,
      syncParticipants,
    ],
  );

  createOfferRef.current = createOffer;

  const handleSignal = useCallback(
    async (payload: SignalPayload) => {
      if (payload.to !== localUserId) return;

      if (payload.type === 'offer' && payload.sdp) {
        const peerId = payload.from;
        const isPolite = localUserId > peerId;

        let record = peersRef.current.get(peerId);
        if (record && isPeerConnectionDead(record)) {
          removePeerRecord(peerId);
          record = undefined;
        }

        if (!record) {
          const presenceMeta = lookupPresenceMeta(peerId);
          record = createPeerConnection(
            presenceMeta ?? {
              odUserId: peerId,
              name: 'Guest',
              avatarUrl: '',
              isHost: false,
            },
            false,
          );
        }

        const offerCollision =
          record.makingOffer || record.pc.signalingState !== 'stable';

        if (offerCollision) {
          if (!isPolite) return;
          try {
            await record.pc.setLocalDescription({ type: 'rollback' });
          } catch {
            removePeerRecord(peerId);
            return;
          }
        }

        try {
          await record.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          if (mediaReadyRef.current && localStreamRef.current) {
            await attachLocalTracks(record.pc);
          }
          const answer = await record.pc.createAnswer();
          await record.pc.setLocalDescription(answer);
          sendSignal({
            type: 'answer',
            from: localUserId,
            to: peerId,
            sdp: answer,
          });
          await flushPendingCandidates(record);
          syncParticipants();
        } catch {
          removePeerRecord(peerId);
        }
        return;
      }

      if (payload.type === 'answer' && payload.sdp) {
        const record = peersRef.current.get(payload.from);
        if (!record) return;
        try {
          await record.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          await flushPendingCandidates(record);
          syncParticipants();
        } catch {
          removePeerRecord(payload.from);
        }
        return;
      }

      if (payload.type === 'ice' && payload.candidate) {
        const record = peersRef.current.get(payload.from);
        if (!record) return;
        if (!record.pc.remoteDescription) {
          record.pendingCandidates.push(payload.candidate);
          return;
        }
        try {
          await record.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch {
          /* ignore stale candidates */
        }
      }
    },
    [
      attachLocalTracks,
      createPeerConnection,
      flushPendingCandidates,
      localUserId,
      lookupPresenceMeta,
      removePeerRecord,
      sendSignal,
      syncParticipants,
    ],
  );

  const connectToPeer = useCallback(
    (meta: MeetupPresenceMeta) => {
      if (!iceReadyRef.current || !mediaReadyRef.current || !localStreamRef.current) return;
      if (!meta.odUserId || meta.odUserId === localUserId) return;

      const existing = peersRef.current.get(meta.odUserId);
      if (existing) {
        if (isPeerConnectionDead(existing)) {
          removePeerRecord(meta.odUserId);
        } else {
          existing.meta = { ...existing.meta, ...meta };
          syncParticipants();
          if (localUserId < meta.odUserId && existing.pc.signalingState === 'stable') {
            void createOffer(meta);
          }
          return;
        }
      }

      if (localUserId < meta.odUserId) {
        void createOffer(meta);
      }
    },
    [createOffer, localUserId, removePeerRecord, syncParticipants],
  );

  const syncPresencePeers = useCallback(
    (channel: RealtimeChannel) => {
      if (!iceReadyRef.current || !mediaReadyRef.current) return;
      const state = channel.presenceState<MeetupPresenceMeta>();
      for (const [key, presences] of Object.entries(state)) {
        for (const raw of presences) {
          const meta = parsePresenceMeta(raw, key);
          if (meta) connectToPeer(meta);
        }
      }
    },
    [connectToPeer],
  );

  const removePeer = useCallback(
    (meta: MeetupPresenceMeta | null) => {
      if (!meta?.odUserId) return;
      removePeerRecord(meta.odUserId);
    },
    [removePeerRecord],
  );

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    void getMeetingIceServers().then((servers) => {
      if (cancelled) return;
      iceServersRef.current = servers;
      turnAvailableRef.current = hasTurnRelay(servers);
      iceReadyRef.current = true;
      setIceReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !hasSupabaseRealtime() || !meetupId || !localUserId) {
      if (!hasSupabaseRealtime()) {
        setStatus('unsupported');
      } else if (!enabled) {
        setStatus('connecting');
      }
      return;
    }

    const supabase = getSupabaseRealtimeClient();
    if (!supabase) {
      setStatus('unsupported');
      return;
    }

    const channel = supabase.channel(`meetup:${meetupId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: localUserId },
      },
    });
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        void handleSignal(payload as SignalPayload);
      })
      .on('presence', { event: 'sync' }, () => {
        syncPresencePeers(channel);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        for (const raw of newPresences) {
          const meta = parsePresenceMeta(raw, key);
          if (meta) connectToPeer(meta);
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        for (const raw of leftPresences) {
          removePeer(parsePresenceMeta(raw, key));
        }
      })
      .subscribe(async (subscribeStatus) => {
        if (subscribeStatus !== 'SUBSCRIBED') {
          if (subscribeStatus === 'CHANNEL_ERROR' || subscribeStatus === 'TIMED_OUT') {
            setStatus('unsupported');
          }
          return;
        }

        setStatus('connecting');
        await channel.track({
          odUserId: localUserId,
          name: localDisplayName,
          avatarUrl: localAvatarUrl,
          isHost,
        });
        syncPresencePeers(channel);
      });

    return () => {
      for (const record of peersRef.current.values()) {
        record.pc.close();
      }
      peersRef.current.clear();
      void supabase.removeChannel(channel);
      channelRef.current = null;
      setParticipants([]);
      setStatus('connecting');
    };
  }, [
    connectToPeer,
    enabled,
    handleSignal,
    isHost,
    localAvatarUrl,
    localDisplayName,
    localUserId,
    meetupId,
    removePeer,
    syncPresencePeers,
  ]);

  useEffect(() => {
    if (!iceReady || !mediaReady || !localStream) return;

    const channel = channelRef.current;
    if (channel) {
      syncPresencePeers(channel);
    }

    for (const [peerId, record] of peersRef.current) {
      if (isPeerConnectionDead(record)) {
        removePeerRecord(peerId);
        continue;
      }

      void attachLocalTracks(record.pc).then((addedTracks) => {
        if (!addedTracks || record.pc.signalingState !== 'stable') return;
        if (localUserId < peerId) {
          void renegotiatePeer(peerId, record);
        }
      });
    }
  }, [
    attachLocalTracks,
    iceReady,
    localStream,
    localUserId,
    mediaReady,
    removePeerRecord,
    renegotiatePeer,
    syncPresencePeers,
  ]);

  return { participants, status };
};
