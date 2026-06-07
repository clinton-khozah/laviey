import { useCallback, useEffect, useState } from 'react';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { privacyService, type BlockedUser } from '@/services/privacy/privacyService';
import { defaultAvatar } from '@/constants/defaultAvatar';
import './BlockedUsersSheet.css';

interface BlockedUsersSheetProps {
  open: boolean;
  onClose: () => void;
}

export function BlockedUsersSheet({ open, onClose }: BlockedUsersSheetProps) {
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await privacyService.listBlockedUsers();
      setUsers(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load blocked users.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const handleUnblock = async (userId: string) => {
    setUnblockingId(userId);
    try {
      await privacyService.unblockUser(userId);
      setUsers((prev) => prev.filter((u) => u.userId !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not unblock user.');
    } finally {
      setUnblockingId(null);
    }
  };

  return (
    <ProfileSheet open={open} title="Blocked users" onClose={onClose} fromTop hideHandle>
      <div className="blocked-users-sheet">
        {isLoading && <p className="blocked-users-sheet__status">Loading…</p>}
        {error && (
          <p className="blocked-users-sheet__error" role="alert">
            {error}
          </p>
        )}
        {!isLoading && users.length === 0 && !error && (
          <p className="blocked-users-sheet__empty">
            You haven&apos;t blocked anyone. Blocked people can&apos;t see your profile or message you.
          </p>
        )}
        <ul className="blocked-users-sheet__list">
          {users.map((user) => (
            <li key={user.userId} className="blocked-users-sheet__item">
              <img
                className="blocked-users-sheet__avatar"
                src={user.avatarUrl || defaultAvatar}
                alt=""
              />
              <div className="blocked-users-sheet__info">
                <span className="blocked-users-sheet__name">{user.displayName}</span>
                <span className="blocked-users-sheet__meta">Blocked</span>
              </div>
              <button
                type="button"
                className="blocked-users-sheet__unblock"
                disabled={unblockingId === user.userId}
                onClick={() => void handleUnblock(user.userId)}
              >
                {unblockingId === user.userId ? '…' : 'Unblock'}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </ProfileSheet>
  );
}
