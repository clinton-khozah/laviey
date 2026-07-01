import { useEffect, useState } from 'react';
import { LogoLoader } from '@/components/ui/LogoLoader';
import { PlatinumWelcomeSheet } from '@/components/subscription/PlatinumWelcomeSheet';
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
  const [isConfirming, setIsConfirming] = useState(variant === 'success');
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [statusText, setStatusText] = useState(
    variant === 'success' ? 'Confirming your Platinum payment…' : 'Payment cancelled.',
  );

  const openWelcome = () => {
    setPlatinumWelcomePending();
    setWelcomeOpen(true);
    setIsConfirming(false);
  };

  useEffect(() => {
    if (variant !== 'success') return;

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
        setStatusText(
          'Payment received. Platinum may take a minute to activate — go back and refresh your profile.',
        );
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
  }, [variant]);

  const handleBack = () => {
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
          <LogoLoader size="md" label="Platinum" />
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
          <h1 className="subscription-result__title">Thanks for upgrading</h1>
          <p className="subscription-result__message">{statusText}</p>
          <button type="button" className="subscription-result__btn" onClick={handleBack}>
            Back to Lavey
          </button>
        </>
      ) : null}

      <PlatinumWelcomeSheet
        open={welcomeOpen}
        onClose={handleWelcomeClose}
        primaryLabel="Back to Lavey"
      />
    </div>
  );
}
