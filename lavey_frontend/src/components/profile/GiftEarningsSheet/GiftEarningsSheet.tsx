import { useCallback, useEffect, useMemo, useState } from 'react';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { PageTransitionSplash } from '@/components/ui/PageTransitionSplash/PageTransitionSplash';
import { payoutService, type GiftActivity, type GiftWallet } from '@/services/gifts/payoutService';
import { getUserFacingErrorMessage } from '@/utils/errors/userFacingErrorMessage';
import './GiftEarningsSheet.css';

interface GiftEarningsSheetProps {
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

type WalletView = 'overview' | 'calendar' | 'history';
type PayoutCategory = 'all' | 'eft' | 'mobile' | 'vouchers';
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const PAYOUT_CATEGORIES: Array<{ id: PayoutCategory; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'eft', label: 'EFT' },
  { id: 'mobile', label: 'Mobile wallets' },
  { id: 'vouchers', label: 'Vouchers' },
];
const PAYOUT_OPTIONS = [
  { id: 'eft', category: 'eft', label: 'EFT', detail: 'To your verified bank account', mark: 'EFT', tone: 'bank', available: true },
  { id: 'instant-money', category: 'mobile', label: 'Instant Money', detail: 'Collect using your mobile number', mark: 'IM', tone: 'blue', available: false },
  { id: 'cash-send', category: 'mobile', label: 'CashSend', detail: 'Cardless cash collection', mark: 'CS', tone: 'red', available: false },
  { id: 'ewallet', category: 'mobile', label: 'eWallet', detail: 'Send to a supported mobile wallet', mark: 'eW', tone: 'teal', available: false },
  { id: 'one-voucher', category: 'vouchers', label: '1Voucher', detail: 'Receive a digital cash voucher', mark: '1V', tone: 'orange', available: false },
  { id: 'blu-voucher', category: 'vouchers', label: 'Blu Voucher', detail: 'Redeem through supported Blu outlets', mark: 'Blu', tone: 'purple', available: false },
] as const;

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function dateKey(date: Date): string {
  return `${monthKey(date)}-${String(date.getDate()).padStart(2, '0')}`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character);
}

