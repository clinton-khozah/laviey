import { useEffect, useState } from 'react';
import { adminModerationService } from '@/services/admin/adminModerationService';
import { adminOpsService, type ActivityItem, type Broadcast, type SystemAlert } from '@/services/admin/adminOpsService';
import { adminSupportService } from '@/services/admin/adminSupportService';
import type { OpsToolId } from './adminToolTypes';
import './AdminQuickToolsPanel.css';

interface AdminQuickToolsPageProps {
  toolId: OpsToolId;
  onOpenSupport: () => void;
  onOpenModeration: () => void;
  onOpenUsers?: () => void;
  onOpenHr?: () => void;
  onOpenAi?: () => void;
}

interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  time: string;
  tone: 'info' | 'warn' | 'success';
  actionLabel?: string;
  onAction?: () => void;
}

const HELP_LINKS: Array<{
  title: string;
  detail: string;
  section: 'content' | 'ai' | 'users' | 'comms';
}> = [
  {
    title: 'Content Control workflow',
    detail: 'How AI pre-screen, approve, and escalation work.',
    section: 'content',
  },
  {
    title: 'AI Overseer guide',
    detail: 'Apply algorithms and read period metrics.',
    section: 'ai',
  },
  {
    title: 'User enforcement',
    detail: 'Ban, restrict chat, and official inbox messages.',
    section: 'users',
  },
  {
    title: 'Support inbox',
    detail: 'Reply to Talk to us tickets from the app.',
    section: 'comms',
  },
];

const TOOL_TITLES: Record<OpsToolId, string> = {
  notifications: 'Notifications',
  activity: 'Activity log',
  alerts: 'System alerts',
  broadcast: 'Push broadcast',
  export: 'Data export',
  help: 'Help center',
};

function alertTone(severity: SystemAlert['severity']): 'info' | 'warn' | 'success' {
  if (severity === 'critical' || severity === 'high') return 'warn';
  return 'info';
}

