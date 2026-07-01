import { useEffect, useMemo, useState } from 'react';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { PlatinumBadge } from '@/components/subscription/PlatinumBadge';
import { PlatinumFeatureIcon } from '@/components/subscription/PlatinumFeatureIcon';
import { hasPremiumAccess } from '@/config/features';
import { FALLBACK_PLATINUM_CATALOG } from '@/constants/platinum';
import { usePlatinumCatalog } from '@/hooks/subscription/usePlatinumCatalog';
import { platinumService } from '@/services/subscription/platinumService';
import type { PlatinumPlan, PlatinumSubscriptionStatus } from '@/types';
import { submitPayfastCheckout } from '@/utils/subscription/payfastCheckout';
import { notifyPlatinumUpdated } from '@/utils/subscription/platinumUpdatedEvent';
import '../PlatinumUpgradeSheet/PlatinumUpgradeSheet.css';
import './PlatinumManageSheet.css';

interface PlatinumManageSheetProps {
  open: boolean;
  onClose: () => void;
  onSubscriptionChanged?: () => void;
  country?: string | null;
  /** Profile / dev unlock — manage sheet may open before status API confirms premium */
  isPremiumMember?: boolean;
}

function formatExpiry(iso: string | null): string {
  if (!iso) return 'when your current period ends';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}

function resolvePlanFromStatus(
  catalog: { plans: PlatinumPlan[] } | null,
  status: PlatinumSubscriptionStatus | null,
): PlatinumPlan | null {
  if (!catalog || !status) return null;

  const planKey = status.activeCheckout?.planKey;
  if (planKey) {
    const byId = catalog.plans.find((plan) => plan.id === planKey);
    if (byId) return byId;
  }

  const checkout = status.activeCheckout;
  if (checkout?.planLabel) {
    const byLabel = catalog.plans.find((plan) => plan.label === checkout.planLabel);
    if (byLabel) return byLabel;
  }

  if (checkout?.price) {
    return {
      id: checkout.planKey,
      label: checkout.planLabel,
      price: checkout.price,
      period: checkout.period,
    };
  }

  return null;
}

