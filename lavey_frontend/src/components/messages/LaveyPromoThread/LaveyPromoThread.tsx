import { useEffect, useState } from 'react';
import { PageScroller } from '@/components/layout/PageScroller';
import { PlatinumUpgradeSheet } from '@/components/subscription/PlatinumUpgradeSheet';
import { AppOverlay } from '@/components/ui/AppOverlay';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { LAVEY_OFFICIAL_PROMO } from '@/constants/laveyOfficial';
import { markLaveyPromoRead } from '@/utils/messages/laveyOfficialConversation';
import './LaveyPromoThread.css';

interface LaveyPromoThreadProps {
  onBack: () => void;
  onRead?: () => void;
}

export function LaveyPromoThread({ onBack, onRead }: LaveyPromoThreadProps) {
  const [platinumOpen, setPlatinumOpen] = useState(false);

  useEffect(() => {
    markLaveyPromoRead();
    onRead?.();
  }, [onRead]);

  return (
    <>
      <AppOverlay>
        <div className="lavey-promo-thread">
          <header className="lavey-promo-thread__header">
            <button
              type="button"
              className="lavey-promo-thread__back"
              onClick={onBack}
              aria-label="Back"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              className="lavey-promo-thread__profile"
              onClick={() => setPlatinumOpen(true)}
            >
              <span className="lavey-promo-thread__avatar" aria-hidden>
                <img src={LAVEY_OFFICIAL_PROMO.logoUrl} alt="" />
              </span>
              <span className="lavey-promo-thread__profile-text">
                <span className="lavey-promo-thread__name-row">
                  <span className="lavey-promo-thread__name">{LAVEY_OFFICIAL_PROMO.name}</span>
                  <VerifiedBadge size="sm" title="Verified official account" />
                </span>
                <span className="lavey-promo-thread__meta">Official · Verified</span>
              </span>
            </button>
          </header>

          <PageScroller className="lavey-promo-thread__scroll">
            <article className="lavey-promo-thread__card">
              <div className="lavey-promo-thread__card-head">
                <span className="lavey-promo-thread__card-avatar" aria-hidden>
                  <img src={LAVEY_OFFICIAL_PROMO.logoUrl} alt="" />
                </span>
                <div className="lavey-promo-thread__card-intro">
                  <p className="lavey-promo-thread__card-from">
                    <strong>{LAVEY_OFFICIAL_PROMO.name}</strong>
                    <VerifiedBadge size="sm" title="Verified" />
                  </p>
                  <p className="lavey-promo-thread__card-headline">{LAVEY_OFFICIAL_PROMO.headline}</p>
                </div>
              </div>

              <button
                type="button"
                className="lavey-promo-thread__hero"
                onClick={() => setPlatinumOpen(true)}
                aria-label={LAVEY_OFFICIAL_PROMO.headline}
              >
                <div className="lavey-promo-thread__hero-art" aria-hidden>
                  <img
                    className="lavey-promo-thread__hero-logo"
                    src={LAVEY_OFFICIAL_PROMO.logoUrl}
                    alt=""
                  />
                  <span className="lavey-promo-thread__hero-discount">
                    {LAVEY_OFFICIAL_PROMO.discountLabel}
                  </span>
                  <span className="lavey-promo-thread__hero-plan">
                    {LAVEY_OFFICIAL_PROMO.planLabel}
                  </span>
                </div>
                <p className="lavey-promo-thread__hero-caption">{LAVEY_OFFICIAL_PROMO.headline}</p>
              </button>

              <p className="lavey-promo-thread__body">{LAVEY_OFFICIAL_PROMO.body}</p>

              <button
                type="button"
                className="lavey-promo-thread__cta"
                onClick={() => setPlatinumOpen(true)}
              >
                {LAVEY_OFFICIAL_PROMO.ctaLabel}
              </button>

              <p className="lavey-promo-thread__fineprint">
                Limited-time offer on Platinum plans. Terms apply.
              </p>
            </article>
          </PageScroller>
        </div>
      </AppOverlay>

      <PlatinumUpgradeSheet
        open={platinumOpen}
        onClose={() => setPlatinumOpen(false)}
        promoDiscountPercent={LAVEY_OFFICIAL_PROMO.discountPercent}
      />
    </>
  );
}
