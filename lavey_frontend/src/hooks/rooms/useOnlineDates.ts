import { useCallback, useEffect, useState } from 'react';
import { roomService } from '@/services';
import type { CreateDateInput, DateInvite, MeetingJoinResult, OnlineDate } from '@/types';

export function useOnlineDates() {
  const [dates, setDates] = useState<OnlineDate[]>([]);
  const [invites, setInvites] = useState<DateInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [dateList, inviteList] = await Promise.all([
        roomService.getOnlineDates(),
        roomService.getDateInvites(),
      ]);
      setDates(dateList);
      setInvites(inviteList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load online dates');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const joinDate = useCallback(async (dateId: string, accessCode: string): Promise<MeetingJoinResult> => {
    setJoiningId(dateId);
    setActionError(null);
    try {
      return await roomService.joinDate(dateId, accessCode);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not join');
      throw err;
    } finally {
      setJoiningId(null);
    }
  }, []);

  const joinByCode = useCallback(async (accessCode: string): Promise<MeetingJoinResult> => {
    setActionError(null);
    try {
      return await roomService.joinByCode(accessCode);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Invalid code');
      throw err;
    }
  }, []);

  const createDate = useCallback(async (input: CreateDateInput) => {
    setActionError(null);
    const created = await roomService.createDate(input);
    setDates((prev) => [created, ...prev]);
    return created;
  }, []);

  const respondToInvite = useCallback(
    async (inviteId: string, action: 'accept' | 'decline') => {
      setActionError(null);
      await roomService.respondToInvite(inviteId, action);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    },
    [],
  );

  return {
    dates,
    invites,
    isLoading,
    error,
    actionError,
    joiningId,
    refetch: fetch,
    joinDate,
    joinByCode,
    createDate,
    respondToInvite,
    clearActionError: () => setActionError(null),
  };
}
