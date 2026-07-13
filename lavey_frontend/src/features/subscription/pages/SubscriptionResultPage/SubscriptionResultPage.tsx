import { useEffect, useState } from 'react';
import { LogoLoader } from '@/components/ui/LogoLoader';
import { PlatinumWelcomeSheet } from '@/components/subscription/PlatinumWelcomeSheet';
import { paidChatService } from '@/services/discover/paidChatService';
import { platinumService } from '@/services/subscription/platinumService';
import { clearUserProfileCache } from '@/hooks/profile/useUserProfile';
import {
  clearPendingPayfastCheckout,
  readPayfastReturnParams,
  readPendingPayfastCheckout,
} from '@/utils/subscription/platinumCheckoutStorage';
import { notifyPlatinumUpdated } from '@/utils/subscription/platinumUpdatedEvent';
import {
  clearPlatinumWelcomePending,
  setPlatinumWelcomePending,
} from '@/utils/subscription/platinumWelcomeStorage';
import './SubscriptionResultPage.css';

interface SubscriptionResultPageProps {
  variant: 'success' | 'cancel';
  onNavigate: (path: string) => void;
}

export function SubscriptionResultPage({ variant, onNavigate }: SubscriptionResultPageProps) {
  const isChatPurchase =
    new URLSearchParams(window.location.search).get('purchase') === 'chat_credits';
  const [isConfirming, setIsConfirming] = useState(variant === 'success');
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [statusText, setStatusText] = useState(
    variant === 'success'
      ? isChatPurchase
        ? 'Confirming your chat credits…'
        : 'Confirming your Platinum payment…'
      : 'Payment cancelled.',
  );

  const openWelcome = () => {
    setPlatinumWelcomePending();
    setWelcomeOpen(true);
    setIsConfirming(false);
  };

  useEffect(() => {
    if (variant !== 'success' || isChatPurchase) return;
    let cancelled = false;

    async function confirmPremium() {
      try {
        const returnParams = readPayfastReturnParams();
        const storedPaymentId = readPendingPayfastCheckout();
        const mPaymentId = returnParams.mPaymentId ?? storedPaymentId ?? undefined;
        const activated = await platinumService.confirmReturn({
          mPaymentId,
          paymentStatus: returnParams.paymentStatus,
          pfPaymentId: returnParams.pfPaymentId,
        });
        if (cancelled) return;

        if (activated.isPremium) {
          clearPendingPayfastCheckout();
          clearUserProfileCache();
          notifyPlatinumUpdated();
          openWelcome();
          return;
        }

        for (let attempt = 0; attempt < 6; attempt += 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 1500));
          const status = await platinumService.getStatus();
          if (cancelled) return;
          if (status.isPremium) {
            clearPendingPayfastCheckout();
            clearUserProfileCache();
            notifyPlatinumUpdated();
            openWelcome();
            return;
          }
        }

        setIsConfirming(false);
        setStatusText('Payment received. Platinum may take a minute to activate.');
      } catch {
        if (!cancelled) {
          setIsConfirming(false);
          setStatusText('Payment submitted. Platinum will activate shortly.');
        }
      }
    }

    void confirmPremium();
    return () => {
      cancelled = true;
    };
  }, [variant, isChatPurchase]);

  useEffect(() => {
    if (variant !== 'success' || !isChatPurchase) return;
    let cancelled = false;

    void (async () => {
      const paymentId = sessionStorage.getItem('lavey_chat_credit_payment_id');
      if (!paymentId) {
        setIsConfirming(false);
        setStatusText('Payment submitted. Credits will appear after PayFast confirms it.');
        return;
      }

      for (let attempt = 0; attempt < 10; attempt += 1) {
        try {
          const checkout = await paidChatService.getCheckoutStatus(paymentId);
          if (cancelled) return;
          if (checkout.status === 'complete') {
            sessionStorage.removeItem('lavey_chat_credit_payment_id');
            clearPendingPayfastCheckout();
            setIsConfirming(false);
            setStatusText(
              `${checkout.credits} chat ${checkout.credits === 1 ? 'credit is' : 'credits are'} ready. Your balance is ${checkout.balance}.`,
            );
            return;
          }
          if (checkout.status === 'failed' || checkout.status === 'cancelled') break;
        } catch {
          // The verified ITN may still be processing.
        }
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
      }

      if (!cancelled) {
        setIsConfirming(false);
        setStatusText('Payment submitted. Credits will appear after PayFast confirms it.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [variant, isChatPurchase]);

  const handleBack = () => {
    if (isChatPurchase) sessionStorage.removeItem('lavey_chat_credit_payment_id');
    clearPendingPayfastCheckout();
    clearUserProfileCache();
    notifyPlatinumUpdated();
    onNavigate('/');
  };

  const handleWelcomeClose = () => {
    setWelcomeOpen(false);
    clearPlatinumWelcomePending();
    handleBack();
  };

  return (
    <div className="subscription-result">
      {variant === 'success' && isConfirming ? (
        <>
          <LogoLoader size="md" label={isChatPurchase ? 'Chat credits' : 'Platinum'} />
          <p className="subscription-result__message">{statusText}</p>
        </>
      ) : variant === 'cancel' ? (
        <>
          <h1 className="subscription-result__title">Checkout cancelled</h1>
          <p className="subscription-result__message">{statusText}</p>
          <button type="button" className="subscription-result__btn" onClick={handleBack}>
            Back to Lavey
          </button>
        </>
      ) : !welcomeOpen ? (
        <>
          <h1 className="subscription-result__title">
            {isChatPurchase ? 'Chat credits' : 'Thanks for upgrading'}
          </h1>
          <p className="subscription-result__message">{statusText}</p>
          <button type="button" className="subscription-result__btn" onClick={handleBack}>
            Back to Lavey
          </button>
        </>
      ) : null}

      {!isChatPurchase ? (
        <PlatinumWelcomeSheet
          open={welcomeOpen}
          onClose={handleWelcomeClose}
          primaryLabel="Back to Lavey"
        />
      ) : null}
    </div>
  );
}
