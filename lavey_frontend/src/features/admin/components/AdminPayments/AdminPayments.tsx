import { useCallback, useEffect, useState } from 'react';
import {
  adminPaymentsService,
  type AdminPaymentPurchaseKind,
  type AdminPaymentRow,
  type AdminPaymentStatus,
} from '@/services/admin/adminPaymentsService';
import { AdminConfirmDialog, AdminHeartLoader, AdminNotificationModal } from '../AdminFeedback';
import './AdminPayments.css';

function formatZar(amount: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

export function AdminPayments() {
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);
  const [totalCompletedZar, setTotalCompletedZar] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AdminPaymentStatus | 'all'>('all');
  const [purchaseKind, setPurchaseKind] = useState<AdminPaymentPurchaseKind | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelTarget, setCancelTarget] = useState<AdminPaymentRow | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await adminPaymentsService.list({
        page,
        limit: 20,
        status,
        purchaseKind,
        search: search.trim() || undefined,
      });
      setPayments(result.payments);
      setTotalCompletedZar(result.totals.totalCompletedZar);
      setTotalPages(result.pagination.totalPages);
      setTotal(result.pagination.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load payments.');
    } finally {
      setLoading(false);
    }
  }, [page, status, purchaseKind, search]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); }, [status, purchaseKind, search]);

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelBusy(true);
    try {
      const result = await adminPaymentsService.cancelSubscription(cancelTarget.userId);
      setNotice({
        tone: 'success',
        message: result.emailSent
          ? `${cancelTarget.displayName}'s subscription was cancelled and a confirmation email was sent.`
          : `${cancelTarget.displayName}'s subscription was cancelled.`,
      });
      setCancelTarget(null);
      await load();
    } catch (e) {
      setNotice({ tone: 'error', message: e instanceof Error ? e.message : 'Could not cancel the subscription.' });
    } finally {
      setCancelBusy(false);
    }
  };

  return (
    <section className="admin-payments">
      <header className="admin-payments__head">
        <div>
          <h3>PayFast payments</h3>
          <p>Every completed, pending, cancelled, and failed PayFast checkout across Platinum and chat credits.</p>
        </div>
        <div className="admin-payments__kpi">
          <span>All-time revenue</span>
          <strong>{formatZar(totalCompletedZar)}</strong>
        </div>
      </header>

      <div className="admin-payments__toolbar">
        <input
          type="text"
          placeholder="Search member name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value as AdminPaymentStatus | 'all')}>
          <option value="all">All statuses</option>
          <option value="complete">Complete</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
          <option value="failed">Failed</option>
        </select>
        <select value={purchaseKind} onChange={(e) => setPurchaseKind(e.target.value as AdminPaymentPurchaseKind | 'all')}>
          <option value="all">Platinum &amp; chat credits</option>
          <option value="platinum">Platinum only</option>
          <option value="chat_credits">Chat credits only</option>
        </select>
      </div>

      {error && <p className="admin-payments__error">{error}</p>}

      <div className="admin-payments__table-wrap">
        <table className="admin-payments__table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Plan</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Recurring</th>
              <th>Paid on</th>
              <th>Reference</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && payments.map((row) => {
              const canCancel = row.purchaseKind === 'platinum' && row.status === 'complete' && !row.cancelAtPeriodEnd;
              return (
                <tr key={row.id}>
                  <td>
                    <strong>{row.displayName}</strong>
                    <br />
                    <span className="admin-payments__muted">{row.email}</span>
                  </td>
                  <td>
                    <span className={`admin-payments__badge admin-payments__badge--${row.purchaseKind}`}>
                      {row.planLabel}
                    </span>
                  </td>
                  <td>{formatZar(row.amountZar)}</td>
                  <td>
                    <span className={`admin-payments__status admin-payments__status--${row.status}`}>{row.status}</span>
                    {row.cancelAtPeriodEnd ? <span className="admin-payments__muted"> · ending</span> : null}
                  </td>
                  <td>{row.isRecurring ? 'Yes' : 'No'}</td>
                  <td>{formatDate(row.completedAt ?? row.createdAt)}</td>
                  <td className="admin-payments__muted">{row.pfPaymentId ?? '—'}</td>
                  <td>
                    {canCancel ? (
                      <button type="button" className="admin-payments__cancel-btn" onClick={() => setCancelTarget(row)}>
                        Cancel subscription
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {!loading && payments.length === 0 ? (
              <tr>
                <td colSpan={8} className="admin-payments__empty">No payments match these filters.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {loading ? <AdminHeartLoader label="Loading payments" overlay /> : null}

      <div className="admin-payments__pagination">
        <span>{total} payment{total === 1 ? '' : 's'}</span>
        <div>
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
        </div>
      </div>

      <AdminConfirmDialog
        open={Boolean(cancelTarget)}
        title={`Cancel ${cancelTarget?.displayName ?? 'this member'}'s Platinum subscription?`}
        message="This calls PayFast's live API to stop future billing immediately. The member keeps Platinum until their current period ends. This cannot be undone from here."
        confirmLabel="Cancel subscription"
        tone="danger"
        busy={cancelBusy}
        onConfirm={() => void confirmCancel()}
        onCancel={() => setCancelTarget(null)}
      />

      <AdminNotificationModal
        open={Boolean(notice)}
        tone={notice?.tone ?? 'success'}
        message={notice?.message ?? ''}
        onClose={() => setNotice(null)}
      />
    </section>
  );
}
