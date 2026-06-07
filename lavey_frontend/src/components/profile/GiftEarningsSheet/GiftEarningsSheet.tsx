import { useCallback, useEffect, useMemo, useState } from 'react';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { SheetSaveSuccess, type SheetSaveAction } from '@/components/profile/SheetSaveSuccess';
import { PageTransitionSplash } from '@/components/ui/PageTransitionSplash/PageTransitionSplash';
import {
  payoutService,
  type GiftWallet,
  type PayoutBank,
  type PayoutCatalog,
  type WithdrawalMethod,
} from '@/services/gifts/payoutService';
import { getUserFacingErrorMessage } from '@/utils/errors/userFacingErrorMessage';
import './GiftEarningsSheet.css';

interface GiftEarningsSheetProps {
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function GiftEarningsSheet({ open, onClose, onRefresh }: GiftEarningsSheetProps) {
  const [catalog, setCatalog] = useState<PayoutCatalog | null>(null);
  const [wallet, setWallet] = useState<GiftWallet | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [methodId, setMethodId] = useState('bank_transfer');
  const [bankId, setBankId] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState<'checking' | 'savings'>('checking');
  const [showBankForm, setShowBankForm] = useState(true);

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [saveFlash, setSaveFlash] = useState<{ action: SheetSaveAction; detail?: string } | null>(null);

  const selectedMethod = useMemo(
    () => catalog?.methods.find((m) => m.id === methodId) ?? catalog?.methods[0] ?? null,
    [catalog, methodId],
  );

  const minWithdraw = selectedMethod?.minAmountUsd ?? 10;
  const available = wallet?.availableUsd ?? 0;
  const pending = wallet?.pendingWithdrawalUsd ?? 0;

  const bankComplete =
    Boolean(methodId && bankId && accountHolder.trim() && accountNumber.trim().length >= 4);

  const applyWalletToForm = useCallback((nextWallet: GiftWallet, banks: PayoutBank[]) => {
    const account = nextWallet.payoutAccount;
    if (account) {
      setMethodId(account.methodId);
      setBankId(account.bankId ?? banks.find((b) => b.name === account.bankName)?.id ?? '');
      setAccountHolder(account.accountHolder);
      setAccountNumber('');
      setAccountType(account.accountType);
      setShowBankForm(false);
    } else {
      setShowBankForm(true);
    }
  }, []);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setLoadError(null);
    }
    try {
      const [nextCatalog, nextWallet] = await Promise.all([
        payoutService.getCatalog(),
        payoutService.getWallet(),
      ]);
      setCatalog(nextCatalog);
      setWallet(nextWallet);
      applyWalletToForm(nextWallet, nextCatalog.banks);
      if (!nextWallet.payoutAccount) {
        setMethodId(nextCatalog.methods[0]?.id ?? 'bank_transfer');
      }
      const nextAvailable = nextWallet.availableUsd;
      const defaultMin = nextCatalog.methods[0]?.minAmountUsd ?? 10;
      setWithdrawAmount(nextAvailable >= defaultMin ? nextAvailable.toFixed(2) : '');
      setStatus(null);
    } catch (error) {
      setLoadError(getUserFacingErrorMessage(error, 'Could not load your gift wallet.'));
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [applyWalletToForm]);

  useEffect(() => {
    if (open) {
      void loadData();
      setSaveFlash(null);
      setIsSavingBank(false);
    }
  }, [open, loadData]);

  useEffect(() => {
    if (open && wallet && available >= minWithdraw && !withdrawAmount) {
      setWithdrawAmount(available.toFixed(2));
    }
  }, [open, wallet, available, minWithdraw, withdrawAmount]);

  const handleRefresh = () => {
    void loadData(true);
    onRefresh();
  };

