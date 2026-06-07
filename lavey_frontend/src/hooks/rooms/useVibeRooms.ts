import { useCallback, useEffect, useState } from 'react';
import { roomService } from '@/services';
import type { VibeRoom } from '@/types';

export function useVibeRooms() {
  const [rooms, setRooms] = useState<VibeRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setRooms(await roomService.getVibeRooms());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rooms');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const joinRoom = useCallback(async (roomId: string) => {
    setJoiningId(roomId);
    try {
      await roomService.joinRoom(roomId);
    } finally {
      setJoiningId(null);
    }
  }, []);

  return { rooms, isLoading, error, joiningId, refetch: fetch, joinRoom };
}
