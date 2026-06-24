import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APP_IMAGES } from '@/constants/images';
import {
  adminModerationService,
  type MemberReportItem,
  type ModerationPolicy,
  type ModerationQueueItem,
  type ModerationStats,
  type QueueAction,
  type ReportAction,
  type ModerationContentType,
} from '@/services/admin/adminModerationService';

const POLL_MS = 15_000;

const CONTENT_TYPE_LABELS: Record<ModerationContentType, string> = {
  profile_photo: 'Profile photo',
  post: 'Post',
  bio: 'Bio',
  chat_message: 'Chat message',
  meetup: 'Date meeting',
};

function formatAiScore(item: Pick<ModerationQueueItem, 'aiScore' | 'aiSource'>): string {
  if (item.aiScore !== null && item.aiScore !== undefined) return String(item.aiScore);
  if (item.aiSource === 'fallback') return 'Unavailable';
  if (item.aiSource === 'pending') return 'Pending';
  return '—';
}

function isAiScanned(item: Pick<ModerationQueueItem, 'aiScore' | 'aiSource'>): boolean {
  return item.aiSource === 'huggingface' && item.aiScore !== null;
}

function isAiPassed(
  item: Pick<ModerationQueueItem, 'aiScore' | 'aiSource'>,
  policy: ModerationPolicy | null,
): boolean {
  if (!policy || !isAiScanned(item) || item.aiScore === null) return false;
  return item.aiScore >= policy.autoApproveMinScore;
}

function sortQueueStable(items: ModerationQueueItem[]): ModerationQueueItem[] {
  return [...items].sort((a, b) => {
    const byTime = a.createdAt.localeCompare(b.createdAt);
    if (byTime !== 0) return byTime;
    return a.id.localeCompare(b.id);
  });
}

function isAwaitingAiScan(item: Pick<ModerationQueueItem, 'aiSource'>): boolean {
  return item.aiSource === 'pending' || item.aiSource === 'fallback';
}

function isImageContent(type: ModerationContentType): boolean {
  return type === 'profile_photo' || type === 'post';
}

function displayFlags(item: ModerationQueueItem): string[] {
  const hidden = new Set(['ai_unavailable', 'download_failed', 'parse_failed', 'pending', 'none']);
  const fromAi = item.aiFlags.filter((flag) => !hidden.has(flag));
  return [...fromAi, item.queueTier === 'human' ? 'human review' : 'needs review'];
}

function clampPolicyScores(policy: ModerationPolicy): ModerationPolicy {
  const humanReviewMaxScore = Math.max(0, Math.min(100, policy.humanReviewMaxScore));
  const autoApproveMinScore = Math.max(humanReviewMaxScore, Math.min(100, policy.autoApproveMinScore));
  return { ...policy, humanReviewMaxScore, autoApproveMinScore };
}

const QUEUE_ACTION_NOTICES: Record<QueueAction, string> = {
  approve: 'Approved — item cleared from queue (content stays live on Lavey)',
  remove: 'Removed — content hidden and item cleared from queue',
  warn: 'Warning sent to member inbox and item cleared from queue',
  hide_discover: 'Member hidden from Discover and item cleared from queue',
  escalate: 'Escalated — item stays in queue for senior review',
};

function IconMore() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
  );
}

function IconWarn() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 4.5 2.7 18a2 2 0 001.7 3h15.2a2 2 0 001.7-3L13.7 4.5a2 2 0 00-3.4 0z" />
    </svg>
  );
}

function IconHideDiscover() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6A3 3 0 0012 15a3 3 0 002.4-4.4" />
      <path d="M6.7 6.7C4.6 8.1 3 10 2 12s4 7 10 7c1.8 0 3.4-.4 4.8-1.1" />
      <path d="M9.9 5.1A10.8 10.8 0 0112 5c6 0 10 7 10 7a17.7 17.7 0 01-3.1 3.8" />
    </svg>
  );
}

function IconEscalate() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 19V5" />
      <path d="M7 10l5-5 5 5" />
      <path d="M5 19h14" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <path d="M5 12l5 5L19 7" />
    </svg>
  );
}

