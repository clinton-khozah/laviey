import { AnimatePresence, motion } from 'framer-motion';
import {
  GIFT_AMOUNT_PRESETS,
  MAX_GIFT_AMOUNT,
  MIN_GIFT_AMOUNT,
} from '@/constants/giftAmounts';
import type { MeetingGiftPanelProps } from './MeetingGiftPanel.types';
import './MeetingGiftPanel.css';

function GiftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M20 12v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8M4 12h16M12 8v13M7.5 8a2.5 2.5 0 010-5C9.5 3 12 5 12 5s2.5-2 4.5-2a2.5 2.5 0 010 5M12 8H7.5" />
    </svg>
  );
}

export function MeetingGiftPanel({
  open,
  recipientName,
  amount,
  sessionTotal,
  isSending,
  bursts,
  onClose,
  onAmountChange,
  onSendGift,
}: MeetingGiftPanelProps) {
  const firstName = recipientName.trim().split(' ')[0] || 'them';

  const handleCustomAmount = (value: string) => {
    const n = parseInt(value, 10);
    if (!Number.isNaN(n)) {
      onAmountChange(Math.min(MAX_GIFT_AMOUNT, Math.max(MIN_GIFT_AMOUNT, n)));
    } else if (value === '') {
      onAmountChange(MIN_GIFT_AMOUNT);
    }
  };

  return (
    <>
      <AnimatePresence>
        {bursts.map((burst, index) => (
          <motion.div
            key={burst.id}
            className="meeting-gift__burst"
            initial={{ opacity: 0, y: 0, scale: 0.8 }}
            animate={{ opacity: 1, y: -48 - index * 20, scale: 1 }}
            exit={{ opacity: 0, y: -80, scale: 1.05 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <span className="meeting-gift__burst-heart" aria-hidden>
              ♥
            </span>
            +${burst.amount}
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            className="meeting-gift__overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              className="meeting-gift__backdrop"
              onClick={onClose}
              aria-label="Close gift panel"
            />
            <motion.div
              className="meeting-gift__panel"
              role="dialog"
              aria-modal="true"
              aria-label="Send a gift"
              initial={{ opacity: 0, y: 20, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="meeting-gift__glow" aria-hidden />

              <button
                type="button"
                className="meeting-gift__close"
                onClick={onClose}
                aria-label="Close"
              >
                ×
              </button>

              <header className="meeting-gift__header">
                <div className="meeting-gift__icon-wrap">
                  <GiftIcon />
                </div>
                <div className="meeting-gift__header-text">
                  <h2 className="meeting-gift__title">
                    Gift <span>{firstName}</span>
                  </h2>
                  <p className="meeting-gift__subtitle">Send a tip during your meetup</p>
                </div>
              </header>

              <div className="meeting-gift__amounts" role="group" aria-label="Gift amount">
                {GIFT_AMOUNT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`meeting-gift__chip ${amount === preset ? 'meeting-gift__chip--active' : ''}`}
                    onClick={() => onAmountChange(preset)}
                    aria-pressed={amount === preset}
                  >
                    <span className="meeting-gift__chip-value">${preset}</span>
                  </button>
                ))}
              </div>

              <label className="meeting-gift__custom">
                <span className="meeting-gift__custom-label">Custom amount</span>
                <div className="meeting-gift__custom-field">
                  <span className="meeting-gift__custom-prefix" aria-hidden>
                    $
                  </span>
                  <input
                    type="number"
                    min={MIN_GIFT_AMOUNT}
                    max={MAX_GIFT_AMOUNT}
                    value={amount}
                    onChange={(e) => handleCustomAmount(e.target.value)}
                    aria-label="Custom gift amount in dollars"
                  />
                </div>
              </label>

              {sessionTotal > 0 && (
                <div className="meeting-gift__sent-banner" role="status">
                  <span className="meeting-gift__sent-dot" aria-hidden />
                  <span>
                    <strong>${sessionTotal}</strong> sent this meetup
                  </span>
                </div>
              )}

              <button
                type="button"
                className="meeting-gift__send"
                onClick={() => void onSendGift()}
                disabled={isSending}
              >
                <GiftIcon />
                {isSending ? 'Sending…' : `Send $${amount} gift`}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export { GiftIcon };
