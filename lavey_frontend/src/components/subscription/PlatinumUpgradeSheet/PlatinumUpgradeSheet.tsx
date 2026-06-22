import { useEffect, useMemo, useState } from 'react';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { SheetSaveSuccess } from '@/components/profile/SheetSaveSuccess';
import { usePlatinumCatalog } from '@/hooks/subscription/usePlatinumCatalog';
import type { PlatinumPlan } from '@/types';
import { applyPriceDiscount } from '@/utils/subscription/platinumPricing';
import './PlatinumUpgradeSheet.css';

interface PlatinumUpgradeSheetProps {
  open: boolean;
  onClose: () => void;
  onSubscribe?: () => void;
  /** When set, show an Apply button before discounted prices appear (e.g. Lavey promo). */
  promoDiscountPercent?: number;
}

function discountedPlanPrice(plan: PlatinumPlan, percentOff: number): string {
  return applyPriceDiscount(plan.price, percentOff);
}

function PriceWithDiscount({
  original,
  discounted,
  showDiscount,
  className = 'platinum-upgrade__plan-price',
  wasClassName = 'platinum-upgrade__price-was',
}: {
  original: string;
  discounted: string;
  showDiscount: boolean;
  className?: string;
  wasClassName?: string;
}) {
  if (!showDiscount || discounted === original) {
    return <span className={className}>{original}</span>;
  }

  return (
    <span className="platinum-upgrade__price-stack">
      <span className={wasClassName}>{original}</span>
      <span className={className}>{discounted}</span>
    </span>
  );
}

function FeatureIcon({ id }: { id: string }) {
  switch (id) {
    case 'likes':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      );
    case 'crushes':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.39 13.5.67z" />
        </svg>
      );
    case 'views':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'filters':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 6h16M6 12h12M8 18h8" />
        </svg>
      );
    case 'ai':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 2a4 4 0 014 4v1h2a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2V6a4 4 0 014-4z" />
          <path d="M9 14h6M10 11h4" />
        </svg>
      );
    case 'spotlight':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z" />
        </svg>
      );
    case 'ecoffee':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
          <path d="M6 1v3M10 1v3M14 1v3" />
        </svg>
      );
    case 'rewind':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z" />
        </svg>
      );
  }
}

