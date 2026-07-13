import { useEffect, useState } from 'react';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { paidChatService, type ChatCreditCatalog } from '@/services/discover/paidChatService';
import { submitPayfastCheckout } from '@/utils/subscription/payfastCheckout';
import type { Profile } from '@/types';
import './PaidChatSheet.css';

interface PaidChatSheetProps {
  profile: Profile | null;
  onClose: () => void;
  onUnlocked: (conversationId: string) => void;
}

export function PaidChatSheet({ profile, onClose, onUnlocked }: PaidChatSheetProps) {
  const [catalog, setCatalog] = useState<ChatCreditCatalog | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    void paidChatService
      .getCatalog()
      .then((next) => {
        if (!cancelled) setCatalog(next);
      })
      .catch((reason) => {
        if (!cancelled) {
          const message = reason instanceof Error ? reason.message : '';
          setError(
            /not registered|not found/i.test(message)
              ? 'Paid chat is being updated. Restart or redeploy the latest backend, then try again.'
              : message || 'Could not load chat credits.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profile]);

  if (!profile) return null;

  const unlock = async () => {
    setBusyId('unlock');
    setError(null);
    try {
      const result = await paidChatService.unlock(profile.id);
      onUnlocked(result.conversationId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not unlock this chat.');
    } finally {
      setBusyId(null);
    }
  };

  const buy = async (packId: string) => {
    setBusyId(packId);
    setError(null);
    try {
      const checkout = await paidChatService.startCheckout(packId);
      sessionStorage.setItem('lavey_chat_credit_payment_id', checkout.mPaymentId);
      submitPayfastCheckout(checkout);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not start checkout.');
      setBusyId(null);
    }
  };

  return (
    <ProfileSheet open={Boolean(profile)} title="Chat now" onClose={onClose} compact hideHandle>
      <div className="paid-chat-sheet">
        <div className="paid-chat-sheet__hero">
          <span className="paid-chat-sheet__hero-icon" aria-hidden>💬</span>
          <div>
            <h3>Message {profile.name} before matching</h3>
            <p>One chat credit opens the conversation. They can reply, ignore, or block it.</p>
          </div>
        </div>

        {isLoading ? <p className="paid-chat-sheet__status">Loading chat credits…</p> : null}

        {catalog ? (
          <>
            <div className="paid-chat-sheet__balance">
              <span>Your balance</span>
              <strong>{catalog.balance} {catalog.balance === 1 ? 'credit' : 'credits'}</strong>
            </div>

            {catalog.balance > 0 ? (
              <button
                type="button"
                className="paid-chat-sheet__unlock"
                disabled={Boolean(busyId)}
                onClick={() => void unlock()}
              >
                {busyId === 'unlock' ? 'Opening chat…' : `Use 1 credit to chat with ${profile.name.split(' ')[0]}`}
              </button>
            ) : (
              <p className="paid-chat-sheet__status">Buy a credit pack to start this chat.</p>
            )}

            <div className="paid-chat-sheet__packs">
              {catalog.packs.map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  className="paid-chat-sheet__pack"
                  disabled={Boolean(busyId)}
                  onClick={() => void buy(pack.id)}
                >
                  <span><strong>{pack.label}</strong><small>{pack.description}</small></span>
                  <b>R{pack.amountZar.toFixed(2)}</b>
                </button>
              ))}
            </div>
          </>
        ) : null}

        {error ? <p className="paid-chat-sheet__error" role="alert">{error}</p> : null}
        <p className="paid-chat-sheet__fineprint">Secure checkout via PayFast. Credits are added only after payment is confirmed.</p>
      </div>
    </ProfileSheet>
  );
}