function downloadInvoice(withdrawal: GiftActivity['withdrawals'][number]) {
  const created = new Date(withdrawal.createdAt);
  const safeId = withdrawal.id.replace(/[^a-zA-Z0-9-]/g, '');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Lavey withdrawal ${safeId}</title><style>body{font-family:Arial,sans-serif;color:#18111f;margin:40px}main{max-width:640px;margin:auto}.brand{color:#ff4d6d;font-weight:800;font-size:28px}.card{margin-top:24px;padding:24px;border:1px solid #eadfea;border-radius:18px}h1{margin:8px 0 0}.amount{font-size:34px;font-weight:800;margin:24px 0}.row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee}.status{text-transform:capitalize;font-weight:700}.fine{margin-top:24px;color:#6b6170;font-size:12px}</style></head><body><main><div class="brand">Lavey</div><h1>Withdrawal invoice</h1><p>Reference ${safeId}</p><section class="card"><div class="amount">$${withdrawal.amountUsd.toFixed(2)} USD</div><div class="row"><span>Date requested</span><strong>${escapeHtml(created.toLocaleString())}</strong></div><div class="row"><span>Status</span><strong class="status">${escapeHtml(withdrawal.status)}</strong></div><div class="row"><span>Provider</span><strong>PayFast</strong></div><div class="row"><span>Method</span><strong>${escapeHtml(withdrawal.methodLabel)}</strong></div><div class="row"><span>Destination</span><strong>${escapeHtml(withdrawal.accountMask || 'PayFast account')}</strong></div></section><p class="fine">This document records a withdrawal request. A pending or processing status is not confirmation that funds have settled.</p></main></body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `lavey-withdrawal-${safeId}.html`;
  link.click();
  URL.revokeObjectURL(url);
}

export function GiftEarningsSheet({ open, onClose, onRefresh }: GiftEarningsSheetProps) {
  const [wallet, setWallet] = useState<GiftWallet | null>(null);
  const [activity, setActivity] = useState<GiftActivity>({ dailyEarnings: [], withdrawals: [] });
  const [view, setView] = useState<WalletView>('overview');
  const [payoutCategory, setPayoutCategory] = useState<PayoutCategory>('all');
  const [selectedPayoutOption, setSelectedPayoutOption] = useState('eft');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const available = wallet?.availableUsd ?? 0;
  const pending = wallet?.pendingWithdrawalUsd ?? 0;
  const allocatedBalance = available + pending;
  const availablePercent = allocatedBalance > 0 ? (available / allocatedBalance) * 100 : 0;

  const loadData = useCallback(async (silent = false) => {
    if (!silent) { setIsLoading(true); setLoadError(null); }
    try {
      const [nextWallet, nextActivity] = await Promise.all([
        payoutService.getWallet(),
        payoutService.getActivity(),
      ]);
      setWallet(nextWallet);
      setActivity(nextActivity);
    } catch (error) {
      setLoadError(getUserFacingErrorMessage(error, 'Could not load your gift wallet.'));
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) { setView('overview'); void loadData(); }
  }, [open, loadData]);

  const earningsByDate = useMemo(
    () => new Map(activity.dailyEarnings.map((entry) => [entry.date, entry.amountUsd])),
    [activity.dailyEarnings],
  );
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const first = new Date(year, month, 1);
    const gridStart = new Date(year, month, 1 - first.getDay());

    // Always render six complete weeks. February, August, and every other
    // month therefore occupy the same amount of space in the sheet.
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
      const key = dateKey(date);
      return {
        day: date.getDate(),
        key,
        amount: earningsByDate.get(key) ?? 0,
        inMonth: date.getMonth() === month,
        isToday: key === dateKey(new Date()),
      };
    });
  }, [calendarMonth, earningsByDate]);
  const monthTotal = activity.dailyEarnings
    .filter((entry) => entry.date.startsWith(monthKey(calendarMonth)))
    .reduce((sum, entry) => sum + entry.amountUsd, 0);
  const visiblePayoutOptions = PAYOUT_OPTIONS.filter(
    (option) => payoutCategory === 'all' || option.category === payoutCategory,
  );
  const selectedPayout = PAYOUT_OPTIONS.find((option) => option.id === selectedPayoutOption) ?? PAYOUT_OPTIONS[0];

  const handleRefresh = () => { void loadData(true); onRefresh(); };

  return (
    <ProfileSheet open={open} title="Your gifts" onClose={onClose} fromTop compact hideHandle>
      <div className="gift-earnings-sheet">
        {isLoading && !wallet ? <div className="gift-earnings-sheet__loader"><PageTransitionSplash /></div> : loadError ? (
          <div className="gift-earnings-sheet__error-wrap"><p className="gift-earnings-sheet__error">{loadError}</p><button type="button" className="gift-earnings-sheet__retry" onClick={() => void loadData()}>Try again</button></div>
        ) : <>
          <div className="gift-earnings-sheet__balance">
            <div className="gift-earnings-sheet__balance-row"><div><span className="gift-earnings-sheet__label">Current balance</span><p className="gift-earnings-sheet__amount">${available.toFixed(2)}</p></div><span className="gift-earnings-sheet__currency">USD</span><button type="button" className="gift-earnings-sheet__refresh" onClick={handleRefresh} aria-label="Refresh balance"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M21 12a9 9 0 11-2.64-6.36M21 3v6h-6" /></svg></button></div>
            <p className="gift-earnings-sheet__sub">From gifts and admin credits</p>
            <div className="gift-earnings-sheet__balance-visual"><div className="gift-earnings-sheet__balance-track" aria-hidden><span style={{ width: `${availablePercent}%` }} /></div><div className="gift-earnings-sheet__balance-legend"><span><i className="gift-earnings-sheet__dot gift-earnings-sheet__dot--available" />Available ${available.toFixed(2)}</span><span><i className="gift-earnings-sheet__dot" />Processing ${pending.toFixed(2)}</span></div></div>
          </div>

          <nav className="gift-earnings-sheet__tabs" aria-label="Gift wallet sections">
            {(['overview', 'calendar', 'history'] as WalletView[]).map((item) => <button key={item} type="button" className={view === item ? 'is-active' : ''} onClick={() => setView(item)}>{item === 'overview' ? 'Wallet' : item[0].toUpperCase() + item.slice(1)}</button>)}
          </nav>

          {view === 'overview' ? <>
            <div className="gift-earnings-sheet__note"><span className="gift-earnings-sheet__note-icon" aria-hidden>♥</span><p><strong>Your gift wallet</strong>Gifts and admin credits land here. PayFast securely manages your payout account.</p></div>
            <section className="gift-earnings-sheet__payfast-card">
              <div className="gift-earnings-sheet__payfast-mark" aria-hidden>PF</div>
              <div className="gift-earnings-sheet__payfast-copy"><span className="gift-earnings-sheet__payfast-eyebrow">Payout provider</span><h3>PayFast</h3><p>Choose how you would like to receive your available gift earnings.</p></div>
              <span className="gift-earnings-sheet__secure-pill">✓ Secure</span>

              <div className="gift-earnings-sheet__payout-picker">
                <div className="gift-earnings-sheet__payout-picker-title"><strong>Withdrawal options</strong><span>EFT processed through PayFast</span></div>
                <div className="gift-earnings-sheet__payout-categories" role="tablist" aria-label="Withdrawal option categories">
                  {PAYOUT_CATEGORIES.map((category) => <button key={category.id} type="button" role="tab" aria-selected={payoutCategory === category.id} className={payoutCategory === category.id ? 'is-active' : ''} onClick={() => setPayoutCategory(category.id)}>{category.label}</button>)}
                </div>
                <div className="gift-earnings-sheet__payout-options">
                  {visiblePayoutOptions.map((option) => <button key={option.id} type="button" className={`${selectedPayoutOption === option.id ? 'is-selected' : ''} ${!option.available ? 'is-coming-soon' : ''}`} onClick={() => { if (option.available) setSelectedPayoutOption(option.id); }} aria-pressed={selectedPayoutOption === option.id} aria-disabled={!option.available}><span className={`gift-earnings-sheet__payout-logo tone-${option.tone}`} aria-hidden>{option.mark}</span><span className="gift-earnings-sheet__payout-option-copy"><strong>{option.label}</strong><small>{option.available ? option.detail : 'Coming soon'}</small></span><span className="gift-earnings-sheet__payout-info" aria-hidden>{option.available ? 'i' : '⌛'}</span></button>)}
                </div>
              </div>

              <a className={`gift-earnings-sheet__payfast-action ${!wallet?.withdrawEnabled ? 'is-disabled' : ''}`} href="https://payfast.io/" target="_blank" rel="noreferrer" aria-disabled={!wallet?.withdrawEnabled} onClick={(event) => { if (!wallet?.withdrawEnabled) event.preventDefault(); }}>Continue with {selectedPayout.label} <span aria-hidden>→</span></a>
              {!wallet?.withdrawEnabled ? <p className="gift-earnings-sheet__payfast-warning">Withdrawals are disabled. Contact Lavey support before continuing.</p> : null}
            </section>
          </> : null}

          {view === 'calendar' ? <section className="gift-earnings-sheet__panel">
            <header className="gift-earnings-sheet__calendar-head"><button type="button" onClick={() => { setSelectedDate(null); setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)); }} aria-label="Previous month">‹</button><div><strong>{calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong><span>${monthTotal.toFixed(2)} earned</span></div><button type="button" onClick={() => { setSelectedDate(null); setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)); }} aria-label="Next month">›</button></header>
            <div className="gift-earnings-sheet__weekdays">{WEEKDAYS.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
            <div className="gift-earnings-sheet__calendar">{calendarDays.map((entry) => <button key={entry.key} type="button" className={`${entry.inMonth ? '' : 'is-outside'} ${entry.isToday ? 'is-today' : ''} ${entry.amount > 0 ? 'has-earnings' : ''} ${selectedDate === entry.key ? 'is-selected' : ''}`} onClick={() => { setSelectedDate(entry.key); if (!entry.inMonth) { const next = new Date(`${entry.key}T12:00:00`); setCalendarMonth(new Date(next.getFullYear(), next.getMonth(), 1)); } }} aria-label={`${new Date(`${entry.key}T12:00:00`).toLocaleDateString()}: $${entry.amount.toFixed(2)} earned`}><span>{entry.day}</span>{entry.amount > 0 ? <small>${entry.amount.toFixed(2)}</small> : <i aria-hidden />}</button>)}</div>
            <p className="gift-earnings-sheet__day-total">{selectedDate ? `${new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { dateStyle: 'medium' })}: $${(earningsByDate.get(selectedDate) ?? 0).toFixed(2)}` : 'Select a day to see its earnings.'}</p>
          </section> : null}

          {view === 'history' ? <section className="gift-earnings-sheet__panel"><div className="gift-earnings-sheet__panel-title"><div><strong>Withdrawal history</strong><span>{activity.withdrawals.length} requests</span></div></div>{activity.withdrawals.length === 0 ? <div className="gift-earnings-sheet__empty"><span>↗</span><strong>No withdrawals yet</strong><p>Your PayFast payout requests will appear here.</p></div> : <div className="gift-earnings-sheet__history">{activity.withdrawals.map((item) => <article key={item.id}><div className="gift-earnings-sheet__history-icon">↗</div><div><strong>${item.amountUsd.toFixed(2)}</strong><span>{new Date(item.createdAt).toLocaleDateString()} · {item.methodLabel}</span></div><div className="gift-earnings-sheet__history-actions"><span className={`status-${item.status}`}>{item.status}</span><button type="button" onClick={() => downloadInvoice(item)}>Download invoice</button></div></article>)}</div>}</section> : null}
        </>}
      </div>
    </ProfileSheet>
  );
}
