import { useCallback, useEffect, useState } from 'react';
import {
  adminVerificationService,
  type VerificationQueueItem,
} from '@/services/admin/adminVerificationService';
import './AdminVerificationQueue.css';

const POLL_MS = 15_000;

function aiOutcomeLabel(item: VerificationQueueItem): string {
  if (item.aiOutcome === 'not_configured') return 'AI check not configured — human review needed';
  if (item.aiOutcome === 'match') return `AI: likely match (${item.aiConfidence ?? '—'}%)`;
  if (item.aiOutcome === 'no_match') return `AI: likely no match (${item.aiConfidence ?? '—'}%)`;
  return 'AI: check failed — human review needed';
}

export function AdminVerificationQueue() {
  const [items, setItems] = useState<VerificationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<VerificationQueueItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await adminVerificationService.listQueue();
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load verification requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const intervalId = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(intervalId);
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const timeoutId = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  const approve = async (item: VerificationQueueItem) => {
    setBusyId(item.id);
    try {
      await adminVerificationService.approve(item.id);
      setItems((prev) => prev.filter((row) => row.id !== item.id));
      setNotice(`Approved — ${item.userName} is now verified and notified`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not approve this request');
    } finally {
      setBusyId(null);
    }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    const target = rejectTarget;
    setBusyId(target.id);
    try {
      await adminVerificationService.reject(target.id, rejectReason.trim() || undefined);
      setItems((prev) => prev.filter((row) => row.id !== target.id));
      setNotice(`Rejected — ${target.userName} has been notified`);
      setRejectTarget(null);
      setRejectReason('');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not reject this request');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="admin-verification">
      <header className="admin-verification__head">
        <div>
          <h3>Verification requests</h3>
          <p>
            Compare each member&apos;s reference photo with their live selfie. AI face-match isn&apos;t
            configured yet, so every submission waits here for a human decision.
          </p>
        </div>
        <span className="admin-verification__count">{items.length} pending</span>
      </header>

      {notice ? <p className="admin-verification__notice">{notice}</p> : null}
      {error ? <p className="admin-verification__error">{error}</p> : null}

      {loading ? (
        <p className="admin-verification__empty">Loading…</p>
      ) : items.length === 0 ? (
        <p className="admin-verification__empty">No verification requests waiting for review.</p>
      ) : (
        <div className="admin-verification__grid">
          {items.map((item) => (
            <article key={item.id} className="admin-verification__card">
              <div className="admin-verification__card-head">
                {item.userAvatar ? (
                  <img src={item.userAvatar} alt="" className="admin-verification__avatar" />
                ) : (
                  <span className="admin-verification__avatar admin-verification__avatar--fallback">
                    {item.userName.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div>
                  <p className="admin-verification__name">{item.userName}</p>
                  <p className="admin-verification__age">{item.ageLabel}</p>
                </div>
              </div>

              <div className="admin-verification__photos">
                <button
                  type="button"
                  className="admin-verification__photo-btn"
                  disabled={!item.referencePhotoUrl}
                  onClick={() => item.referencePhotoUrl && setPreviewUrl(item.referencePhotoUrl)}
                >
                  {item.referencePhotoUrl ? (
                    <img src={item.referencePhotoUrl} alt="Reference" />
                  ) : (
                    <span className="admin-verification__photo-missing">No photo</span>
                  )}
                  <span className="admin-verification__photo-label">Reference</span>
                </button>
                <button
                  type="button"
                  className="admin-verification__photo-btn"
                  disabled={!item.livePhotoUrl}
                  onClick={() => item.livePhotoUrl && setPreviewUrl(item.livePhotoUrl)}
                >
                  {item.livePhotoUrl ? (
                    <img src={item.livePhotoUrl} alt="Live selfie" />
                  ) : (
                    <span className="admin-verification__photo-missing">No photo</span>
                  )}
                  <span className="admin-verification__photo-label">Live selfie</span>
                </button>
              </div>

              <p className="admin-verification__ai">{aiOutcomeLabel(item)}</p>

              <div className="admin-verification__actions">
                <button
                  type="button"
                  className="admin-verification__btn admin-verification__btn--approve"
                  disabled={busyId === item.id}
                  onClick={() => void approve(item)}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="admin-verification__btn admin-verification__btn--reject"
                  disabled={busyId === item.id}
                  onClick={() => {
                    setRejectTarget(item);
                    setRejectReason('');
                  }}
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {previewUrl ? (
        <div className="admin-verification__lightbox" onClick={() => setPreviewUrl(null)}>
          <img src={previewUrl} alt="" onClick={(e) => e.stopPropagation()} />
        </div>
      ) : null}

      {rejectTarget ? (
        <div className="admin-verification__modal-back" onClick={() => setRejectTarget(null)}>
          <div className="admin-verification__modal" onClick={(e) => e.stopPropagation()}>
            <h4>Reject {rejectTarget.userName}&apos;s verification</h4>
            <p>They&apos;ll get a notification with this reason so they can try again.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Optional — e.g. Photos didn't clearly match. Please retake in good lighting."
              maxLength={300}
              rows={3}
            />
            <div className="admin-verification__modal-actions">
              <button type="button" onClick={() => setRejectTarget(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="admin-verification__btn admin-verification__btn--reject"
                disabled={busyId === rejectTarget.id}
                onClick={() => void confirmReject()}
              >
                Reject request
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
