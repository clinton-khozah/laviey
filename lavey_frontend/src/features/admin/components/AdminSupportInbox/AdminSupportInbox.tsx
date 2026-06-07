import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { APP_IMAGES } from '@/constants/images';
import {
  adminSupportService,
  type AdminSupportTicketDetail,
  type AdminSupportTicketListItem,
} from '@/services/admin/adminSupportService';
import { AdminSupportMemberModal } from './AdminSupportMemberModal';
import './AdminSupportInbox.css';

const POLL_MS = 12_000;

type TicketStatus = 'open' | 'pending' | 'resolved';

interface ProfileTarget {
  userId: string;
  name: string;
  email: string;
  avatar: string;
}

function messageClass(sender: AdminSupportTicketDetail['messages'][number]['sender']): string {
  if (sender === 'admin') return 'is-sent';
  if (sender === 'system') return 'is-system';
  return 'is-received';
}

function statusLabel(status: string): string {
  if (status === 'open') return 'Needs reply';
  if (status === 'pending') return 'Waiting on member';
  if (status === 'resolved') return 'Resolved';
  return status;
}

function statusClass(status: string): string {
  if (status === 'open') return 'is-open';
  if (status === 'pending') return 'is-pending';
  if (status === 'resolved') return 'is-resolved';
  return '';
}

function InboxLogoLoader() {
  return (
    <div className="admin-support-inbox__loader" aria-busy="true" aria-label="Loading">
      <img src={APP_IMAGES.logo} alt="" className="admin-support-inbox__loader-logo" />
    </div>
  );
}