  const handleSaveBank = async () => {
    if (!bankComplete) {
      setStatus('Complete all bank fields before saving.');
      return;
    }

    setIsSavingBank(true);
    setStatus(null);
    try {
      const saved = await payoutService.savePayoutAccount({
        methodId,
        bankId,
        accountHolder: accountHolder.trim(),
        accountNumber,
        accountType,
      });
      const nextWallet = wallet
        ? { ...wallet, payoutAccount: saved }
        : await payoutService.getWallet();
      setWallet(nextWallet);
      setAccountNumber('');
      setShowBankForm(false);
      setSaveFlash({ action: 'bank' });
    } catch (error) {
      setStatus(getUserFacingErrorMessage(error, 'Could not save bank details.'));
    } finally {
      setIsSavingBank(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!wallet?.payoutAccount && !bankComplete) {
      setStatus('Add your bank details before withdrawing.');
      return;
    }
    if (Number.isNaN(amount) || amount < minWithdraw) {
      setStatus(`Minimum withdrawal is $${minWithdraw.toFixed(2)}.`);
      return;
    }
    if (amount > available) {
      setStatus(`You can withdraw up to $${available.toFixed(2)}.`);
      return;
    }
    if (wallet && !wallet.withdrawEnabled) {
      setStatus('Withdrawals are disabled on your account. Contact support.');
      return;
    }

    setIsWithdrawing(true);
    setStatus(null);
    try {
      if (!wallet?.payoutAccount && bankComplete) {
        await payoutService.savePayoutAccount({
          methodId,
          bankId,
          accountHolder: accountHolder.trim(),
          accountNumber,
          accountType,
        });
      }

      const result = await payoutService.requestWithdrawal(amount);
      const mask = wallet?.payoutAccount?.accountNumberMask ?? 'your account';
      const timing = selectedMethod?.processingTime ?? '3–5 business days';

      setWallet((current) =>
        current
          ? {
              ...current,
              pendingWithdrawalUsd: result.pendingWithdrawalUsd,
              availableUsd: result.availableUsd,
            }
          : current,
      );
      setWithdrawAmount(result.availableUsd >= minWithdraw ? result.availableUsd.toFixed(2) : '');
      setSaveFlash({
        action: 'withdraw',
        detail: `$${amount.toFixed(2)} is headed to ${mask} — usually ${timing.toLowerCase()}.`,
      });
      onRefresh();
    } catch (error) {
      setStatus(getUserFacingErrorMessage(error, 'Withdrawal could not be processed.'));
    } finally {
      setIsWithdrawing(false);
    }
  };

  const renderMethodCard = (method: WithdrawalMethod) => {
    const selected = method.id === methodId;
    return (
      <button
        key={method.id}
        type="button"
        className={`gift-earnings-sheet__method ${selected ? 'gift-earnings-sheet__method--selected' : ''}`}
        onClick={() => setMethodId(method.id)}
        aria-pressed={selected}
      >
        <span className="gift-earnings-sheet__method-label">{method.label}</span>
        <span className="gift-earnings-sheet__method-meta">{method.processingTime}</span>
      </button>
    );
  };

  const renderBankTile = (bank: PayoutBank) => {
    const selected = bank.id === bankId;
    return (
      <button
        key={bank.id}
        type="button"
        className={`gift-earnings-sheet__bank ${selected ? 'gift-earnings-sheet__bank--selected' : ''}`}
        onClick={() => setBankId(bank.id)}
        aria-pressed={selected}
        title={bank.name}
      >
        <img src={bank.logoUrl} alt="" className="gift-earnings-sheet__bank-logo" />
        <span className="gift-earnings-sheet__bank-name">{bank.name}</span>
      </button>
    );
  };

  return (
    <ProfileSheet
      open={open}
      title="Your gifts"
      onClose={onClose}
      fromTop
      compact
      hideHandle
    >
      <div className="gift-earnings-sheet">
        {saveFlash && (
          <SheetSaveSuccess
            variant="overlay"
            action={saveFlash.action}
            detail={saveFlash.detail}
            onComplete={() => setSaveFlash(null)}
            autoCloseMs={2600}
          />
        )}

        {isLoading && !wallet ? (
          <div className="gift-earnings-sheet__loader">
            <PageTransitionSplash />
          </div>
        ) : loadError ? (
          <div className="gift-earnings-sheet__error-wrap">
            <p className="gift-earnings-sheet__error">{loadError}</p>
            <button type="button" className="gift-earnings-sheet__retry" onClick={() => void loadData()}>
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="gift-earnings-sheet__balance">
              <div className="gift-earnings-sheet__balance-row">
                <div>
                  <span className="gift-earnings-sheet__label">Available</span>
                  <p className="gift-earnings-sheet__amount">${available.toFixed(2)}</p>
                </div>
                <button
                  type="button"
                  className="gift-earnings-sheet__refresh"
                  onClick={handleRefresh}
                  aria-label="Refresh balance"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M21 12a9 9 0 11-2.64-6.36M21 3v6h-6" />
                  </svg>
                </button>
              </div>
              <p className="gift-earnings-sheet__sub">From gifts on meetups</p>
              {pending > 0 && (
                <p className="gift-earnings-sheet__pending">${pending.toFixed(2)} processing</p>
              )}
            </div>

            <p className="gift-earnings-sheet__note">
              Gifts sent during video meetups land here. Withdraw to your bank when you&apos;re ready.
            </p>

            {wallet?.payoutAccount && !showBankForm && (
              <div className="gift-earnings-sheet__saved">
                {wallet.payoutAccount.bankLogoUrl && (
                  <img
                    src={wallet.payoutAccount.bankLogoUrl}
                    alt=""
                    className="gift-earnings-sheet__saved-logo"
                  />
                )}
                <div className="gift-earnings-sheet__saved-text">
                  <span className="gift-earnings-sheet__saved-bank">
                    {wallet.payoutAccount.bankName ?? 'Bank account'}
                  </span>
                  <span className="gift-earnings-sheet__saved-meta">
                    {wallet.payoutAccount.accountHolder} · {wallet.payoutAccount.accountNumberMask}
                  </span>
                  <span className="gift-earnings-sheet__saved-method">
                    {wallet.payoutAccount.methodLabel}
                  </span>
                </div>
                <button
                  type="button"
                  className="gift-earnings-sheet__edit-bank"
                  onClick={() => setShowBankForm(true)}
                >
                  Edit
                </button>
              </div>
            )}

            {(showBankForm || !wallet?.payoutAccount) && catalog && (
              <>
                <section className="gift-earnings-sheet__section">
                  <h3 className="gift-earnings-sheet__section-title">Method of withdrawal</h3>
                  <div className="gift-earnings-sheet__methods">
                    {catalog.methods.map(renderMethodCard)}
                  </div>
                  {selectedMethod?.description && (
                    <p className="gift-earnings-sheet__method-desc">{selectedMethod.description}</p>
                  )}
                </section>

                <section className="gift-earnings-sheet__section">
                  <h3 className="gift-earnings-sheet__section-title">Bank account</h3>
                  <div className="gift-earnings-sheet__banks">{catalog.banks.map(renderBankTile)}</div>

                  <label className="gift-earnings-sheet__field">
                    <span>Account holder</span>
                    <input
                      className="gift-earnings-sheet__input"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      placeholder="Full legal name"
                      autoComplete="name"
                    />
                  </label>

                  <div className="gift-earnings-sheet__account-type">
                    <button
                      type="button"
                      className={`gift-earnings-sheet__type-btn ${accountType === 'checking' ? 'gift-earnings-sheet__type-btn--on' : ''}`}
                      onClick={() => setAccountType('checking')}
                      aria-pressed={accountType === 'checking'}
                    >
                      Checking
                    </button>
                    <button
                      type="button"
                      className={`gift-earnings-sheet__type-btn ${accountType === 'savings' ? 'gift-earnings-sheet__type-btn--on' : ''}`}
                      onClick={() => setAccountType('savings')}
                      aria-pressed={accountType === 'savings'}
                    >
                      Savings
                    </button>
                  </div>

                  <label className="gift-earnings-sheet__field">
                    <span>Account number</span>
                    <input
                      className="gift-earnings-sheet__input"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder={wallet?.payoutAccount ? 'Enter to update account number' : 'Checking account'}
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </label>

                  <button
                    type="button"
                    className="gift-earnings-sheet__save-bank"
                    disabled={isSavingBank || !bankComplete}
                    onClick={() => void handleSaveBank()}
                  >
                    {isSavingBank ? 'Saving…' : 'Save bank info'}
                  </button>
                </section>
              </>
            )}

            <section className="gift-earnings-sheet__section">
              <h3 className="gift-earnings-sheet__section-title">Withdraw</h3>
              <label className="gift-earnings-sheet__field">
                <span>Amount (USD)</span>
                <div className="gift-earnings-sheet__amount-input">
                  <span>$</span>
                  <input
                    type="number"
                    className="gift-earnings-sheet__input gift-earnings-sheet__input--amount"
                    min={minWithdraw}
                    step="0.01"
                    max={available}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </label>
              <button
                type="button"
                className="gift-earnings-sheet__withdraw"
                onClick={() => void handleWithdraw()}
                disabled={isWithdrawing || available < minWithdraw || !wallet?.withdrawEnabled}
              >
                {isWithdrawing ? 'Processing…' : 'Withdraw funds'}
              </button>
              <p className="gift-earnings-sheet__fine">
                Min ${minWithdraw.toFixed(0)} · {selectedMethod?.processingTime ?? '3–5 business days'}
              </p>
            </section>

            {status && <p className="gift-earnings-sheet__status">{status}</p>}
          </>
        )}
      </div>
    </ProfileSheet>
  );
}
