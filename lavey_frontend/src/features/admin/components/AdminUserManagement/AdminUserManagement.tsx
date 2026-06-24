import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APP_IMAGES } from '@/constants/images';
import { PLATINUM_FEATURES, PLATINUM_PLANS } from '@/constants/platinum';
import { useAdminUsers } from '@/hooks/admin/useAdminUsers';
import { adminService } from '@/services/admin/adminService';
import type {
  AdminUserAction,
  AdminUserDetail,
  AdminUserInsight,
  AdminUserLiker,
  AdminUserMatch,
  AdminUserMeeting,
  AdminUserRecord,
  AdminUpdateUserInput,
  AdminUsersRecordFilter,
  AdminUsersStatusFilter,
  AdminUsersView,
} from '@/types/admin.types';

interface AdminUserManagementProps {
  onOpenSupport?: () => void;
}

function KpiStatIcon({ tone }: { tone: 'blue' | 'red' | 'green' }) {
  const stroke = tone === 'blue' ? '#2563eb' : tone === 'green' ? '#16a34a' : '#dc2626';
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0114 0" />
    </svg>
  );
}

function accountStatusLabel(status: AdminUserRecord['accountStatus']): string {
  if (status === 'banned') return 'Blocked';
  if (status === 'restricted') return 'Restricted';
  return 'Active';
}

function recordToDetailPreview(row: AdminUserRecord): AdminUserDetail {
  return { ...row, profilePosts: [] };
}

function safetyScoreTone(score: number | null): 'good' | 'warn' | 'bad' | 'neutral' {
  if (score == null) return 'neutral';
  if (score >= 80) return 'good';
  if (score >= 50) return 'warn';
  return 'bad';
}

function insightFlagsLabel(flags: string[]): string[] {
  const filtered = flags.filter((flag) => flag && flag !== 'none');
  return filtered.length ? filtered : ['None flagged'];
}

function IconEye() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function IconPosts() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

function IconChatRestrict() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M21 15a4 4 0 01-4 4H8l-5 3V7a4 4 0 014-4h10a4 4 0 014 4z" />
      <path d="M9 10h6M12 7v6" />
    </svg>
  );
}

function IconPlatinum() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 2l2.4 6.8H22l-5.6 4.1 2.1 6.7L12 16.8 5.5 19.6l2.1-6.7L2 8.8h7.6L12 2z" />
    </svg>
  );
}

function IconBlock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M7 7l10 10" />
    </svg>
  );
}

function IconQuiz() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M9 11h6M9 15h4" />
      <path d="M7 3h10a2 2 0 012 2v14l-4-3H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
    </svg>
  );
}

function IconHeart() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 21s-7-4.5-9.5-9C.5 9.5 2 6 5.5 6c2 0 3.5 1.5 4 3 .5-1.5 2-3 4-3 3.5 0 5 3.5 2.5 6S12 21 12 21z" />
    </svg>
  );
}

function IconMatch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="8.5" cy="8" r="3.5" />
      <circle cx="15.5" cy="8" r="3.5" />
      <path d="M5 20a3.5 3.5 0 017 0" />
      <path d="M12 20a3.5 3.5 0 017 0" />
      <path d="M12 11.5v2" />
    </svg>
  );
}

