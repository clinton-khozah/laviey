import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { hasSupabaseRealtime } from '@/config/env';
import { getSupabaseRealtimeClient } from '@/lib/supabaseClient';
import type { MeetingParticipant } from '@/types';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

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
}

interface PeerRecord {
  pc: RTCPeerConnection;
  meta: MeetupPresenceMeta;
  stream: MediaStream | null;
  pendingCandidates: RTCIceCandidateInit[];
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

function ensureReceiveTransceivers(pc: RTCPeerConnection) {
  if (pc.getTransceivers().length > 0) return;
  pc.addTransceiver('audio', { direction: 'recvonly' });
  pc.addTransceiver('video', { direction: 'recvonly' });
}

export function useMeetupWebRTC({
  meetupId,
  localUserId,
  localDisplayName,
  localAvatarUrl,
  isHost,
  localStream,
}: UseMeetupWebRTCOptions) {
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [status, setStatus] = useState<MeetupConnectionStatus>(
    hasSupabaseRealtime() ? 'connecting' : 'unsupported',
  );

  const peersRef = useRef<Map<string, PeerRecord>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const localStreamRef = useRef(localStream);
  localStreamRef.current = localStream;

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

  const attachLocalTracks = useCallback((pc: RTCPeerConnection) => {
    const stream = localStreamRef.current;
    if (stream) {
      let attached = false;
      for (const track of stream.getTracks()) {
        const senders = pc.getSenders();
        if (!senders.some((sender) => sender.track?.kind === track.kind)) {
          pc.addTrack(track, stream);
          attached = true;
        }
      }
      return attached;
    }

    ensureReceiveTransceivers(pc);
    return false;
  }, []);

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

  const renegotiatePeer = useCallback(
    async (peerId: string, record: PeerRecord) => {
      if (record.pc.signalingState !== 'stable') return;
      try {
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
      }
    },
    [localUserId, sendSignal],
  );

  const createPeerConnection = useCallback(
    (meta: MeetupPresenceMeta): PeerRecord => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const record: PeerRecord = { pc, meta, stream: null, pendingCandidates: [] };
      peersRef.current.set(meta.odUserId, record);

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteStream) {
          record.stream = remoteStream;
        } else if (event.track) {
          attachRemoteTrack(record, event.track);
        }
        syncParticipants();
      };

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        sendSignal({
          type: 'ice',
          from: localUserId,
          to: meta.odUserId,
          candidate: event.candidate.toJSON(),
        });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          peersRef.current.delete(meta.odUserId);
          pc.close();
          syncParticipants();
        }
      };

      attachLocalTracks(pc);
      return record;
    },
    [attachLocalTracks, localUserId, sendSignal, syncParticipants],
  );

  const createOffer = useCallback(
    async (meta: MeetupPresenceMeta) => {
      if (peersRef.current.has(meta.odUserId)) return;

      const record = createPeerConnection(meta);
      const offer = await record.pc.createOffer();
      await record.pc.setLocalDescription(offer);
      sendSignal({
        type: 'offer',
        from: localUserId,
        to: meta.odUserId,
        sdp: offer,
      });
      syncParticipants();
    },
    [createPeerConnection, localUserId, sendSignal, syncParticipants],
  );

  const handleSignal = useCallback(
    async (payload: SignalPayload) => {
      if (payload.to !== localUserId) return;

      if (payload.type === 'offer' && payload.sdp) {
        let record = peersRef.current.get(payload.from);
        if (!record) {
          const presenceMeta = lookupPresenceMeta(payload.from);
          record = createPeerConnection(
            presenceMeta ?? {
              odUserId: payload.from,
              name: 'Guest',
              avatarUrl: '',
              isHost: false,
            },
          );
        }

        try {
          await record.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          attachLocalTracks(record.pc);
          const answer = await record.pc.createAnswer();
          await record.pc.setLocalDescription(answer);
          sendSignal({
            type: 'answer',
            from: localUserId,
            to: payload.from,
            sdp: answer,
          });
          await flushPendingCandidates(record);
          syncParticipants();
        } catch {
          /* ignore glare / stale SDP */
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
          /* ignore stale SDP */
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
      sendSignal,
      syncParticipants,
    ],
  );

  const connectToPeer = useCallback(
    (meta: MeetupPresenceMeta) => {
      if (!meta.odUserId || meta.odUserId === localUserId) return;

      const existing = peersRef.current.get(meta.odUserId);
      if (existing) {
        existing.meta = { ...existing.meta, ...meta };
        syncParticipants();
        return;
      }

      if (localUserId < meta.odUserId) {
        void createOffer(meta);
      }
    },
    [createOffer, localUserId, syncParticipants],
  );

  const syncPresencePeers = useCallback(
    (channel: RealtimeChannel) => {
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
      const record = peersRef.current.get(meta.odUserId);
      if (!record) return;
      record.pc.close();
      peersRef.current.delete(meta.odUserId);
      syncParticipants();
    },
    [syncParticipants],
  );

  useEffect(() => {
    if (!hasSupabaseRealtime() || !meetupId || !localUserId) {
      setStatus('unsupported');
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
    const channel = channelRef.current;
    if (channel) {
      syncPresencePeers(channel);
    }

    for (const [peerId, record] of peersRef.current) {
      const hadOutgoingTracks = record.pc.getSenders().some((sender) => sender.track);
      const addedTracks = attachLocalTracks(record.pc);

      if (!addedTracks || record.pc.signalingState !== 'stable') continue;

      if (!hadOutgoingTracks) {
        void renegotiatePeer(peerId, record);
        continue;
      }

      if (localUserId < peerId) {
        void renegotiatePeer(peerId, record);
      }
    }
  }, [attachLocalTracks, localStream, localUserId, renegotiatePeer, syncPresencePeers]);

  return { participants, status };
};
