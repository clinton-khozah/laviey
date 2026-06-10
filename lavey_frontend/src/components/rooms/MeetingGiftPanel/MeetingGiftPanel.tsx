import { useEffect, useRef, useState } from 'react';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
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
  onClose,
  onAmountChange,
  onSendGift,
}: MeetingGiftPanelProps) {
  const firstName = recipientName.trim().split(' ')[0] || 'them';
  const [customOpen, setCustomOpen] = useState(false);
  const customInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) setCustomOpen(false);
  }, [open]);

  useEffect(() => {
    if (customOpen) customInputRef.current?.focus();
  }, [customOpen]);

  const isPreset = (GIFT_AMOUNT_PRESETS as readonly number[]).includes(amount);

  const handleCustomAmount = (value: string) => {
    const n = parseInt(value, 10);
    if (!Number.isNaN(n)) {
      onAmountChange(Math.min(MAX_GIFT_AMOUNT, Math.max(MIN_GIFT_AMOUNT, n)));
    } else if (value === '') {
      onAmountChange(MIN_GIFT_AMOUNT);
    }
  };

  const selectPreset = (preset: number) => {
    setCustomOpen(false);
    onAmountChange(preset);
  };

  return (
    <ProfileSheet
      open={open}
      title={`Gift ${firstName}`}
      onClose={onClose}
      fromTop
      hideHandle
    >
      <div className="meeting-gift-sheet">
        <div className="meeting-gift-sheet__hero">
          <div className="meeting-gift-sheet__icon-wrap">
            <GiftIcon />
          </div>
          <p className="meeting-gift-sheet__lead">Send a tip during your meetup</p>
        </div>

        <div className="meeting-gift-sheet__amounts" role="group" aria-label="Gift amount">
          {GIFT_AMOUNT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`meeting-gift-sheet__chip ${
                !customOpen && amount === preset ? 'meeting-gift-sheet__chip--active' : ''
              }`}
              onClick={() => selectPreset(preset)}
              aria-pressed={!customOpen && amount === preset}
            >
              ${preset}
            </button>
          ))}
        </div>

        {!customOpen ? (
          <button
            type="button"
            className="meeting-gift-sheet__customize-btn"
            onClick={() => setCustomOpen(true)}
          >
            Customize amount
          </button>
        ) : (
          <div className="meeting-gift-sheet__custom">
            <div className="meeting-gift-sheet__custom-head">
              <span className="meeting-gift-sheet__custom-label">Custom amount</span>
              <button
                type="button"
                className="meeting-gift-sheet__custom-close"
                onClick={() => setCustomOpen(false)}
              >
                Use presets
              </button>
            </div>
            <div className="meeting-gift-sheet__custom-field">
              <span className="meeting-gift-sheet__custom-prefix" aria-hidden>
                $
              </span>
              <input
                ref={customInputRef}
                type="number"
                min={MIN_GIFT_AMOUNT}
                max={MAX_GIFT_AMOUNT}
                value={amount}
                onChange={(e) => handleCustomAmount(e.target.value)}
                aria-label="Custom gift amount in dollars"
              />
            </div>
            {!isPreset && (
              <p className="meeting-gift-sheet__custom-hint">Sending ${amount}</p>
            )}
          </div>
        )}

        {sessionTotal > 0 && (
          <div className="meeting-gift-sheet__sent-banner" role="status">
            <span className="meeting-gift-sheet__sent-dot" aria-hidden />
            <span>
              <strong>${sessionTotal}</strong> sent this meetup
            </span>
          </div>
        )}

        <button
          type="button"
          className="meeting-gift-sheet__send"
          onClick={() => void onSendGift()}
          disabled={isSending}
        >
          <GiftIcon />
          {isSending ? 'Sending…' : `Send $${amount} gift`}
        </button>
      </div>
    </ProfileSheet>
  );
}

export { GiftIcon };