interface QueueMoreMenuProps {
  open: boolean;
  busy: boolean;
  onToggle: () => void;
  onAction: (action: QueueAction) => void;
}

function QueueMoreMenu({ open, busy, onToggle, onAction }: QueueMoreMenuProps) {
  return (
    <div className="admin-content-moderation__menu-wrap" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={`admin-content-moderation__menu-btn${open ? ' is-open' : ''}`}
        disabled={busy}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        <IconMore />
        More
      </button>
      {open && (
        <div
          className="admin-content-moderation__menu"
          role="menu"
          aria-label="More moderation actions"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="admin-content-moderation__menu-head">More actions</p>
          <button
            type="button"
            className="admin-content-moderation__menu-item admin-content-moderation__menu-item--warn"
            role="menuitem"
            disabled={busy}
            onClick={() => onAction('warn')}
          >
            <span className="admin-content-moderation__menu-icon" aria-hidden>
              <IconWarn />
            </span>
            <span className="admin-content-moderation__menu-copy">
              <strong>Warn user</strong>
              <em>Record a policy warning</em>
            </span>
          </button>
          <button
            type="button"
            className="admin-content-moderation__menu-item admin-content-moderation__menu-item--hide"
            role="menuitem"
            disabled={busy}
            onClick={() => onAction('hide_discover')}
          >
            <span className="admin-content-moderation__menu-icon" aria-hidden>
              <IconHideDiscover />
            </span>
            <span className="admin-content-moderation__menu-copy">
              <strong>Hide from Discover</strong>
              <em>Remove from swipe feed</em>
            </span>
          </button>
          <button
            type="button"
            className="admin-content-moderation__menu-item admin-content-moderation__menu-item--escalate"
            role="menuitem"
            disabled={busy}
            onClick={() => onAction('escalate')}
          >
            <span className="admin-content-moderation__menu-icon" aria-hidden>
              <IconEscalate />
            </span>
            <span className="admin-content-moderation__menu-copy">
              <strong>Escalate</strong>
              <em>Flag for senior review</em>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

export function AdminContentModeration() {
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [queue, setQueue] = useState<ModerationQueueItem[]>([]);
  const [reports, setReports] = useState<MemberReportItem[]>([]);
  const [policy, setPolicy] = useState<ModerationPolicy | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [noticeIsError, setNoticeIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const [busyQueueId, setBusyQueueId] = useState<string | null>(null);
  const [busyReportId, setBusyReportId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<ModerationQueueItem | null>(null);
  const [guideOpen, setGuideOpen] = useState(true);
  const rescanOrderRef = useRef<string[]>([]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 8000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!previewItem) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewItem(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewItem]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    void adminModerationService
      .getPolicy()
      .then(setPolicy)
      .catch(() => undefined);
  }, []);

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [nextStats, nextQueue, nextReports] = await Promise.all([
        adminModerationService.getStats(),
        adminModerationService.listQueue(debouncedSearch || undefined),
        adminModerationService.listReports(debouncedSearch || undefined),
      ]);
      setStats(nextStats);
      setQueue(nextQueue);
      setReports(nextReports);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load moderation data.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadAll(true);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadAll]);

  useEffect(() => {
    if (!activeMenuId) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.admin-content-moderation__menu-wrap')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [activeMenuId]);

  const handleQueueAction = async (item: ModerationQueueItem, action: QueueAction) => {
    setBusyQueueId(item.id);
    setActiveMenuId(null);
    try {
      await adminModerationService.queueAction(item.id, action);
      setNoticeIsError(false);
      setNotice(`${QUEUE_ACTION_NOTICES[action]} · ${item.userHandle}`);
      if (previewItem?.id === item.id && action !== 'escalate') setPreviewItem(null);
      await loadAll(true);
    } catch (err) {
      setNoticeIsError(true);
      setNotice(err instanceof Error ? err.message : 'Queue action failed.');
    } finally {
      setBusyQueueId(null);
    }
  };

  const handleReportAction = async (item: MemberReportItem, action: ReportAction) => {
    setBusyReportId(item.id);
    try {
      await adminModerationService.reportAction(item.id, action);
      setNotice(`${action.replace('_', ' ')} applied for ${item.subjectHandle}`);
      await loadAll(true);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Report action failed.');
    } finally {
      setBusyReportId(null);
    }
  };

  const handleSavePolicy = async () => {
    if (!policy) return;
    setSavingPolicy(true);
    try {
      const saved = await adminModerationService.savePolicy(policy);
      setPolicy(saved);
      setNotice('Moderation policy saved for Discover and profile review.');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not save policy.');
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleRescan = async () => {
    setRescanning(true);
    setNoticeIsError(false);
    rescanOrderRef.current = sortQueueStable(queue).map((item) => item.id);
    const pollId = window.setInterval(() => {
      void loadAll(true);
    }, 2000);
    try {
      const scanned = await adminModerationService.rescanQueue(24);
      await loadAll(true);
      setNotice(
        scanned > 0
          ? `AI scanned ${scanned} item${scanned === 1 ? '' : 's'} — green tick = AI approved (still in queue until you click Approve).`
          : 'No pending items needed a re-scan.',
      );
    } catch (err) {
      setNoticeIsError(true);
      setNotice(err instanceof Error ? err.message : 'AI rescan failed.');
    } finally {
      window.clearInterval(pollId);
      setRescanning(false);
      rescanOrderRef.current = [];
    }
  };

  const displayQueue = useMemo(() => {
    const sorted = sortQueueStable(queue);
    if (!rescanning || rescanOrderRef.current.length === 0) return sorted;

    const byId = new Map(sorted.map((item) => [item.id, item]));
    return rescanOrderRef.current
      .map((id) => byId.get(id))
      .filter((item): item is ModerationQueueItem => Boolean(item));
  }, [queue, rescanning]);

  return (
    <section className="admin-content-moderation">
      <header className="admin-content-moderation__head">
        <div>
          <h3>Content Control</h3>
          <p>
            Review queues, member reports, and enforcement for a safe dating experience. AI pre-screening uses
            Hugging Face vision and text models on new uploads.
          </p>
        </div>
        <button type="button" onClick={() => void handleSavePolicy()} disabled={!policy || savingPolicy}>
          {savingPolicy ? 'Saving…' : 'Save Moderation Policy'}
        </button>
      </header>

      {error && <p className="admin-content-moderation__notice admin-content-moderation__notice--error">{error}</p>}
      {notice && (
        <p
          className={`admin-content-moderation__notice admin-content-moderation__notice--toast${
            noticeIsError ? ' admin-content-moderation__notice--error' : ''
          }`}
          role="status"
        >
          {notice}
        </p>
      )}

      <div className={`admin-content-moderation__guide${guideOpen ? ' is-open' : ''}`}>
        <button
          type="button"
          className="admin-content-moderation__guide-toggle"
          aria-expanded={guideOpen}
          onClick={() => setGuideOpen((open) => !open)}
        >
          <strong>How Content Control works</strong>
          <span>{guideOpen ? 'Hide' : 'Show'}</span>
        </button>
        {guideOpen && (
          <div className="admin-content-moderation__guide-body">
            <p>
              When members upload a photo or post, it goes <em>live immediately</em> and also lands in this
              review queue if AI could not auto-approve it.
            </p>
            <ul>
              <li>
                <strong>Approve</strong> — content is fine; remove from queue.
              </li>
              <li>
                <strong>Remove</strong> — hide the photo/post (or clear avatar) and remove from queue.
              </li>
              <li>
                <strong>Warn user</strong> — send an official inbox message, then clear from queue.
              </li>
              <li>
                <strong>Hide from Discover</strong> — member won&apos;t appear in swipe feed; clears from queue.
              </li>
              <li>
                <strong>Escalate</strong> — flag for senior review; item <em>stays</em> in the queue.
              </li>
            </ul>
            <p className="admin-content-moderation__guide-tip">
              <strong>Re-scan with AI</strong> scores each card in place — items stay in the queue. A green tick
              means AI approved (score at or above your auto-approve threshold). Click <strong>Approve</strong> to
              clear the item. <strong>Unavailable</strong> means Hugging Face could not score it — try again or
              review manually.
            </p>
          </div>
        )}
      </div>

      <div className="admin-content-moderation__stats">
        <article>
          <p>AI pre-screen queue</p>
          <strong>{loading && !stats ? '…' : (stats?.aiPrescreen ?? 0)}</strong>
        </article>
        <article>
          <p>Human review queue</p>
          <strong>{loading && !stats ? '…' : (stats?.humanReview ?? 0)}</strong>
        </article>
        <article>
          <p>User reports</p>
          <strong>{loading && !stats ? '…' : (stats?.userReports ?? 0)}</strong>
        </article>
        <article>
          <p>Appeals waiting</p>
          <strong>{loading && !stats ? '…' : (stats?.appealsWaiting ?? 0)}</strong>
        </article>
        <article>
          <p>Suspected fake profiles</p>
          <strong>{loading && !stats ? '…' : (stats?.suspectedFakeProfiles ?? 0)}</strong>
        </article>
      </div>

      <div className="admin-content-moderation__toolbar">
        <input
          type="text"
          placeholder="Search user, handle, report reason..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="admin-content-moderation__grid">
        <article className="admin-content-moderation__card admin-content-moderation__card--queue">
          <h4>Review Queue</h4>
          <div className="admin-content-moderation__queue-grid">
            {displayQueue.map((item) => {
              const thumb = item.mediaUrl ?? APP_IMAGES.logo;
              const flags = displayFlags(item);
              const busy = busyQueueId === item.id;
              const canPreview = isImageContent(item.contentType) && Boolean(item.mediaUrl);
              const aiScanned = isAiScanned(item);
              const aiPassed = isAiPassed(item, policy);
              const scanning = rescanning && isAwaitingAiScan(item);

              return (
                <div
                  key={item.id}
                  className={`admin-content-moderation__queue-card${
                    activeMenuId === item.id ? ' is-menu-open' : ''
                  }${aiPassed ? ' is-ai-passed' : aiScanned ? ' is-ai-scanned' : ''}${
                    scanning ? ' is-scanning' : ''
                  }`}
                >
                  {aiPassed && (
                    <span className="admin-content-moderation__scan-tick" title="AI approved — click Approve to clear">
                      <IconCheck />
                    </span>
                  )}
                  {aiScanned && !aiPassed && (
                    <span
                      className="admin-content-moderation__scan-tick admin-content-moderation__scan-tick--scored"
                      title="AI scored — needs human review"
                    >
                      <IconCheck />
                    </span>
                  )}
                  {scanning && (
                    <span className="admin-content-moderation__scan-spinner" aria-hidden />
                  )}
                  <button
                    type="button"
                    className="admin-content-moderation__thumb"
                    disabled={!canPreview}
                    aria-label={canPreview ? `View full ${CONTENT_TYPE_LABELS[item.contentType]}` : undefined}
                    onClick={() => canPreview && setPreviewItem(item)}
                  >
                    <img
                      src={thumb}
                      alt=""
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = APP_IMAGES.logo;
                      }}
                    />
                    <span>{CONTENT_TYPE_LABELS[item.contentType]}</span>
                  </button>
                  <div className="admin-content-moderation__queue-body">
                    <button
                      type="button"
                      className="admin-content-moderation__queue-open"
                      disabled={!canPreview}
                      onClick={() => canPreview && setPreviewItem(item)}
                    >
                      <strong>
                        {item.userName} · {item.userHandle}
                      </strong>
                      <p>{item.previewText}</p>
                    </button>
                    <div className="admin-content-moderation__flags">
                      {flags.map((flag) => (
                        <span key={flag}>{flag}</span>
                      ))}
                      <span
                        className={`admin-content-moderation__score${
                          aiPassed
                            ? ' admin-content-moderation__score--passed'
                            : aiScanned
                              ? ' admin-content-moderation__score--scanned'
                              : ''
                        }`}
                      >
                        AI score {formatAiScore(item)}
                        {aiPassed ? ' · approved' : ''}
                      </span>
                    </div>
                    <div className="admin-content-moderation__queue-actions">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleQueueAction(item, 'approve')}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="is-danger"
                        disabled={busy}
                        onClick={() => void handleQueueAction(item, 'remove')}
                      >
                        Remove
                      </button>
                      <QueueMoreMenu
                        open={activeMenuId === item.id}
                        busy={busy}
                        onToggle={() => setActiveMenuId((prev) => (prev === item.id ? null : item.id))}
                        onAction={(action) => void handleQueueAction(item, action)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {!loading && !queue.length && (
              <p className="admin-content-moderation__empty">
                {debouncedSearch ? 'No items match your search.' : 'Review queue is empty.'}
              </p>
            )}
          </div>
        </article>

        <article className="admin-content-moderation__card">
          <h4>Reported by Members</h4>
          <ul className="admin-content-moderation__report-list">
            {reports.map((item) => {
              const busy = busyReportId === item.id;
              return (
                <li
                  key={item.id}
                  className={`admin-content-moderation__report admin-content-moderation__report--${item.severity}`}
                >
                  <div>
                    <strong>
                      {CONTENT_TYPE_LABELS[item.contentType]} · {item.subjectHandle}
                    </strong>
                    <span>{item.reason}</span>
                  </div>
                  <div className="admin-content-moderation__report-meta">
                    <span
                      className={`admin-content-moderation__severity admin-content-moderation__severity--${item.severity}`}
                    >
                      {item.severity}
                    </span>
                    <span>
                      {item.reportCount} report{item.reportCount === 1 ? '' : 's'}
                    </span>
                    <span>{item.ageLabel}</span>
                  </div>
                  <div className="admin-content-moderation__report-actions">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleReportAction(item, 'restrict_chat')}
                    >
                      Restrict chat
                    </button>
                    <button
                      type="button"
                      className="is-danger"
                      disabled={busy}
                      onClick={() => void handleReportAction(item, 'ban')}
                    >
                      Ban account
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleReportAction(item, 'escalate')}
                    >
                      Escalate
                    </button>
                  </div>
                </li>
              );
            })}
            {!loading && !reports.length && (
              <li className="admin-content-moderation__empty">
                {debouncedSearch ? 'No reports match your search.' : 'No open member reports.'}
              </li>
            )}
          </ul>
        </article>

        <article className="admin-content-moderation__card admin-content-moderation__card--policy">
          <header className="admin-content-moderation__policy-head">
            <div>
              <h4>Moderation Policy</h4>
              <p>Choose how Hugging Face AI scores uploads before they appear in Discover.</p>
            </div>
          </header>

          {policy ? (
            <div className="admin-content-moderation__policy-body">
              <div className="admin-content-moderation__policy-flow" aria-hidden="true">
                <div className="admin-content-moderation__policy-flow-labels">
                  <span>0</span>
                  <span>100 · safety score</span>
                </div>
                <div className="admin-content-moderation__policy-flow-track">
                  <div
                    className="admin-content-moderation__policy-flow-segment admin-content-moderation__policy-flow-segment--human"
                    style={{ width: `${policy.humanReviewMaxScore}%` }}
                  />
                  <div
                    className="admin-content-moderation__policy-flow-segment admin-content-moderation__policy-flow-segment--ai"
                    style={{ width: `${Math.max(0, policy.autoApproveMinScore - policy.humanReviewMaxScore)}%` }}
                  />
                  <div
                    className="admin-content-moderation__policy-flow-segment admin-content-moderation__policy-flow-segment--auto"
                    style={{ width: `${Math.max(0, 100 - policy.autoApproveMinScore)}%` }}
                  />
                </div>
                <ul className="admin-content-moderation__policy-flow-legend">
                  <li>
                    <i className="is-human" />
                    <span>
                      <strong>Human review</strong>
                      <em>Score ≤ {policy.humanReviewMaxScore}</em>
                    </span>
                  </li>
                  <li>
                    <i className="is-ai" />
                    <span>
                      <strong>AI pre-screen</strong>
                      <em>
                        {policy.autoApproveMinScore > policy.humanReviewMaxScore + 1
                          ? `${policy.humanReviewMaxScore + 1}–${policy.autoApproveMinScore - 1}`
                          : 'No middle band'}
                      </em>
                    </span>
                  </li>
                  <li>
                    <i className="is-auto" />
                    <span>
                      <strong>Auto-approve</strong>
                      <em>Score ≥ {policy.autoApproveMinScore}</em>
                    </span>
                  </li>
                </ul>
              </div>

              <div className="admin-content-moderation__policy-sliders">
                <div className="admin-content-moderation__policy-slider">
                  <div className="admin-content-moderation__policy-slider-top">
                    <div>
                      <strong>Auto-approve threshold</strong>
                      <p>Safe uploads at or above this score go live without a human.</p>
                    </div>
                    <span className="admin-content-moderation__policy-score is-auto">{policy.autoApproveMinScore}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={policy.autoApproveMinScore}
                    className="admin-content-moderation__policy-range is-auto"
                    aria-label="Auto-approve minimum safety score"
                    onChange={(e) => {
                      const autoApproveMinScore = Number(e.target.value);
                      setPolicy((prev) =>
                        prev
                          ? clampPolicyScores({
                              ...prev,
                              autoApproveMinScore,
                              humanReviewMaxScore: Math.min(prev.humanReviewMaxScore, autoApproveMinScore),
                            })
                          : prev,
                      );
                    }}
                  />
                  <div className="admin-content-moderation__policy-range-labels">
                    <span>Strict (0)</span>
                    <span>Lenient (100)</span>
                  </div>
                </div>

                <div className="admin-content-moderation__policy-slider">
                  <div className="admin-content-moderation__policy-slider-top">
                    <div>
                      <strong>Human review cutoff</strong>
                      <p>Scores at or below this always need a moderator before going live.</p>
                    </div>
                    <span className="admin-content-moderation__policy-score is-human">{policy.humanReviewMaxScore}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={policy.humanReviewMaxScore}
                    className="admin-content-moderation__policy-range is-human"
                    aria-label="Human review maximum safety score"
                    onChange={(e) => {
                      const humanReviewMaxScore = Number(e.target.value);
                      setPolicy((prev) =>
                        prev
                          ? clampPolicyScores({
                              ...prev,
                              humanReviewMaxScore,
                              autoApproveMinScore: Math.max(prev.autoApproveMinScore, humanReviewMaxScore),
                            })
                          : prev,
                      );
                    }}
                  />
                  <div className="admin-content-moderation__policy-range-labels">
                    <span>More manual review</span>
                    <span>Less manual review</span>
                  </div>
                </div>
              </div>

              <div className="admin-content-moderation__policy-toggles">
                <h5>Always flag</h5>
                <label className="admin-content-moderation__policy-toggle">
                  <input
                    type="checkbox"
                    checked={policy.flagExplicit}
                    onChange={(e) =>
                      setPolicy((prev) => (prev ? { ...prev, flagExplicit: e.target.checked } : prev))
                    }
                  />
                  <span className="admin-content-moderation__policy-toggle-ui" aria-hidden="true" />
                  <span className="admin-content-moderation__policy-toggle-copy">
                    <strong>Explicit profile photos</strong>
                    <em>Send flagged images straight to human review.</em>
                  </span>
                </label>
                <label className="admin-content-moderation__policy-toggle">
                  <input
                    type="checkbox"
                    checked={policy.flagScamBio}
                    onChange={(e) =>
                      setPolicy((prev) => (prev ? { ...prev, flagScamBio: e.target.checked } : prev))
                    }
                  />
                  <span className="admin-content-moderation__policy-toggle-ui" aria-hidden="true" />
                  <span className="admin-content-moderation__policy-toggle-copy">
                    <strong>Scam or off-platform payment bios</strong>
                    <em>Block money requests and external payment links from going live.</em>
                  </span>
                </label>
              </div>

              <footer className="admin-content-moderation__policy-footer">
                <button
                  type="button"
                  className="admin-content-moderation__policy-save"
                  onClick={() => void handleSavePolicy()}
                  disabled={savingPolicy}
                >
                  {savingPolicy ? 'Saving…' : 'Save policy'}
                </button>
                <button
                  type="button"
                  className="admin-content-moderation__policy-rescan"
                  onClick={() => void handleRescan()}
                  disabled={rescanning}
                >
                  {rescanning ? 'Scanning pending items…' : 'Re-scan queue with AI'}
                </button>
              </footer>
            </div>
          ) : (
            <p className="admin-content-moderation__empty">Loading policy…</p>
          )}
        </article>
      </div>

      {previewItem && (
        <div
          className="admin-content-moderation__preview"
          role="dialog"
          aria-modal="true"
          aria-label={`Review ${CONTENT_TYPE_LABELS[previewItem.contentType]}`}
        >
          <button
            type="button"
            className="admin-content-moderation__preview-backdrop"
            onClick={() => setPreviewItem(null)}
            aria-label="Close preview"
          />
          <article className="admin-content-moderation__preview-card">
            <button
              type="button"
              className="admin-content-moderation__preview-close"
              onClick={() => setPreviewItem(null)}
              aria-label="Close preview"
            >
              ×
            </button>
            <header className="admin-content-moderation__preview-head">
              <span>{CONTENT_TYPE_LABELS[previewItem.contentType]}</span>
              <strong>
                {previewItem.userName} · {previewItem.userHandle}
              </strong>
              <p>{previewItem.previewText}</p>
            </header>
            {isImageContent(previewItem.contentType) && previewItem.mediaUrl ? (
              <div className="admin-content-moderation__preview-media">
                <img
                  src={previewItem.mediaUrl}
                  alt={`${previewItem.userName} ${CONTENT_TYPE_LABELS[previewItem.contentType]}`}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = APP_IMAGES.logo;
                  }}
                />
              </div>
            ) : (
              <div className="admin-content-moderation__preview-text">{previewItem.previewText}</div>
            )}
            <div className="admin-content-moderation__preview-meta">
              {displayFlags(previewItem).map((flag) => (
                <span key={flag}>{flag}</span>
              ))}
              <span className="admin-content-moderation__score">
                AI score {formatAiScore(previewItem)}
              </span>
            </div>
            <div className="admin-content-moderation__preview-actions">
              <button
                type="button"
                disabled={busyQueueId === previewItem.id}
                onClick={() => void handleQueueAction(previewItem, 'approve')}
              >
                Approve
              </button>
              <button
                type="button"
                className="is-danger"
                disabled={busyQueueId === previewItem.id}
                onClick={() => void handleQueueAction(previewItem, 'remove')}
              >
                Remove
              </button>
            </div>
            <div className="admin-content-moderation__preview-more">
              <button
                type="button"
                className="admin-content-moderation__menu-item admin-content-moderation__menu-item--warn"
                disabled={busyQueueId === previewItem.id}
                onClick={() => void handleQueueAction(previewItem, 'warn')}
              >
                <span className="admin-content-moderation__menu-icon" aria-hidden>
                  <IconWarn />
                </span>
                <span className="admin-content-moderation__menu-copy">
                  <strong>Warn user</strong>
                </span>
              </button>
              <button
                type="button"
                className="admin-content-moderation__menu-item admin-content-moderation__menu-item--hide"
                disabled={busyQueueId === previewItem.id}
                onClick={() => void handleQueueAction(previewItem, 'hide_discover')}
              >
                <span className="admin-content-moderation__menu-icon" aria-hidden>
                  <IconHideDiscover />
                </span>
                <span className="admin-content-moderation__menu-copy">
                  <strong>Hide from Discover</strong>
                </span>
              </button>
              <button
                type="button"
                className="admin-content-moderation__menu-item admin-content-moderation__menu-item--escalate"
                disabled={busyQueueId === previewItem.id}
                onClick={() => void handleQueueAction(previewItem, 'escalate')}
              >
                <span className="admin-content-moderation__menu-icon" aria-hidden>
                  <IconEscalate />
                </span>
                <span className="admin-content-moderation__menu-copy">
                  <strong>Escalate</strong>
                </span>
              </button>
              <button type="button" className="admin-content-moderation__preview-close" onClick={() => setPreviewItem(null)}>
                Close
              </button>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