export function AdminQuickToolsPage({
  toolId,
  onOpenSupport,
  onOpenModeration,
  onOpenUsers,
  onOpenHr,
  onOpenAi,
}: AdminQuickToolsPageProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(
    toolId === 'notifications' || toolId === 'alerts' || toolId === 'activity' || toolId === 'broadcast',
  );
  const [broadcastAudience, setBroadcastAudience] = useState('all');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastNotice, setBroadcastNotice] = useState('');
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState('');

  useEffect(() => {
    if (toolId !== 'notifications') return;

    let cancelled = false;
    setLoading(true);

    void Promise.all([
      adminModerationService.getStats().catch(() => null),
      adminSupportService.listTickets().catch(() => []),
    ]).then(([modStats, tickets]) => {
      if (cancelled) return;

      const items: NotificationItem[] = [];
      const openTickets = tickets.filter((t) => t.status === 'open' || t.status === 'pending');
      const unreadTickets = tickets.filter((t) => t.unread);

      if (modStats) {
        const queueTotal = modStats.aiPrescreen + modStats.humanReview;
        if (queueTotal > 0) {
          items.push({
            id: 'mod-queue',
            title: `${queueTotal} item${queueTotal === 1 ? '' : 's'} in moderation queue`,
            detail: `${modStats.aiPrescreen} AI pre-screen · ${modStats.humanReview} human review`,
            time: 'Now',
            tone: 'warn',
            actionLabel: 'Open Content Control',
            onAction: onOpenModeration,
          });
        }
        if (modStats.userReports > 0) {
          items.push({
            id: 'mod-reports',
            title: `${modStats.userReports} open member report${modStats.userReports === 1 ? '' : 's'}`,
            detail: 'Review harassment, scam, and safety reports.',
            time: 'Now',
            tone: 'warn',
            actionLabel: 'Review reports',
            onAction: onOpenModeration,
          });
        }
      }

      if (unreadTickets.length > 0) {
        items.push({
          id: 'support-unread',
          title: `${unreadTickets.length} unread support message${unreadTickets.length === 1 ? '' : 's'}`,
          detail: 'Members are waiting on Talk to us replies.',
          time: 'Now',
          tone: 'info',
          actionLabel: 'Open inbox',
          onAction: onOpenSupport,
        });
      }

      if (openTickets.length > 0 && unreadTickets.length === 0) {
        items.push({
          id: 'support-open',
          title: `${openTickets.length} open support ticket${openTickets.length === 1 ? '' : 's'}`,
          detail: 'Tickets still marked open or pending.',
          time: 'Today',
          tone: 'info',
          actionLabel: 'Open inbox',
          onAction: onOpenSupport,
        });
      }

      if (items.length === 0) {
        items.push({
          id: 'all-clear',
          title: 'All caught up',
          detail: 'No pending moderation or support items need attention.',
          time: 'Now',
          tone: 'success',
        });
      }

      setNotifications(items);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [toolId, onOpenModeration, onOpenSupport]);

  useEffect(() => {
    if (toolId !== 'alerts') return;

    let cancelled = false;
    setLoading(true);

    void adminOpsService
      .getSystemAlerts()
      .then((items) => {
        if (!cancelled) {
          setAlerts(items);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [toolId]);

  useEffect(() => {
    if (toolId !== 'activity') return;

    let cancelled = false;
    setLoading(true);

    void adminOpsService
      .getActivityFeed(30)
      .then((items) => {
        if (!cancelled) {
          setActivity(items);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [toolId]);

  useEffect(() => {
    if (toolId !== 'broadcast') return;

    let cancelled = false;
    setLoading(true);

    void adminOpsService
      .listBroadcasts()
      .then((items) => {
        if (!cancelled) {
          setBroadcasts(items);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [toolId]);

  const handleAlertAction = (alert: SystemAlert) => {
    if (alert.actionTarget === 'content') onOpenModeration();
    else if (alert.actionTarget === 'comms') onOpenSupport();
    else if (alert.actionTarget === 'hr') onOpenHr?.();
    else if (alert.actionTarget === 'ai') onOpenAi?.();
  };

  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    setBroadcastSending(true);
    setBroadcastNotice('');
    try {
      const sent = await adminOpsService.createBroadcast({
        audience: broadcastAudience,
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
      });
      setBroadcasts((prev) => [sent, ...prev]);
      setBroadcastTitle('');
      setBroadcastMessage('');
      setBroadcastNotice(`Sent to ~${sent.recipientEstimate.toLocaleString()} members.`);
    } catch (err) {
      setBroadcastNotice(err instanceof Error ? err.message : 'Broadcast failed.');
    } finally {
      setBroadcastSending(false);
    }
  };

  const handleExport = async (type: 'members' | 'moderation' | 'support' | 'algorithms') => {
    setExporting(type);
    setExportNotice('');
    try {
      await adminOpsService.downloadExport(type);
      setExportNotice(`${type.charAt(0).toUpperCase()}${type.slice(1)} export downloaded.`);
    } catch (err) {
      setExportNotice(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExporting(null);
    }
  };

  const openHelpSection = (section: 'content' | 'ai' | 'users' | 'comms') => {
    if (section === 'content') onOpenModeration();
    else if (section === 'comms') onOpenSupport();
    else if (section === 'ai') onOpenAi?.();
    else if (section === 'users') onOpenUsers?.();
  };

  return (
    <section className="admin-quick-tools admin-quick-tools--page" aria-label={TOOL_TITLES[toolId]}>
      <div className="admin-quick-tools__body">
        {toolId === 'notifications' && (
          <div className="admin-quick-tools__list">
            {loading ? <p className="admin-quick-tools__empty">Loading…</p> : null}
            {!loading &&
              notifications.map((item) => (
                <article key={item.id} className={`admin-quick-tools__card admin-quick-tools__card--${item.tone}`}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                    <time>{item.time}</time>
                  </div>
                  {item.actionLabel && item.onAction ? (
                    <button type="button" className="admin-quick-tools__action" onClick={item.onAction}>
                      {item.actionLabel}
                    </button>
                  ) : null}
                </article>
              ))}
          </div>
        )}

        {toolId === 'alerts' && (
          <div className="admin-quick-tools__list">
            {loading ? <p className="admin-quick-tools__empty">Loading…</p> : null}
            {!loading &&
              alerts.map((alert) => (
                <article
                  key={alert.id}
                  className={`admin-quick-tools__card admin-quick-tools__card--${alertTone(alert.severity)}`}
                >
                  <div>
                    <strong>{alert.title}</strong>
                    <p>{alert.detail}</p>
                    <span className="admin-quick-tools__severity">{alert.severity}</span>
                  </div>
                  {alert.actionLabel && alert.actionTarget ? (
                    <button type="button" className="admin-quick-tools__action" onClick={() => handleAlertAction(alert)}>
                      {alert.actionLabel}
                    </button>
                  ) : null}
                </article>
              ))}
          </div>
        )}

        {toolId === 'activity' && (
          <ul className="admin-quick-tools__timeline">
            {loading ? <li><p>Loading activity…</p></li> : null}
            {!loading && !activity.length ? (
              <li><p>No recent activity yet.</p></li>
            ) : null}
            {!loading &&
              activity.map((item) => (
                <li key={item.id}>
                  <span>{item.category}</span>
                  <p>
                    <strong>{item.title}</strong> — {item.detail}
                  </p>
                  <time>{adminOpsService.formatActivityTime(item.occurredAt)}</time>
                </li>
              ))}
          </ul>
        )}

        {toolId === 'broadcast' && (
          <div className="admin-quick-tools__broadcast">
            <div className="admin-quick-tools__form">
              <p>Send a push or in-app announcement to member segments.</p>
              <label>
                Audience
                <select value={broadcastAudience} onChange={(e) => setBroadcastAudience(e.target.value)}>
                  <option value="all">All active members</option>
                  <option value="new">New members (7d)</option>
                  <option value="platinum">Platinum subscribers</option>
                  <option value="inactive">Inactive 14d+</option>
                </select>
              </label>
              <label>
                Title
                <input
                  type="text"
                  placeholder="e.g. New matches near you"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                />
              </label>
              <label>
                Message
                <textarea
                  rows={4}
                  placeholder="Short message members will see…"
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="admin-quick-tools__primary"
                disabled={broadcastSending || !broadcastTitle.trim() || !broadcastMessage.trim()}
                onClick={() => void handleSendBroadcast()}
              >
                {broadcastSending ? 'Sending…' : 'Send broadcast now'}
              </button>
              {broadcastNotice ? <p className="admin-quick-tools__hint">{broadcastNotice}</p> : null}
            </div>

            <div className="admin-quick-tools__history">
              <h4>Recent broadcasts</h4>
              {loading ? <p className="admin-quick-tools__empty">Loading…</p> : null}
              {!loading && !broadcasts.length ? (
                <p className="admin-quick-tools__empty">No broadcasts sent yet.</p>
              ) : null}
              <ul>
                {broadcasts.map((bc) => (
                  <li key={bc.id}>
                    <strong>{bc.title}</strong>
                    <span>
                      {bc.audience} · ~{bc.recipientEstimate.toLocaleString()} recipients
                    </span>
                    <time>{bc.sentAt ? adminOpsService.formatActivityTime(bc.sentAt) : '—'}</time>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {toolId === 'export' && (
          <div className="admin-quick-tools__export">
            <p>Download CSV snapshots for reporting.</p>
            <button
              type="button"
              className="admin-quick-tools__export-btn"
              disabled={exporting !== null}
              onClick={() => void handleExport('members')}
            >
              {exporting === 'members' ? 'Exporting…' : 'Members directory'}
            </button>
            <button
              type="button"
              className="admin-quick-tools__export-btn"
              disabled={exporting !== null}
              onClick={() => void handleExport('moderation')}
            >
              {exporting === 'moderation' ? 'Exporting…' : 'Moderation queue'}
            </button>
            <button
              type="button"
              className="admin-quick-tools__export-btn"
              disabled={exporting !== null}
              onClick={() => void handleExport('support')}
            >
              {exporting === 'support' ? 'Exporting…' : 'Support tickets'}
            </button>
            <button
              type="button"
              className="admin-quick-tools__export-btn"
              disabled={exporting !== null}
              onClick={() => void handleExport('algorithms')}
            >
              {exporting === 'algorithms' ? 'Exporting…' : 'Algorithm metrics (30d)'}
            </button>
            {exportNotice ? <p className="admin-quick-tools__hint">{exportNotice}</p> : null}
            <p className="admin-quick-tools__hint">Exports use live API data from your connected backend.</p>
          </div>
        )}

        {toolId === 'help' && (
          <ul className="admin-quick-tools__help">
            {HELP_LINKS.map((link) => (
              <li key={link.title}>
                <button type="button" className="admin-quick-tools__help-link" onClick={() => openHelpSection(link.section)}>
                  <strong>{link.title}</strong>
                  <p>{link.detail}</p>
                  <span>Open →</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