export function PlatinumUpgradeSheet({
  open,
  onClose,
  onSubscribe,
  promoDiscountPercent,
}: PlatinumUpgradeSheetProps) {
  const { catalog, isLoading, error, reload } = usePlatinumCatalog(open);
  const [planId, setPlanId] = useState<string | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribeSuccess, setSubscribeSuccess] = useState(false);
  const [discountApplied, setDiscountApplied] = useState(false);

  const hasPromo = Boolean(promoDiscountPercent && promoDiscountPercent > 0);
  const showDiscountedPrices = hasPromo && discountApplied;

  useEffect(() => {
    if (!open) {
      setIsSubscribing(false);
      setSubscribeSuccess(false);
      setPlanId(null);
      setDiscountApplied(false);
    }
  }, [open]);

  useEffect(() => {
    if (!catalog) return;
    setPlanId((current) => {
      if (current && catalog.plans.some((plan) => plan.id === current)) return current;
      return catalog.defaultPlanId;
    });
  }, [catalog]);

  const plan = useMemo(
    () => catalog?.plans.find((item) => item.id === planId) ?? catalog?.plans[0],
    [catalog, planId],
  );

  const selectedPrice = useMemo(() => {
    if (!plan) return '';
    if (!showDiscountedPrices || !promoDiscountPercent) return plan.price;
    return discountedPlanPrice(plan, promoDiscountPercent);
  }, [plan, promoDiscountPercent, showDiscountedPrices]);

  const handleSubscribe = () => {
    setIsSubscribing(true);
    window.setTimeout(() => {
      setIsSubscribing(false);
      setSubscribeSuccess(true);
      if (onSubscribe) onSubscribe();
    }, 650);
  };

  const handleSuccessDone = () => {
    setSubscribeSuccess(false);
    onClose();
  };

  return (
    <ProfileSheet
      open={open}
      title={catalog?.sheetTitle ?? 'Platinum'}
      onClose={onClose}
      fromTop
      hideHandle
    >
      {subscribeSuccess ? (
        <SheetSaveSuccess action="platinum" onComplete={handleSuccessDone} />
      ) : isLoading && !catalog ? (
        <p className="platinum-upgrade__status">Loading Platinum offers…</p>
      ) : error && !catalog ? (
        <div className="platinum-upgrade__status">
          <p>{error}</p>
          <button type="button" className="profile-sheet__btn profile-sheet__btn--secondary" onClick={() => void reload()}>
            Try again
          </button>
        </div>
      ) : catalog && plan ? (
        <div className="platinum-upgrade platinum-upgrade--compact">
          <div className="platinum-upgrade__hero">
            {plan.badge && <span className="platinum-upgrade__badge">{plan.badge}</span>}
            <span className="platinum-upgrade__star" aria-hidden>
              {catalog.starEmoji}
            </span>
            <h2 className="platinum-upgrade__title">{catalog.heroTitle}</h2>
            <p className="platinum-upgrade__tagline">{catalog.heroTagline}</p>
            <p className="platinum-upgrade__price">
              <PriceWithDiscount
                original={plan.price}
                discounted={
                  promoDiscountPercent
                    ? discountedPlanPrice(plan, promoDiscountPercent)
                    : plan.price
                }
                showDiscount={showDiscountedPrices}
                className="platinum-upgrade__price-current"
                wasClassName="platinum-upgrade__price-was platinum-upgrade__price-was--hero"
              />
              <span className="platinum-upgrade__price-period"> {plan.period}</span>
            </p>
          </div>

          {hasPromo && !discountApplied ? (
            <button
              type="button"
              className="platinum-upgrade__apply-discount"
              onClick={() => setDiscountApplied(true)}
            >
              Apply {promoDiscountPercent}% off
            </button>
          ) : null}

          {showDiscountedPrices ? (
            <p className="platinum-upgrade__discount-applied" role="status">
              {promoDiscountPercent}% off applied
            </p>
          ) : null}

          <div className="platinum-upgrade__plans" role="radiogroup" aria-label="Choose a plan">
            {catalog.plans.map((option) => {
              const selected = option.id === planId;
              const discounted = promoDiscountPercent
                ? discountedPlanPrice(option, promoDiscountPercent)
                : option.price;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`platinum-upgrade__plan ${selected ? 'platinum-upgrade__plan--active' : ''} ${option.popular ? 'platinum-upgrade__plan--popular' : ''}`}
                  onClick={() => setPlanId(option.id)}
                >
                  <span className="platinum-upgrade__plan-label">{option.label}</span>
                  <PriceWithDiscount
                    original={option.price}
                    discounted={discounted}
                    showDiscount={showDiscountedPrices}
                  />
                  <span className="platinum-upgrade__plan-period">{option.period}</span>
                </button>
              );
            })}
          </div>

          <ul className="platinum-upgrade__features">
            {catalog.features.map((feature) => (
              <li key={feature.id} className="platinum-upgrade__feature">
                <span className="platinum-upgrade__feature-icon">
                  <FeatureIcon id={feature.id} />
                </span>
                <div className="platinum-upgrade__feature-text">
                  <strong>{feature.title}</strong>
                  <span>{feature.description}</span>
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="platinum-upgrade__cta"
            disabled={isSubscribing}
            onClick={handleSubscribe}
          >
            {isSubscribing
              ? 'Processing…'
              : `Start Platinum — ${selectedPrice}${plan.id === 'day' ? '' : plan.period}`}
          </button>
          <p className="platinum-upgrade__fine-print">
            {plan.id === 'day' ? catalog.oneTimeFinePrint : catalog.recurringFinePrint}
          </p>
        </div>
      ) : null}
    </ProfileSheet>
  );
}