export function AdminSupportInbox() {
  const [tickets, setTickets] = useState<AdminSupportTicketListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ticket, setTicket] = useState<AdminSupportTicketDetail | null>(null);
  const [draft, setDraft] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileTarget, setProfileTarget] = useState<ProfileTarget | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadTickets = useCallback(async (silent = false) => {
    if (!silent) setLoadingList(true);
    try {
      const list = await adminSupportService.listTickets();
      setTickets(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load support inbox.');
    } finally {
      if (!silent) setLoadingList(false);
    }
  }, []);

  const loadTicket = useCallback(async (ticketId: string, silent = false) => {
    if (!silent) setLoadingThread(true);
    try {
      const detail = await adminSupportService.getTicket(ticketId);
      setTicket(detail);
      setError(null);
      void loadTickets(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this conversation.');
    } finally {
      if (!silent) setLoadingThread(false);
    }
  }, [loadTickets]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (!selectedId) {
      setTicket(null);
      return;
    }
    void loadTicket(selectedId);
  }, [selectedId, loadTicket]);

  useEffect(() => {
    if (!selectedId) return;
    const timer = window.setInterval(() => {
      void loadTicket(selectedId, true);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [selectedId, loadTicket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [ticket?.messages, sending]);

  const openProfile = (target: ProfileTarget) => {
    setProfileTarget(target);
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || !selectedId || sending) return;

    setSending(true);
    try {
      const updated = await adminSupportService.reply(selectedId, trimmed);
      setTicket(updated);
      setDraft('');
      void loadTickets(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reply.');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (status: TicketStatus) => {
    if (!selectedId || !ticket || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      await adminSupportService.updateStatus(selectedId, status);
      setTicket({ ...ticket, status });
      setTickets((prev) =>
        prev.map((item) =>
          item.id === selectedId
            ? { ...item, status, unread: status === 'resolved' ? false : item.unread }
            : item,
        ),
      );
      void loadTickets(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const unreadCount = tickets.filter((t) => t.unread).length;

  return (
    <section className="admin-comms-hub admin-support-inbox">
      <header className="admin-support-inbox__head">
        <div>
          <h3>Support inbox</h3>
          <p>
            Messages from <strong>Talk to us</strong> in the app
            {unreadCount > 0 ? ` · ${unreadCount} new` : ''}
          </p>
        </div>
        <button type="button" onClick={() => void loadTickets()} disabled={loadingList}>
          Refresh
        </button>
      </header>

      {error && <p className="admin-support-inbox__error">{error}</p>}

      <div className="admin-comms-hub__layout">
        <aside className="admin-comms-hub__threads admin-support-inbox__threads">
          <h4>Conversations</h4>
          {loadingList && tickets.length === 0 ? (
            <InboxLogoLoader />
          ) : tickets.length === 0 ? (
            <div className="admin-support-inbox__empty-state">
              <img src={APP_IMAGES.logo} alt="" />
              <p>No support messages yet.</p>
              <span>When members use Talk to us, their requests appear here.</span>
            </div>
          ) : (
            tickets.map((item) => (
              <div
                key={item.id}
                className={`admin-comms-hub__thread admin-support-inbox__thread ${selectedId === item.id ? 'is-active' : ''} ${item.unread ? 'is-unread' : ''} ${statusClass(item.status)}`}
              >
                <button
                  type="button"
                  className="admin-support-inbox__avatar-btn"
                  aria-label={`View ${item.userName} profile`}
                  onClick={() =>
                    openProfile({
                      userId: item.userId,
                      name: item.userName,
                      email: item.userEmail,
                      avatar: item.userAvatar,
                    })
                  }
                >
                  <img
                    src={item.userAvatar || APP_IMAGES.logo}
                    alt=""
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = APP_IMAGES.logo;
                    }}
                  />
                </button>
                <button
                  type="button"
                  className="admin-support-inbox__thread-main"
                  onClick={() => setSelectedId(item.id)}
                >
                  <div className="admin-support-inbox__thread-body">
                    <div className="admin-support-inbox__thread-top">
                      <strong>{item.userName}</strong>
                      <span
                        className={`admin-support-inbox__thread-status ${statusClass(item.status)}`}
                      >
                        {statusLabel(item.status)}
                      </span>
                    </div>
                    {item.userEmail && (
                      <span className="admin-support-inbox__email">{item.userEmail}</span>
                    )}
                    <span className="admin-support-inbox__preview">{item.lastMessage}</span>
                    <span className="admin-support-inbox__time">{item.lastMessageAt}</span>
                  </div>
                  {item.unread && item.status !== 'resolved' && (
                    <em className="admin-support-inbox__badge">New</em>
                  )}
                </button>
              </div>
            ))
          )}
        </aside>

        <section className="admin-comms-hub__chat admin-support-inbox__chat">
          {!selectedId ? (
            <div className="admin-support-inbox__empty-state admin-support-inbox__empty-state--chat">
              <img src={APP_IMAGES.logo} alt="" />
              <p>Select a conversation</p>
              <span>Pick a member on the left to read their message and reply.</span>
            </div>
          ) : loadingThread && !ticket ? (
            <InboxLogoLoader />
          ) : ticket ? (
            <>
              <header>
                <button
                  type="button"
                  className="admin-support-inbox__profile-btn"
                  onClick={() =>
                    openProfile({
                      userId: ticket.userId,
                      name: ticket.userName,
                      email: ticket.userEmail,
                      avatar: ticket.userAvatar,
                    })
                  }
                >
                  <img
                    src={ticket.userAvatar || APP_IMAGES.logo}
                    alt=""
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = APP_IMAGES.logo;
                    }}
                  />
                  <div>
                    <strong>{ticket.userName}</strong>
                    <span>{ticket.userEmail || 'No email on file'}</span>
                    <em>View profile & posts</em>
                  </div>
                </button>
                <div className="admin-support-inbox__status">
                  <label htmlFor="support-status">Ticket status</label>
                  <select
                    id="support-status"
                    value={ticket.status}
                    disabled={updatingStatus}
                    onChange={(e) => void handleStatusChange(e.target.value as TicketStatus)}
                  >
                    <option value="open">Needs reply</option>
                    <option value="pending">Waiting on member</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </header>

              <div className="admin-comms-hub__messages admin-support-inbox__messages">
                {ticket.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`admin-comms-hub__message ${messageClass(message.sender)}`}
                  >
                    {message.sender === 'admin' && message.adminName && (
                      <small className="admin-support-inbox__sender">{message.adminName}</small>
                    )}
                    {message.sender === 'system' && (
                      <small className="admin-support-inbox__sender">Automated reply</small>
                    )}
                    {message.sender === 'user' && (
                      <small className="admin-support-inbox__sender">{ticket.userName}</small>
                    )}
                    <p>{message.text}</p>
                    <span>{message.sentAt}</span>
                  </div>
                ))}
                <div ref={bottomRef} aria-hidden />
              </div>

              <footer className="admin-support-inbox__composer">
                <form onSubmit={(e) => void handleSend(e)}>
                  <input
                    placeholder={`Reply to ${ticket.userName.split(' ')[0] ?? 'member'}…`}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    disabled={sending}
                  />
                  <button type="submit" disabled={sending || !draft.trim()}>
                    {sending ? 'Sending…' : 'Send reply'}
                  </button>
                </form>
              </footer>
            </>
          ) : null}
        </section>
      </div>

      {profileTarget && (
        <AdminSupportMemberModal
          userId={profileTarget.userId}
          fallbackName={profileTarget.name}
          fallbackEmail={profileTarget.email}
          fallbackAvatar={profileTarget.avatar}
          onClose={() => setProfileTarget(null)}
        />
      )}
    </section>
  );
}
