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
    isConnecting: !record.stream,
    isVideoOff: isRemoteVideoOff(record.stream),
    isMuted: isRemoteMuted(record.stream),
  };
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

  const attachLocalTracks = useCallback((pc: RTCPeerConnection) => {
    const stream = localStreamRef.current;
    if (!stream) return;
    for (const track of stream.getTracks()) {
      const senders = pc.getSenders();
      if (!senders.some((sender) => sender.track?.kind === track.kind)) {
        pc.addTrack(track, stream);
      }
    }
  }, []);

  const createPeerConnection = useCallback(
    (meta: MeetupPresenceMeta): PeerRecord => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const record: PeerRecord = { pc, meta, stream: null };
      peersRef.current.set(meta.odUserId, record);

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (!remoteStream) return;
        record.stream = remoteStream;
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
          record = createPeerConnection({
            odUserId: payload.from,
            name: 'Guest',
            avatarUrl: '',
            isHost: false,
          });
        }
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
        syncParticipants();
        return;
      }

      if (payload.type === 'answer' && payload.sdp) {
        const record = peersRef.current.get(payload.from);
        if (!record) return;
        await record.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        syncParticipants();
        return;
      }

      if (payload.type === 'ice' && payload.candidate) {
        const record = peersRef.current.get(payload.from);
        if (!record) return;
        try {
          await record.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch {
          /* ignore stale candidates */
        }
      }
    },
    [attachLocalTracks, createPeerConnection, localUserId, sendSignal, syncParticipants],
  );

  const connectToPeer = useCallback(
    (meta: MeetupPresenceMeta) => {
      if (!meta.odUserId || meta.odUserId === localUserId) return;
      if (peersRef.current.has(meta.odUserId)) return;
      if (localUserId < meta.odUserId) {
        void createOffer(meta);
      }
    },
    [createOffer, localUserId],
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
      config: { presence: { key: localUserId } },
    });
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        void handleSignal(payload as SignalPayload);
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<MeetupPresenceMeta>();
        for (const presences of Object.values(state)) {
          for (const meta of presences) {
            connectToPeer(meta);
          }
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        for (const meta of newPresences as MeetupPresenceMeta[]) {
          connectToPeer(meta);
        }
      })
      .subscribe(async (subscribeStatus) => {
        if (subscribeStatus !== 'SUBSCRIBED') return;
        await channel.track({
          odUserId: localUserId,
          name: localDisplayName,
          avatarUrl: localAvatarUrl,
          isHost,
        });
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
  ]);

  useEffect(() => {
    if (!localStream) return;
    for (const record of peersRef.current.values()) {
      attachLocalTracks(record.pc);
    }
  }, [attachLocalTracks, localStream]);

  return { participants, status };
}