export function PlatinumManageSheet({
  open,
  onClose,
  onSubscriptionChanged,
  country,
  isPremiumMember = false,
}: PlatinumManageSheetProps) {
  const { catalog, isLoading: catalogLoading } = usePlatinumCatalog(open, country);
  const [status, setStatus] = useState<PlatinumSubscriptionStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentPlanKey = status?.activeCheckout?.planKey ?? null;

  const currentPlan = useMemo(
    () => resolvePlanFromStatus(catalog, status),
    [catalog, status],
  );

  useEffect(() => {
    if (!open) {
      setShowCancelConfirm(false);
      setFeedback(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setStatusLoading(true);

    void platinumService
      .getStatus()
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your subscription.');
      })
      .finally(() => {
        if (!cancelled) setStatusLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!catalog) return;
    setPlanId((current) => {
      if (currentPlanKey) {
        if (current === currentPlanKey) return current;
        return currentPlanKey;
      }
      if (current && catalog.plans.some((plan) => plan.id === current)) return current;
      return catalog.defaultPlanId;
    });
  }, [catalog, currentPlanKey]);

  const selectedPlan = useMemo(
    () => catalog?.plans.find((item) => item.id === planId) ?? catalog?.plans[0],
    [catalog, planId],
  );

  const isSwitchingPlan = Boolean(
    selectedPlan && currentPlanKey && selectedPlan.id !== currentPlanKey,
  );

  const isMember = hasPremiumAccess(isPremiumMember || Boolean(status?.isPremium));

  const features = useMemo(() => {
    const fromCatalog = catalog?.features ?? [];
    return fromCatalog.length > 0 ? fromCatalog : FALLBACK_PLATINUM_CATALOG.features;
  }, [catalog]);

  const planFinePrint = useMemo(() => {
    if (!catalog || !selectedPlan) return null;
    return selectedPlan.id === 'day'
      ? catalog.oneTimeFinePrint
      : catalog.recurringFinePrint;
  }, [catalog, selectedPlan]);

  const handleSwitchPlan = async () => {
    if (!selectedPlan || selectedPlan.id === currentPlanKey) return;
    setError(null);
    setIsSwitching(true);
    try {
      const checkout = await platinumService.startCheckout(selectedPlan.id);
      submitPayfastCheckout(checkout);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout.');
      setIsSwitching(false);
    }
  };

  const handleCancel = async () => {
    setError(null);
    setIsCancelling(true);
    try {
      const result = await platinumService.cancel();
      setStatus(result);
      setShowCancelConfirm(false);
      setFeedback(
        result.emailSent
          ? `We've emailed you a reminder. Platinum stays active until ${formatExpiry(result.premiumExpiresAt)}.`
          : `Platinum stays active until ${formatExpiry(result.premiumExpiresAt)}.`,
      );
      notifyPlatinumUpdated();
      onSubscriptionChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel subscription.');
    } finally {
      setIsCancelling(false);
    }
  };

  const isLoading = catalogLoading || statusLoading;

  return (
    <ProfileSheet open={open} title="Platinum" onClose={onClose} fromTop hideHandle>
      <div className="platinum-manage">
        <div className="platinum-manage__current">
          <PlatinumBadge size="md" showLabel />
          {isLoading ? (
            <p className="platinum-manage__muted">Loading your plan…</p>
          ) : currentPlan ? (
            <div className="platinum-manage__current-card">
              <span className="platinum-manage__current-kicker">Current plan</span>
              <p className="platinum-manage__plan-name">{currentPlan.label}</p>
              <p className="platinum-manage__plan-price">
                <span>{currentPlan.price}</span>
                <span className="platinum-manage__plan-period">{currentPlan.period}</span>
              </p>
              <p className="platinum-manage__muted">
                {status?.activeCheckout?.cancelAtPeriodEnd
                  ? `Cancels on ${formatExpiry(status.premiumExpiresAt)}`
                  : status?.premiumExpiresAt
                    ? `Active until ${formatExpiry(status.premiumExpiresAt)}`
                    : status?.activeCheckout?.isRecurring
                      ? 'Recurring billing active'
                      : 'Platinum access active'}
              </p>
            </div>
          ) : isMember ? (
            <p className="platinum-manage__muted">Platinum member</p>
          ) : null}
        </div>

        {catalog?.heroTagline && isMember ? (
          <p className="platinum-manage__tagline">{catalog.heroTagline}</p>
        ) : null}

        {feedback ? (
          <p className="platinum-manage__feedback" role="status">
            {feedback}
          </p>
        ) : null}

        {error ? (
          <p className="platinum-manage__error" role="alert">
            {error}
          </p>
        ) : null}

        {catalog && isMember && !status?.activeCheckout?.cancelAtPeriodEnd ? (
          <div className="platinum-manage__section">
            <h3 className="platinum-manage__section-title">Change plan</h3>
            <div className="platinum-upgrade__plans" role="radiogroup" aria-label="Choose a plan">
              {catalog.plans.map((option: PlatinumPlan) => {
                const selected = option.id === planId;
                const isCurrent = option.id === currentPlanKey;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={isCurrent}
                    className={`platinum-upgrade__plan ${selected ? 'platinum-upgrade__plan--active' : ''} ${isCurrent ? 'platinum-manage__plan--current' : ''}`}
                    onClick={() => {
                      if (!isCurrent) setPlanId(option.id);
                    }}
                  >
                    {isCurrent ? (
                      <span className="platinum-manage__plan-tag">Current</span>
                    ) : null}
                    <span className="platinum-upgrade__plan-label">{option.label}</span>
                    <span className="platinum-upgrade__plan-price">{option.price}</span>
                    <span className="platinum-upgrade__plan-period">{option.period}</span>
                  </button>
                );
              })}
            </div>

            {isSwitchingPlan && selectedPlan ? (
              <p className="platinum-manage__switch-note" role="status">
                Switch to <strong>{selectedPlan.label}</strong> ({selectedPlan.price}
                {selectedPlan.period}) — all Platinum perks below stay included.
              </p>
            ) : null}

            <button
              type="button"
              className="platinum-upgrade__cta platinum-manage__switch-btn"
              disabled={isSwitching || !selectedPlan || selectedPlan.id === currentPlanKey}
              onClick={() => void handleSwitchPlan()}
            >
              {isSwitching
                ? 'Redirecting to PayFast…'
                : selectedPlan?.id === currentPlanKey
                  ? 'Current plan'
                  : `Switch to ${selectedPlan?.label ?? 'plan'}`}
            </button>
            {planFinePrint ? (
              <p className="platinum-upgrade__fine-print platinum-manage__fine-print">{planFinePrint}</p>
            ) : null}
            {catalog.pricingNote ? (
              <p className="platinum-upgrade__fine-print platinum-upgrade__fine-print--currency platinum-manage__fine-print">
                {catalog.pricingNote}
              </p>
            ) : null}
          </div>
        ) : null}

        {catalog && isMember ? (
          <div className="platinum-manage__section platinum-manage__section--perks">
            <h3 className="platinum-manage__section-title">
              {isSwitchingPlan && selectedPlan
                ? `What you get on ${selectedPlan.label}`
                : 'Your Platinum perks'}
            </h3>
            <ul className="platinum-upgrade__features platinum-manage__features">
              {features.map((feature) => (
                <li key={feature.id} className="platinum-upgrade__feature">
                  <span className="platinum-upgrade__feature-icon">
                    <PlatinumFeatureIcon id={feature.id} />
                  </span>
                  <div className="platinum-upgrade__feature-text">
                    <strong>{feature.title}</strong>
                    <span>{feature.description}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {status?.activeCheckout && !status.activeCheckout.cancelAtPeriodEnd ? (
          <div className="platinum-manage__section platinum-manage__section--cancel">
            {!showCancelConfirm ? (
              <button
                type="button"
                className="platinum-manage__cancel-btn"
                onClick={() => setShowCancelConfirm(true)}
              >
                Cancel subscription
              </button>
            ) : (
              <div className="platinum-manage__confirm">
                <p className="platinum-manage__confirm-copy">
                  You will keep Platinum until{' '}
                  <strong>{formatExpiry(status.premiumExpiresAt)}</strong>. We will email you a
                  reminder that your subscription is about to end.
                </p>
                <div className="platinum-manage__confirm-actions">
                  <button
                    type="button"
                    className="platinum-manage__confirm-no"
                    onClick={() => setShowCancelConfirm(false)}
                    disabled={isCancelling}
                  >
                    Keep Platinum
                  </button>
                  <button
                    type="button"
                    className="platinum-manage__confirm-yes"
                    onClick={() => void handleCancel()}
                    disabled={isCancelling}
                  >
                    {isCancelling ? 'Cancelling…' : 'Yes, cancel'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </ProfileSheet>
  );
}
