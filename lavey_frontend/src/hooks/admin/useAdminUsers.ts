import { useCallback, useEffect, useState } from 'react';
import { adminService } from '@/services/admin/adminService';
import type {
  AdminUserRecord,
  AdminUsersRecordFilter,
  AdminUsersStatusFilter,
  AdminUsersSummary,
  AdminUsersView,
} from '@/types/admin.types';

interface UseAdminUsersResult {
  users: AdminUserRecord[];
  summary: AdminUsersSummary | null;
  total: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAdminUsers(
  view: AdminUsersView,
  page: number,
  enabled: boolean,
  search?: string,
  status: AdminUsersStatusFilter = 'all',
  record: AdminUsersRecordFilter = 'all',
): UseAdminUsersResult {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [summary, setSummary] = useState<AdminUsersSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refetch = useCallback(() => {
    setReloadToken((v) => v + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminService.listUsers({ view, page, limit: 10, search, status, record });
        if (cancelled) return;
        setUsers(result.users);
        setSummary(result.summary);
        setTotal(result.pagination.total);
        setTotalPages(result.pagination.totalPages);
      } catch (err) {
        if (cancelled) return;
        setUsers([]);
        setSummary(null);
        setTotal(0);
        setTotalPages(1);
        setError(err instanceof Error ? err.message : 'Could not load users');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [view, page, enabled, search, status, record, reloadToken]);

  return { users, summary, total, totalPages, loading, error, refetch };
}