export function AdminUserManagement({ onOpenSupport }: AdminUserManagementProps) {
  const [usersView, setUsersView] = useState<AdminUsersView>('all');
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AdminUsersStatusFilter>('all');
  const [recordFilter, setRecordFilter] = useState<AdminUsersRecordFilter>('all');
  const [notice, setNotice] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  const [likesPanelUser, setLikesPanelUser] = useState<AdminUserRecord | null>(null);
  const [likers, setLikers] = useState<AdminUserLiker[]>([]);
  const [likersLoading, setLikersLoading] = useState(false);
  const [selectedLiker, setSelectedLiker] = useState<AdminUserLiker | null>(null);
  const [likesSearch, setLikesSearch] = useState('');
  const [likesFilter, setLikesFilter] = useState<'all' | 'verified' | 'platinum'>('all');

  const [matchesPanelUser, setMatchesPanelUser] = useState<AdminUserRecord | null>(null);
  const [matches, setMatches] = useState<AdminUserMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<AdminUserMatch | null>(null);
  const [matchesSearch, setMatchesSearch] = useState('');
  const [matchesFilter, setMatchesFilter] = useState<'all' | 'verified' | 'platinum'>('all');

  const [selectedViewedUser, setSelectedViewedUser] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [insight, setInsight] = useState<AdminUserInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  const [selectedPlanUser, setSelectedPlanUser] = useState<AdminUserRecord | null>(null);
  const [activityModalUser, setActivityModalUser] = useState<AdminUserDetail | null>(null);
  const viewModalCardRef = useRef<HTMLElement | null>(null);
  const quizSectionRef = useRef<HTMLElement | null>(null);
  const [quizSectionHighlight, setQuizSectionHighlight] = useState(false);
  const [meetings, setMeetings] = useState<AdminUserMeeting[]>([]);
  const [activityTab, setActivityTab] = useState<'posts' | 'meetings'>('posts');
  const [activityLoading, setActivityLoading] = useState(false);
  const [avatarFullView, setAvatarFullView] = useState<{ src: string; name: string } | null>(null);
  const [showAddUserInfo, setShowAddUserInfo] = useState(false);
  const [editUser, setEditUser] = useState<AdminUserDetail | null>(null);
  const [editForm, setEditForm] = useState<AdminUpdateUserInput>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editTab, setEditTab] = useState<'profile' | 'message'>('profile');
  const [adminMessage, setAdminMessage] = useState('');
  const [messageSending, setMessageSending] = useState(false);
  const [resetPasswordBusy, setResetPasswordBusy] = useState(false);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<AdminUserRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [blockConfirm, setBlockConfirm] = useState<{
    userId: string;
    name: string;
    action: 'ban' | 'unban';
  } | null>(null);
  const [resultModal, setResultModal] = useState<{
    title: string;
    message: string;
    tone: 'success' | 'error';
  } | null>(null);

  const {
    users,
    summary,
    total,
    totalPages,
    loading,
    error,
    refetch,
  } = useAdminUsers(usersView, usersPage, true, usersSearch, statusFilter, recordFilter);

  useEffect(() => {
    setUsersPage(1);
  }, [usersView, statusFilter, recordFilter]);

  const openViewModal = useCallback(async (row: AdminUserRecord) => {
    setQuizSectionHighlight(false);
    setSelectedViewedUser(recordToDetailPreview(row));
    setDetailLoading(true);
    setInsightLoading(true);
    setInsight(null);
    try {
      const [detail, nextInsight] = await Promise.all([
        adminService.getUserById(row.id),
        adminService.getUserInsight(row.id).catch(() => null),
      ]);
      setSelectedViewedUser(detail);
      setInsight(nextInsight);
    } catch (err) {
      setResultModal({
        title: 'Could not load profile',
        message: err instanceof Error ? err.message : 'Could not load member profile.',
        tone: 'error',
      });
    } finally {
      setDetailLoading(false);
      setInsightLoading(false);
    }
  }, []);

  const scrollToQuizSection = useCallback(() => {
    const card = viewModalCardRef.current;
    const section = quizSectionRef.current;
    if (!card || !section) return;

    const cardTop = card.getBoundingClientRect().top;
    const sectionTop = section.getBoundingClientRect().top;
    card.scrollTo({
      top: card.scrollTop + (sectionTop - cardTop) - 12,
      behavior: 'smooth',
    });

    setQuizSectionHighlight(true);
    window.setTimeout(() => setQuizSectionHighlight(false), 1600);
    section.focus({ preventScroll: true });
  }, []);

  const openLikesPanel = useCallback(async (user: AdminUserRecord) => {
    setLikesPanelUser(user);
    setLikesSearch('');
    setLikesFilter('all');
    setLikersLoading(true);
    setSelectedLiker(null);
    try {
      const list = await adminService.getUserLikers(user.id);
      setLikers(list);
      setSelectedLiker(list[0] ?? null);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not load likes.');
      setLikers([]);
    } finally {
      setLikersLoading(false);
    }
  }, []);

  const openMatchesPanel = useCallback(async (user: AdminUserRecord) => {
    setMatchesPanelUser(user);
    setMatchesSearch('');
    setMatchesFilter('all');
    setMatchesLoading(true);
    setSelectedMatch(null);
    try {
      const list = await adminService.getUserMatches(user.id);
      setMatches(list);
      setSelectedMatch(list[0] ?? null);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not load matches.');
      setMatches([]);
    } finally {
      setMatchesLoading(false);
    }
  }, []);

  const openActivityModal = useCallback(async (user: AdminUserRecord) => {
    setActivityTab('posts');
    setActivityLoading(true);
    setMeetings([]);
    try {
      const [detail, nextMeetings] = await Promise.all([
        adminService.getUserById(user.id),
        adminService.getUserMeetings(user.id),
      ]);
      setActivityModalUser(detail);
      setMeetings(nextMeetings);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not load member activity.');
    } finally {
      setActivityLoading(false);
    }
  }, []);

  const runAction = useCallback(
    async (userId: string, action: AdminUserAction, payload?: { postId?: string }) => {
      setActionBusy(true);
      try {
        const updated = await adminService.applyUserAction(userId, action, payload);
        setNotice(`Action "${action.replace(/_/g, ' ')}" applied.`);
        if (selectedViewedUser?.id === userId) setSelectedViewedUser(updated);
        if (activityModalUser?.id === userId) setActivityModalUser(updated);
        if (selectedPlanUser?.id === userId) setSelectedPlanUser(updated);
        if (editUser?.id === userId) setEditUser(updated);
        refetch();
      } catch (err) {
        setNotice(err instanceof Error ? err.message : 'Action failed.');
      } finally {
        setActionBusy(false);
      }
    },
    [activityModalUser?.id, editUser?.id, refetch, selectedPlanUser?.id, selectedViewedUser?.id],
  );

  const openEditModal = useCallback(async (user: AdminUserRecord) => {
    setEditTab('profile');
    setAdminMessage('');
    setEditLoading(true);
    setEditUser(null);
    try {
      const detail = await adminService.getUserById(user.id);
      setEditUser(detail);
      setEditForm({
        displayName: detail.name,
        email: detail.email,
        bio: detail.bio,
        headline: detail.headline ?? '',
        city: detail.city ?? '',
        pronouns: detail.gender !== 'Not set' ? detail.gender : '',
        dateOfBirth: detail.dateOfBirth ?? null,
        isPremium: detail.subscribed,
        isVerified: detail.isVerified,
        showOnDiscover: detail.showOnDiscover,
        accountStatus: detail.accountStatus,
      });
    } catch (err) {
      setResultModal({
        title: 'Could not open editor',
        message: err instanceof Error ? err.message : 'Could not load member for editing.',
        tone: 'error',
      });
    } finally {
      setEditLoading(false);
    }
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editUser) return;
    setEditSaving(true);
    try {
      const updated = await adminService.updateUser(editUser.id, editForm);
      setResultModal({ title: 'Changes saved', message: `Updated ${updated.name} successfully.`, tone: 'success' });
      if (selectedViewedUser?.id === editUser.id) setSelectedViewedUser(updated);
      setEditUser(updated);
      refetch();
    } catch (err) {
      setResultModal({
        title: 'Save failed',
        message: err instanceof Error ? err.message : 'Could not save changes.',
        tone: 'error',
      });
    } finally {
      setEditSaving(false);
    }
  }, [editForm, editUser, refetch, selectedViewedUser?.id]);

  const sendResetPassword = useCallback(async () => {
    if (!editUser) return;
    setResetPasswordBusy(true);
    try {
      const result = await adminService.resetUserPassword(editUser.id);
      setResultModal({
        title: 'Reset email sent',
        message: `Password reset email sent to ${result.email}. They can follow the link to choose a new password.`,
        tone: 'success',
      });
    } catch (err) {
      setResultModal({
        title: 'Reset failed',
        message: err instanceof Error ? err.message : 'Could not send reset email.',
        tone: 'error',
      });
    } finally {
      setResetPasswordBusy(false);
    }
  }, [editUser]);

  const sendAdminMessage = useCallback(async () => {
    if (!editUser || !adminMessage.trim()) return;
    setMessageSending(true);
    try {
      await adminService.messageUser(editUser.id, adminMessage.trim());
      setResultModal({
        title: 'Message sent',
        message: `Message delivered to ${editUser.name}'s Lavey Admin inbox (verified badge).`,
        tone: 'success',
      });
      setAdminMessage('');
      setEditTab('profile');
    } catch (err) {
      setResultModal({
        title: 'Message failed',
        message: err instanceof Error ? err.message : 'Could not send message.',
        tone: 'error',
      });
    } finally {
      setMessageSending(false);
    }
  }, [adminMessage, editUser]);

  const confirmBlockAccess = useCallback(async () => {
    if (!blockConfirm) return;
    const { userId, name, action } = blockConfirm;
    setActionBusy(true);
    try {
      const updated = await adminService.applyUserAction(userId, action);
      setBlockConfirm(null);
      if (selectedViewedUser?.id === userId) setSelectedViewedUser(updated);
      if (activityModalUser?.id === userId) setActivityModalUser(updated);
      if (selectedPlanUser?.id === userId) setSelectedPlanUser(updated);
      if (editUser?.id === userId) setEditUser(updated);
      setResultModal({
        title: action === 'ban' ? 'Blocked from app' : 'Access restored',
        message:
          action === 'ban'
            ? `${name} can no longer sign in or use Lavey. Active sessions are rejected on the next request.`
            : `${name} can sign in and use the app again.`,
        tone: 'success',
      });
      refetch();
    } catch (err) {
      setBlockConfirm(null);
      setResultModal({
        title: action === 'ban' ? 'Block failed' : 'Unblock failed',
        message: err instanceof Error ? err.message : 'Could not update app access.',
        tone: 'error',
      });
    } finally {
      setActionBusy(false);
    }
  }, [activityModalUser?.id, blockConfirm, editUser?.id, refetch, selectedPlanUser?.id, selectedViewedUser?.id]);

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirmUser) return;
    const deletedName = deleteConfirmUser.name;
    setDeleteBusy(true);
    try {
      await adminService.deleteUser(deleteConfirmUser.id);
      if (selectedViewedUser?.id === deleteConfirmUser.id) setSelectedViewedUser(null);
      if (editUser?.id === deleteConfirmUser.id) setEditUser(null);
      if (likesPanelUser?.id === deleteConfirmUser.id) setLikesPanelUser(null);
      if (matchesPanelUser?.id === deleteConfirmUser.id) setMatchesPanelUser(null);
      setDeleteConfirmUser(null);
      setResultModal({
        title: 'Member deleted',
        message: `${deletedName} and all related data were permanently deleted.`,
        tone: 'success',
      });
      refetch();
    } catch (err) {
      setDeleteConfirmUser(null);
      setResultModal({
        title: 'Delete failed',
        message: err instanceof Error ? err.message : 'Delete failed.',
        tone: 'error',
      });
    } finally {
      setDeleteBusy(false);
    }
  }, [deleteConfirmUser, editUser?.id, likesPanelUser?.id, matchesPanelUser?.id, refetch, selectedViewedUser?.id]);

  const filteredLikers = useMemo(() => {
    return likers.filter((liker) => {
      const q = likesSearch.trim().toLowerCase();
      if (q && !liker.name.toLowerCase().includes(q) && !liker.handle.toLowerCase().includes(q)) return false;
      if (likesFilter === 'verified') return liker.isVerified;
      if (likesFilter === 'platinum') return liker.plan === 'Platinum';
      return true;
    });
  }, [likers, likesFilter, likesSearch]);

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      const q = matchesSearch.trim().toLowerCase();
      if (q && !match.name.toLowerCase().includes(q) && !match.handle.toLowerCase().includes(q)) return false;
      if (matchesFilter === 'verified') return match.isVerified;
      if (matchesFilter === 'platinum') return match.plan === 'Platinum';
      return true;
    });
  }, [matches, matchesFilter, matchesSearch]);

  const hasFullScreenOverlay = Boolean(
    likesPanelUser ||
      matchesPanelUser ||
      selectedViewedUser ||
      selectedPlanUser ||
      activityModalUser ||
      avatarFullView ||
      showAddUserInfo ||
      blockConfirm,
  );

  const currentPage = Math.min(usersPage, totalPages);
  const pageStart = total === 0 ? 0 : (currentPage - 1) * 10 + 1;
  const pageEnd = Math.min(currentPage * 10, total);

  return (
    <section className="admin-customers-card">
      {!hasFullScreenOverlay && (
        <>
          <div className="admin-stat-grid admin-stat-grid--3">
            <article className="admin-stat-card admin-stat-card--blue">
              <div className="admin-stat-card__icon" aria-hidden>
                <KpiStatIcon tone="blue" />
              </div>
              <div className="admin-stat-card__body">
                <strong>{summary?.activeUsers.toLocaleString() ?? '—'}</strong>
                <p>Active users</p>
                <span className="admin-stat-card__meta admin-stat-card__meta--up">Live from database</span>
              </div>
            </article>
            <article className="admin-stat-card admin-stat-card--green">
              <div className="admin-stat-card__icon" aria-hidden>
                <KpiStatIcon tone="green" />
              </div>
              <div className="admin-stat-card__body">
                <strong>{summary?.subscribedMembers.toLocaleString() ?? '—'}</strong>
                <p>Subscribed members</p>
                <span className="admin-stat-card__meta">Platinum members</span>
              </div>
            </article>
            <article className="admin-stat-card admin-stat-card--red">
              <div className="admin-stat-card__icon" aria-hidden>
                <KpiStatIcon tone="red" />
              </div>
              <div className="admin-stat-card__body">
                <strong>{summary?.highMatchUsers.toLocaleString() ?? '—'}</strong>
                <p>High match users</p>
                <span className="admin-stat-card__meta">10+ matches</span>
              </div>
            </article>
          </div>

          <div className="admin-filter-bar">
            <label className="admin-filter-bar__search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3-3" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, email, or handle..."
                value={usersSearch}
                onChange={(e) => {
                  setUsersSearch(e.target.value);
                  setUsersPage(1);
                }}
              />
            </label>
            <select
              className="admin-filter-bar__select"
              value={statusFilter}
              aria-label="Status filter"
              onChange={(e) => setStatusFilter(e.target.value as AdminUsersStatusFilter)}
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="restricted">Restricted</option>
              <option value="banned">Banned</option>
            </select>
            <select
              className="admin-filter-bar__select"
              value={recordFilter}
              aria-label="Record filter"
              onChange={(e) => setRecordFilter(e.target.value as AdminUsersRecordFilter)}
            >
              <option value="all">All records</option>
              <option value="verified">Verified</option>
              <option value="platinum">Platinum</option>
            </select>
          </div>

          <div className="admin-customers-card__segments">
            {(
              [
                ['all', 'All users'],
                ['subscribed', 'Subscribed users'],
                ['new', 'New users'],
                ['matches', 'Most matches'],
                ['top', 'Top users'],
              ] as const
            ).map(([view, label]) => (
              <button
                key={view}
                type="button"
                className={usersView === view ? 'is-active' : ''}
                onClick={() => setUsersView(view)}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {!hasFullScreenOverlay && (
        <div className="admin-customers-card__table-panel admin-surface-card">
          <header className="admin-surface-card__head admin-surface-card__head--table">
            <h4>Member records ({total})</h4>
            <button type="button" className="admin-dash-v2__primary-btn" onClick={() => setShowAddUserInfo(true)}>
              + Add user
            </button>
          </header>
          {error ? <p className="admin-customers-card__error">{error}</p> : null}
          <div className="admin-users-table-wrap admin-users-table-wrap--customers">
            <table className="admin-users-table admin-users-table--customers">
              <colgroup>
                <col className="admin-users-table__col-member" />
                <col className="admin-users-table__col-likes" />
                <col className="admin-users-table__col-age" />
                <col className="admin-users-table__col-gender" />
                <col className="admin-users-table__col-matches" />
                <col className="admin-users-table__col-plan" />
                <col className="admin-users-table__col-status" />
                <col className="admin-users-table__col-last-seen" />
                <col className="admin-users-table__col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Likes</th>
                  <th>Age</th>
                  <th>Gender</th>
                  <th>Matches</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Last seen</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9}>
                      <p className="admin-customers-card__loading">Loading members…</p>
                    </td>
                  </tr>
                ) : null}
                {!loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <p className="admin-customers-card__empty">No members found for this filter.</p>
                    </td>
                  </tr>
                ) : null}
                {!loading &&
                  users.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="admin-users-table__customer">
                          <img
                            src={row.avatarUrl ?? APP_IMAGES.logo}
                            alt=""
                            onError={(event) => {
                              event.currentTarget.onerror = null;
                              event.currentTarget.src = APP_IMAGES.logo;
                            }}
                          />
                          <div className="admin-users-table__customer-text">
                            <strong title={row.name}>{row.name}</strong>
                            <span title={row.handle}>{row.handle}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admin-users-table__likes"
                          onClick={() => void openLikesPanel(row)}
                          aria-label={`Open likes list for ${row.name}`}
                        >
                          <span className="admin-users-table__likes-count">{row.likes}</span>
                          <span className="admin-users-table__likes-icon" aria-hidden>
                            <IconHeart />
                          </span>
                        </button>
                      </td>
                      <td>{row.age ?? '—'}</td>
                      <td>{row.gender}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-users-table__likes admin-users-table__matches"
                          onClick={() => void openMatchesPanel(row)}
                          aria-label={`Open matches list for ${row.name}`}
                        >
                          <span className="admin-users-table__likes-count">{row.matches}</span>
                          <span className="admin-users-table__matches-icon" aria-hidden>
                            <IconMatch />
                          </span>
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`admin-pill admin-pill--plan admin-pill--${row.plan.toLowerCase()} admin-pill--interactive`}
                          onClick={() => setSelectedPlanUser(row)}
                        >
                          {row.plan}
                        </button>
                      </td>
                      <td>
                        <span className={`admin-pill admin-pill--status admin-pill--${row.accountStatus}`}>
                          {accountStatusLabel(row.accountStatus)}
                        </span>
                      </td>
                      <td className="admin-users-table__last-seen">{row.lastSeen}</td>
                      <td>
                        <div className="admin-users-table__actions">
                          <button
                            type="button"
                            className="admin-users-table__icon-btn admin-users-table__icon-btn--view"
                            aria-label={`View ${row.name}`}
                            title="View profile"
                            onClick={() => void openViewModal(row)}
                          >
                            <IconEye />
                          </button>
                          <button
                            type="button"
                            className="admin-users-table__icon-btn admin-users-table__icon-btn--edit"
                            aria-label={`Edit ${row.name}`}
                            title="Edit member"
                            onClick={() => void openEditModal(row)}
                          >
                            <IconEdit />
                          </button>
                          <button
                            type="button"
                            className="admin-users-table__icon-btn admin-users-table__icon-btn--delete"
                            aria-label={`Delete ${row.name}`}
                            title="Delete member"
                            disabled={deleteBusy}
                            onClick={() => setDeleteConfirmUser(row)}
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="admin-users-table__pagination">
            <p>
              Showing <strong>{pageStart}</strong>-<strong>{pageEnd}</strong> of <strong>{total}</strong>
            </p>
            <div>
              <button type="button" disabled={currentPage <= 1} onClick={() => setUsersPage((p) => Math.max(1, p - 1))}>
                Previous
              </button>
              <span>
                Page {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setUsersPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {notice && !hasFullScreenOverlay && !resultModal && (
        <p className="admin-content-moderation__notice">{notice}</p>
      )}

      {showAddUserInfo && (
        <div className="admin-plan-modal" role="dialog" aria-modal="true" aria-label="Add member">
          <button type="button" className="admin-plan-modal__backdrop" onClick={() => setShowAddUserInfo(false)} />
          <article className="admin-plan-modal__card">
            <header className="admin-plan-modal__head">
              <div>
                <h4>Invite members to Lavey</h4>
                <p>Members register through the mobile app. Admins manage accounts here after signup.</p>
              </div>
              <button type="button" onClick={() => setShowAddUserInfo(false)} aria-label="Close">
                ×
              </button>
            </header>
            <section className="admin-plan-modal__free">
              <ul>
                <li>Share the app link so new users can create a profile.</li>
                <li>They appear in this table automatically once registered.</li>
                <li>Use Support inbox to message members after they join.</li>
              </ul>
              {onOpenSupport && (
                <button type="button" className="admin-dash-v2__primary-btn" onClick={() => { setShowAddUserInfo(false); onOpenSupport(); }}>
                  Open Support inbox
                </button>
              )}
            </section>
          </article>
        </div>
      )}

      {likesPanelUser && (
        <div className="admin-likes-modal" role="dialog" aria-modal="true" aria-label="Users who liked this profile">
          <button type="button" className="admin-likes-modal__backdrop" onClick={() => setLikesPanelUser(null)} />
          <div className="admin-likes-modal__card">
            <header className="admin-likes-modal__head">
              <div>
                <h4>
                  <span className="admin-likes-modal__title-icon admin-likes-modal__title-icon--heart" aria-hidden>
                    <IconHeart />
                  </span>
                  {likesPanelUser.name} · likes received
                </h4>
                <p>Real profile and post likes from the database.</p>
              </div>
              <button type="button" onClick={() => setLikesPanelUser(null)} aria-label="Close">
                ×
              </button>
            </header>
            <div className="admin-likes-modal__stats">
              <article>
                <span>Total likers</span>
                <strong>{likers.length}</strong>
              </article>
              <article>
                <span>Verified</span>
                <strong>{likers.filter((l) => l.isVerified).length}</strong>
              </article>
              <article>
                <span>Platinum</span>
                <strong>{likers.filter((l) => l.plan === 'Platinum').length}</strong>
              </article>
            </div>
            <div className="admin-likes-modal__toolbar">
              <input value={likesSearch} onChange={(e) => setLikesSearch(e.target.value)} placeholder="Search name or @handle" />
              <div className="admin-likes-modal__filters">
                {(['all', 'verified', 'platinum'] as const).map((filter) => (
                  <button key={filter} type="button" className={likesFilter === filter ? 'is-active' : ''} onClick={() => setLikesFilter(filter)}>
                    {filter === 'all' ? 'All' : filter === 'verified' ? 'Verified' : 'Platinum'}
                  </button>
                ))}
              </div>
            </div>
            <div className="admin-likes-modal__body">
              <aside className="admin-likes-modal__list">
                {likersLoading && <p className="admin-likes-modal__empty">Loading likers…</p>}
                {!likersLoading &&
                  filteredLikers.map((liker) => (
                    <button
                      key={liker.id}
                      type="button"
                      className={`admin-likes-modal__person ${selectedLiker?.id === liker.id ? 'is-active' : ''}`}
                      onClick={() => setSelectedLiker(liker)}
                    >
                      <img src={liker.avatarUrl ?? APP_IMAGES.logo} alt="" />
                      <div>
                        <strong>{liker.name}</strong>
                        <span>
                          {liker.handle} · {liker.likedAtLabel}
                        </span>
                      </div>
                      {liker.isVerified && <em>Verified</em>}
                    </button>
                  ))}
                {!likersLoading && filteredLikers.length === 0 && (
                  <p className="admin-likes-modal__empty">No likes recorded yet.</p>
                )}
              </aside>
              <section className="admin-likes-modal__details">
                {selectedLiker ? (
                  <>
                    <div className="admin-likes-modal__profile-head">
                      <img src={selectedLiker.avatarUrl ?? APP_IMAGES.logo} alt="" />
                      <div>
                        <h5>{selectedLiker.name}</h5>
                        <p>{selectedLiker.handle}</p>
                      </div>
                    </div>
                    <ul className="admin-likes-modal__info-grid">
                      <li><span>Age</span><strong>{selectedLiker.age ?? '—'}</strong></li>
                      <li><span>Gender</span><strong>{selectedLiker.gender}</strong></li>
                      <li><span>City</span><strong>{selectedLiker.city ?? '—'}</strong></li>
                      <li><span>Plan</span><strong>{selectedLiker.plan}</strong></li>
                      <li><span>Source</span><strong>{selectedLiker.source === 'post_like' ? 'Post like' : 'Profile like'}</strong></li>
                    </ul>
                    <p className="admin-likes-modal__about">{selectedLiker.bio || 'No bio yet.'}</p>
                  </>
                ) : (
                  <p>Select a profile to view details.</p>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {matchesPanelUser && (
        <div className="admin-likes-modal admin-likes-modal--matches" role="dialog" aria-modal="true" aria-label="Mutual matches">
          <button type="button" className="admin-likes-modal__backdrop" onClick={() => setMatchesPanelUser(null)} />
          <div className="admin-likes-modal__card">
            <header className="admin-likes-modal__head">
              <div>
                <h4>
                  <span className="admin-likes-modal__title-icon admin-likes-modal__title-icon--match" aria-hidden>
                    <IconMatch />
                  </span>
                  {matchesPanelUser.name} · mutual matches
                </h4>
                <p>Members who liked each other back on discover.</p>
              </div>
              <button type="button" onClick={() => setMatchesPanelUser(null)} aria-label="Close">
                ×
              </button>
            </header>
            <div className="admin-likes-modal__stats">
              <article>
                <span>Total matches</span>
                <strong>{matches.length}</strong>
              </article>
              <article>
                <span>Verified</span>
                <strong>{matches.filter((m) => m.isVerified).length}</strong>
              </article>
              <article>
                <span>Platinum</span>
                <strong>{matches.filter((m) => m.plan === 'Platinum').length}</strong>
              </article>
            </div>
            <div className="admin-likes-modal__toolbar">
              <input value={matchesSearch} onChange={(e) => setMatchesSearch(e.target.value)} placeholder="Search name or @handle" />
              <div className="admin-likes-modal__filters">
                {(['all', 'verified', 'platinum'] as const).map((filter) => (
                  <button key={filter} type="button" className={matchesFilter === filter ? 'is-active' : ''} onClick={() => setMatchesFilter(filter)}>
                    {filter === 'all' ? 'All' : filter === 'verified' ? 'Verified' : 'Platinum'}
                  </button>
                ))}
              </div>
            </div>
            <div className="admin-likes-modal__body">
              <aside className="admin-likes-modal__list">
                {matchesLoading && <p className="admin-likes-modal__empty">Loading matches…</p>}
                {!matchesLoading &&
                  filteredMatches.map((match) => (
                    <button
                      key={match.id}
                      type="button"
                      className={`admin-likes-modal__person ${selectedMatch?.id === match.id ? 'is-active' : ''}`}
                      onClick={() => setSelectedMatch(match)}
                    >
                      <img src={match.avatarUrl ?? APP_IMAGES.logo} alt="" />
                      <div>
                        <strong>{match.name}</strong>
                        <span>
                          {match.handle} · matched {match.matchedAtLabel}
                        </span>
                      </div>
                      {match.isVerified && <em>Verified</em>}
                    </button>
                  ))}
                {!matchesLoading && filteredMatches.length === 0 && (
                  <p className="admin-likes-modal__empty">No mutual matches yet.</p>
                )}
              </aside>
              <section className="admin-likes-modal__details">
                {selectedMatch ? (
                  <>
                    <div className="admin-likes-modal__profile-head">
                      <img src={selectedMatch.avatarUrl ?? APP_IMAGES.logo} alt="" />
                      <div>
                        <h5>{selectedMatch.name}</h5>
                        <p>{selectedMatch.handle}</p>
                      </div>
                    </div>
                    <ul className="admin-likes-modal__info-grid">
                      <li><span>Age</span><strong>{selectedMatch.age ?? '—'}</strong></li>
                      <li><span>Gender</span><strong>{selectedMatch.gender}</strong></li>
                      <li><span>City</span><strong>{selectedMatch.city ?? '—'}</strong></li>
                      <li><span>Plan</span><strong>{selectedMatch.plan}</strong></li>
                      <li><span>Matched</span><strong>{selectedMatch.matchedAtLabel}</strong></li>
                    </ul>
                    <p className="admin-likes-modal__about">{selectedMatch.bio || 'No bio yet.'}</p>
                  </>
                ) : (
                  <p>Select a match to view details.</p>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {selectedViewedUser && (
        <div className="admin-user-view-modal" role="dialog" aria-modal="true" aria-label="User full information">
          <button type="button" className="admin-user-view-modal__backdrop" onClick={() => setSelectedViewedUser(null)} />
          <article className="admin-user-view-modal__card" ref={viewModalCardRef}>
            <button type="button" className="admin-user-view-modal__close" onClick={() => setSelectedViewedUser(null)} aria-label="Close">
              ×
            </button>
            {detailLoading && (
              <p className="admin-user-view-modal__refresh">Refreshing full profile…</p>
            )}
            <div className="admin-user-view-modal__cover" />
            <div className="admin-user-view-modal__center-profile">
              <button
                type="button"
                className="admin-user-view-modal__avatar-btn"
                onClick={() =>
                  setAvatarFullView({
                    src: selectedViewedUser.avatarUrl ?? APP_IMAGES.logo,
                    name: selectedViewedUser.name,
                  })
                }
              >
                <img src={selectedViewedUser.avatarUrl ?? APP_IMAGES.logo} alt="" />
                <span className="admin-user-view-modal__avatar-btn-label">View full</span>
              </button>
              <h4>
                {selectedViewedUser.name}
                {selectedViewedUser.isVerified && <span className="admin-user-view-modal__verified">Verified</span>}
              </h4>
              <p>{selectedViewedUser.handle}</p>
              <p>{selectedViewedUser.email}</p>
              {selectedViewedUser.headline && <p className="admin-user-view-modal__headline">{selectedViewedUser.headline}</p>}
              {selectedViewedUser.accountStatus === 'banned' && (
                <span className="admin-user-view-modal__blocked-badge">Blocked from app</span>
              )}
            </div>
            <div className="admin-user-view-modal__stats">
              <article className="admin-user-view-modal__stat">
                <strong>{selectedViewedUser.likes}</strong>
                <span>Likes</span>
              </article>
              <article className="admin-user-view-modal__stat">
                <strong>{selectedViewedUser.matches}</strong>
                <span>Matches</span>
              </article>
              <button
                type="button"
                className="admin-user-view-modal__stat admin-user-view-modal__stat--quiz"
                onClick={scrollToQuizSection}
                aria-label={`Scroll to ${selectedViewedUser.name} quiz answers`}
                title="Jump to quiz answers"
              >
                <strong>{selectedViewedUser.quizCompletion}%</strong>
                <span>
                  <IconQuiz />
                  Quiz
                </span>
              </button>
            </div>
            {insightLoading ? (
              <section className="admin-user-view-modal__safety admin-user-view-modal__safety--loading" aria-live="polite">
                <div className="admin-user-view-modal__safety-score admin-user-view-modal__safety-score--neutral">…</div>
                <div className="admin-user-view-modal__safety-copy">
                  <strong>AI trust &amp; safety</strong>
                  <p>Generating safety summary…</p>
                </div>
              </section>
            ) : insight ? (
              <section
                className={`admin-user-view-modal__safety admin-user-view-modal__safety--${safetyScoreTone(insight.safetyScore)}`}
              >
                <div
                  className={`admin-user-view-modal__safety-score admin-user-view-modal__safety-score--${safetyScoreTone(insight.safetyScore)}`}
                  aria-label={`Safety score ${insight.safetyScore ?? 'unknown'}`}
                >
                  <span>{insight.safetyScore ?? '—'}</span>
                  <em>Score</em>
                </div>
                <div className="admin-user-view-modal__safety-copy">
                  <strong>AI trust &amp; safety</strong>
                  <div className="admin-user-view-modal__safety-flags">
                    {insightFlagsLabel(insight.flags).map((flag) => (
                      <span
                        key={flag}
                        className={`admin-user-view-modal__flag-pill${flag === 'None flagged' ? ' is-clear' : ''}`}
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                  <p>
                    {insight.flags.some((flag) => flag && flag !== 'none')
                      ? 'Review recommended before standard routing.'
                      : 'Looks acceptable for standard routing.'}
                  </p>
                </div>
              </section>
            ) : null}

            <div className="admin-user-view-modal__content">
              <section className="admin-user-view-modal__panel admin-user-view-modal__panel--profile">
                <header className="admin-user-view-modal__panel-head">
                  <h5>Profile information</h5>
                </header>
                <dl className="admin-user-view-modal__info-grid">
                  <div>
                    <dt>Plan</dt>
                    <dd>
                      <span className={`admin-pill admin-pill--plan admin-pill--${selectedViewedUser.plan.toLowerCase()}`}>
                        {selectedViewedUser.plan}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <span className={`admin-pill admin-pill--status admin-pill--${selectedViewedUser.accountStatus}`}>
                        {accountStatusLabel(selectedViewedUser.accountStatus)}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Last seen</dt>
                    <dd>{selectedViewedUser.lastSeen}</dd>
                  </div>
                  <div>
                    <dt>Age</dt>
                    <dd>{selectedViewedUser.age ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Gender</dt>
                    <dd className="is-capitalize">{selectedViewedUser.gender}</dd>
                  </div>
                  <div>
                    <dt>City</dt>
                    <dd>{selectedViewedUser.city ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Discover</dt>
                    <dd>{selectedViewedUser.showOnDiscover ? 'Visible' : 'Hidden'}</dd>
                  </div>
                  <div className="admin-user-view-modal__info-grid-span">
                    <dt>Bio</dt>
                    <dd className={selectedViewedUser.bio ? '' : 'is-muted'}>{selectedViewedUser.bio || 'No bio yet'}</dd>
                  </div>
                </dl>
              </section>

              <section
                ref={quizSectionRef}
                id="admin-user-view-quiz"
                tabIndex={-1}
                className={`admin-user-view-modal__panel admin-user-view-modal__panel--quiz${quizSectionHighlight ? ' is-highlighted' : ''}`}
                aria-label="Onboarding quiz answers"
              >
                <header className="admin-user-view-modal__panel-head">
                  <h5>Onboarding quiz</h5>
                  <span className="admin-user-view-modal__quiz-badge">
                    <IconQuiz />
                    {selectedViewedUser.quizCompletion}% · {selectedViewedUser.quizAnswers.length} answers
                  </span>
                </header>
                {selectedViewedUser.quizAnswers.length ? (
                  <ul className="admin-user-view-modal__quiz-list">
                    {selectedViewedUser.quizAnswers.map((item, index) => (
                      <li key={item.question}>
                        <p>
                          <span>Q{index + 1}.</span> {item.question}
                        </p>
                        <strong>{item.answer}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="admin-user-view-modal__quiz-empty">
                    <IconQuiz />
                    <p>Onboarding not completed yet.</p>
                  </div>
                )}
              </section>

              {selectedViewedUser.profilePosts.length > 0 && (
                <section className="admin-user-view-modal__panel admin-user-view-modal__panel--posts">
                  <header className="admin-user-view-modal__panel-head">
                    <h5>Profile posts</h5>
                    <span className="admin-user-view-modal__panel-count">{selectedViewedUser.profilePosts.length}</span>
                  </header>
                  <div className="admin-user-view-modal__posts-grid">
                    {selectedViewedUser.profilePosts.slice(0, 6).map((post) => (
                      <article key={post.id} className="admin-user-view-modal__post-thumb">
                        {post.type === 'video' ? (
                          <video src={post.src} poster={post.poster} muted playsInline />
                        ) : (
                          <img src={post.src} alt={post.caption ?? 'Post'} />
                        )}
                      </article>
                    ))}
                  </div>
                  {selectedViewedUser.profilePosts.length > 6 && (
                    <button
                      type="button"
                      className="admin-user-view-modal__posts-more"
                      onClick={() => void openActivityModal(selectedViewedUser)}
                    >
                      View all {selectedViewedUser.profilePosts.length} posts
                    </button>
                  )}
                </section>
              )}
            </div>

            <div className="admin-user-view-modal__toolbar">
              <button type="button" disabled={actionBusy} onClick={() => void openEditModal(selectedViewedUser)}>
                <IconEdit />
                Edit profile
              </button>
              <button type="button" disabled={actionBusy} onClick={() => void openActivityModal(selectedViewedUser)}>
                <IconPosts />
                View posts
              </button>
              <button type="button" disabled={actionBusy} onClick={() => void runAction(selectedViewedUser.id, 'restrict_chat')}>
                <IconChatRestrict />
                Restrict chat
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => void runAction(selectedViewedUser.id, selectedViewedUser.subscribed ? 'revoke_platinum' : 'grant_platinum')}
              >
                <IconPlatinum />
                {selectedViewedUser.subscribed ? 'Revoke Platinum' : 'Grant Platinum'}
              </button>
              <button
                type="button"
                className="is-danger"
                disabled={actionBusy}
                onClick={() =>
                  setBlockConfirm({
                    userId: selectedViewedUser.id,
                    name: selectedViewedUser.name,
                    action: selectedViewedUser.accountStatus === 'banned' ? 'unban' : 'ban',
                  })
                }
              >
                <IconBlock />
                {selectedViewedUser.accountStatus === 'banned' ? 'Unblock' : 'Block from app'}
              </button>
            </div>
          </article>
        </div>
      )}

      {selectedPlanUser && (
        <div className="admin-plan-modal" role="dialog" aria-modal="true" aria-label="Subscription plan">
          <button type="button" className="admin-plan-modal__backdrop" onClick={() => setSelectedPlanUser(null)} />
          <article className="admin-plan-modal__card">
            <header className="admin-plan-modal__head">
              <div>
                <h4>{selectedPlanUser.name} subscription</h4>
                <p>Current plan: {selectedPlanUser.plan}</p>
              </div>
              <button type="button" onClick={() => setSelectedPlanUser(null)} aria-label="Close">×</button>
            </header>
            {selectedPlanUser.plan === 'Platinum' ? (
              <>
                <section className="admin-plan-modal__plans">
                  {PLATINUM_PLANS.map((plan) => (
                    <article key={plan.id} className={plan.popular ? 'is-popular' : ''}>
                      <strong>{plan.label}</strong>
                      <p>{plan.price} <span>{plan.period}</span></p>
                    </article>
                  ))}
                </section>
                <ul className="admin-plan-modal__features">
                  {PLATINUM_FEATURES.slice(0, 6).map((feature) => (
                    <li key={feature.id}>{feature.title}</li>
                  ))}
                </ul>
              </>
            ) : (
              <section className="admin-plan-modal__free">
                <h5>Free mode</h5>
                <ul>
                  <li>Limited daily likes and standard matching.</li>
                  <li>Upgrade to Platinum for priority visibility.</li>
                </ul>
              </section>
            )}
            <div className="admin-plan-modal__actions">
              <button
                type="button"
                disabled={actionBusy}
                onClick={() =>
                  void runAction(
                    selectedPlanUser.id,
                    selectedPlanUser.subscribed ? 'revoke_platinum' : 'grant_platinum',
                  ).then(() => setSelectedPlanUser(null))
                }
              >
                {selectedPlanUser.subscribed ? 'Revoke Platinum' : 'Grant Platinum'}
              </button>
            </div>
          </article>
        </div>
      )}

      {activityModalUser && (
        <div className="admin-activity-modal" role="dialog" aria-modal="true" aria-label="Posts and meetings">
          <button type="button" className="admin-activity-modal__backdrop" onClick={() => setActivityModalUser(null)} />
          <article className="admin-activity-modal__card">
            <header>
              <h4>{activityModalUser.name} activity</h4>
              <button type="button" onClick={() => setActivityModalUser(null)} aria-label="Close">×</button>
            </header>
            <div className="admin-activity-modal__tabs">
              <button type="button" className={activityTab === 'posts' ? 'is-active' : ''} onClick={() => setActivityTab('posts')}>Posts</button>
              <button type="button" className={activityTab === 'meetings' ? 'is-active' : ''} onClick={() => setActivityTab('meetings')}>Meetings</button>
            </div>
            {activityLoading ? (
              <p>Loading activity…</p>
            ) : activityTab === 'posts' ? (
              <section>
                <div className="admin-activity-modal__posts-grid">
                  {activityModalUser.profilePosts?.length ? (
                    activityModalUser.profilePosts.map((post) => (
                      <article key={post.id} className="admin-activity-modal__post-card">
                        <img src={post.src} alt={post.caption ?? 'Post'} />
                        {post.caption && <p>{post.caption}</p>}
                        <button
                          type="button"
                          className="is-danger"
                          disabled={actionBusy}
                          onClick={() => void runAction(activityModalUser.id, 'hide_post', { postId: post.id })}
                        >
                          Hide post
                        </button>
                      </article>
                    ))
                  ) : (
                    <p>No posts yet.</p>
                  )}
                </div>
              </section>
            ) : (
              <section>
                {meetings.length ? (
                  <ul className="admin-activity-modal__meetings-list">
                    {meetings.map((meeting) => (
                      <li key={meeting.id}>
                        <strong>{meeting.title}</strong>
                        <span>{meeting.startsAtLabel} · {meeting.status}</span>
                        <em>Code: {meeting.accessCode}</em>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No date meetings scheduled.</p>
                )}
              </section>
            )}
          </article>
        </div>
      )}

      {avatarFullView && (
        <div className="admin-avatar-fullview" role="dialog" aria-modal="true" aria-label="Profile photo">
          <button type="button" className="admin-avatar-fullview__backdrop" onClick={() => setAvatarFullView(null)} />
          <figure className="admin-avatar-fullview__frame">
            <button type="button" className="admin-avatar-fullview__close" onClick={() => setAvatarFullView(null)}>×</button>
            <img src={avatarFullView.src} alt={avatarFullView.name} />
            <figcaption>{avatarFullView.name}</figcaption>
          </figure>
        </div>
      )}

      {(editUser || editLoading) && (
        <div className="admin-user-edit-modal" role="dialog" aria-modal="true" aria-label="Edit member">
          <button
            type="button"
            className="admin-user-edit-modal__backdrop"
            onClick={() => !editSaving && !editLoading && setEditUser(null)}
          />
          <article className="admin-user-edit-modal__card admin-user-edit-modal__card--wide">
            <header className="admin-user-edit-modal__head">
              <div>
                <h4>{editUser ? `Edit ${editUser.name}` : 'Loading member…'}</h4>
                <p>{editUser?.email ?? editUser?.handle ?? ''}</p>
              </div>
              <button type="button" onClick={() => setEditUser(null)} aria-label="Close" disabled={editSaving}>
                ×
              </button>
            </header>

            {editLoading ? (
              <p className="admin-customers-card__loading">Loading profile…</p>
            ) : editUser ? (
              <>
                <div className="admin-user-edit-modal__tabs">
                  <button
                    type="button"
                    className={editTab === 'profile' ? 'is-active' : ''}
                    onClick={() => setEditTab('profile')}
                  >
                    Profile & account
                  </button>
                  <button
                    type="button"
                    className={editTab === 'message' ? 'is-active' : ''}
                    onClick={() => setEditTab('message')}
                  >
                    Message user
                  </button>
                </div>

                {editTab === 'profile' ? (
                  <div className="admin-user-edit-modal__form admin-user-edit-modal__form--grid">
                    <label>
                      Display name
                      <input
                        value={editForm.displayName ?? ''}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, displayName: e.target.value }))}
                      />
                    </label>
                    <label>
                      Email
                      <input
                        type="email"
                        value={editForm.email ?? ''}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    </label>
                    <label>
                      Headline
                      <input
                        value={editForm.headline ?? ''}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, headline: e.target.value }))}
                        placeholder="Short tagline on profile"
                      />
                    </label>
                    <label>
                      City
                      <input
                        value={editForm.city ?? ''}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, city: e.target.value }))}
                      />
                    </label>
                    <label>
                      Date of birth
                      <input
                        type="date"
                        value={editForm.dateOfBirth ?? ''}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, dateOfBirth: e.target.value || null }))
                        }
                      />
                    </label>
                    <label>
                      Gender / pronouns
                      <input
                        value={editForm.pronouns ?? ''}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, pronouns: e.target.value }))}
                      />
                    </label>
                    <label>
                      Account status
                      <select
                        value={editForm.accountStatus ?? 'active'}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            accountStatus: e.target.value as AdminUpdateUserInput['accountStatus'],
                          }))
                        }
                      >
                        <option value="active">Active</option>
                        <option value="restricted">Restricted (chat)</option>
                        <option value="banned">Banned</option>
                      </select>
                    </label>
                    <label className="admin-user-edit-modal__full">
                      Bio
                      <textarea
                        rows={3}
                        value={editForm.bio ?? ''}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, bio: e.target.value }))}
                      />
                    </label>
                    <div className="admin-user-edit-modal__toggles admin-user-edit-modal__full">
                      <label>
                        <input
                          type="checkbox"
                          checked={Boolean(editForm.isPremium)}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, isPremium: e.target.checked }))}
                        />
                        Platinum member
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={Boolean(editForm.isVerified)}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, isVerified: e.target.checked }))}
                        />
                        Verified badge
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={editForm.showOnDiscover !== false}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, showOnDiscover: e.target.checked }))}
                        />
                        Show on Discover
                      </label>
                    </div>
                    <div className="admin-user-edit-modal__meta admin-user-edit-modal__full">
                      <span>Matches: {editUser.matches}</span>
                      <span>Likes: {editUser.likes}</span>
                      <span>Last seen: {editUser.lastSeen}</span>
                      <span>Plan: {editUser.plan}</span>
                    </div>
                    <div className="admin-user-edit-modal__tools admin-user-edit-modal__full">
                      <button
                        type="button"
                        className="admin-user-edit-modal__secondary-btn"
                        disabled={resetPasswordBusy || editSaving}
                        onClick={() => void sendResetPassword()}
                      >
                        {resetPasswordBusy ? 'Sending…' : 'Send password reset email'}
                      </button>
                      <p className="admin-user-edit-modal__hint">
                        Member receives a reset link at {editForm.email || editUser.email}.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="admin-user-edit-modal__message-panel">
                    <p>
                      Send a direct message from <strong>Lavey Admin</strong> with the verified badge in their
                      Messages inbox.
                    </p>
                    <label>
                      Message
                      <textarea
                        rows={5}
                        value={adminMessage}
                        onChange={(e) => setAdminMessage(e.target.value)}
                        placeholder="Write your message to this member…"
                      />
                    </label>
                    <button
                      type="button"
                      className="admin-dash-v2__primary-btn"
                      disabled={messageSending || !adminMessage.trim()}
                      onClick={() => void sendAdminMessage()}
                    >
                      {messageSending ? 'Sending…' : 'Send to Lavey Admin inbox'}
                    </button>
                  </div>
                )}

                {editTab === 'profile' && (
                  <div className="admin-user-edit-modal__actions">
                    <button type="button" onClick={() => setEditUser(null)} disabled={editSaving}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="admin-dash-v2__primary-btn"
                      disabled={editSaving}
                      onClick={() => void saveEdit()}
                    >
                      {editSaving ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                )}
              </>
            ) : null}
          </article>
        </div>
      )}

      {blockConfirm && (
        <div className="admin-user-delete-modal admin-user-delete-modal--confirm" role="dialog" aria-modal="true" aria-label="Confirm block">
          <button
            type="button"
            className="admin-user-delete-modal__backdrop"
            onClick={() => !actionBusy && setBlockConfirm(null)}
          />
          <article className="admin-user-delete-modal__card">
            <header>
              <h4>
                {blockConfirm.action === 'ban' ? `Block ${blockConfirm.name} from the app?` : `Restore ${blockConfirm.name}'s access?`}
              </h4>
              <p>
                {blockConfirm.action === 'ban'
                  ? 'They will be signed out on their next request and cannot sign in again until you unblock them. Use this when someone violates community rules.'
                  : 'They will be able to sign in and use Lavey normally again.'}
              </p>
            </header>
            <div className="admin-user-delete-modal__actions">
              <button type="button" onClick={() => setBlockConfirm(null)} disabled={actionBusy}>
                Cancel
              </button>
              <button
                type="button"
                className="admin-users-table__icon-btn--delete-text"
                disabled={actionBusy}
                onClick={() => void confirmBlockAccess()}
              >
                {actionBusy
                  ? 'Updating…'
                  : blockConfirm.action === 'ban'
                    ? 'Block from app'
                    : 'Restore access'}
              </button>
            </div>
          </article>
        </div>
      )}

      {deleteConfirmUser && (
        <div className="admin-user-delete-modal admin-user-delete-modal--confirm" role="dialog" aria-modal="true" aria-label="Confirm delete">
          <button
            type="button"
            className="admin-user-delete-modal__backdrop"
            onClick={() => !deleteBusy && setDeleteConfirmUser(null)}
          />
          <article className="admin-user-delete-modal__card">
            <header>
              <h4>Delete {deleteConfirmUser.name}?</h4>
              <p>
                This permanently removes the account, profile posts, avatar, storage files, and all related database
                records. This cannot be undone.
              </p>
            </header>
            <div className="admin-user-delete-modal__actions">
              <button type="button" onClick={() => setDeleteConfirmUser(null)} disabled={deleteBusy}>
                Cancel
              </button>
              <button
                type="button"
                className="admin-users-table__icon-btn--delete-text"
                disabled={deleteBusy}
                onClick={() => void confirmDelete()}
              >
                {deleteBusy ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </article>
        </div>
      )}

      {resultModal && (
        <div
          className={`admin-user-result-modal admin-user-result-modal--${resultModal.tone}`}
          role="dialog"
          aria-modal="true"
          aria-label={resultModal.title}
        >
          <button type="button" className="admin-user-result-modal__backdrop" onClick={() => setResultModal(null)} />
          <article className="admin-user-result-modal__card">
            <header>
              <h4>{resultModal.title}</h4>
              <p>{resultModal.message}</p>
            </header>
            <div className="admin-user-result-modal__actions">
              <button type="button" className="admin-dash-v2__primary-btn" onClick={() => setResultModal(null)}>
                OK
              </button>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
