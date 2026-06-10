import { useCallback, useState } from 'react';
import { DEFAULT_GIFT_AMOUNT } from '@/constants/giftAmounts';
import { giftService } from '@/services/gifts/giftService';
import type { SendGiftRequest } from '@/types';
import { playGiftSound } from '@/utils/sounds/playGiftSound';

export interface GiftBurst {
  id: string;
  amount: number;
  recipientName: string;
}

export interface GiftRecipient {
  id: string;
  name: string;
}

interface UseMeetingGiftOptions {
  meetupId: string;
}

export function useMeetingGift({ meetupId }: UseMeetingGiftOptions) {
  const [amount, setAmount] = useState(DEFAULT_GIFT_AMOUNT);
  const [bursts, setBursts] = useState<GiftBurst[]>([]);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [isSending, setIsSending] = useState(false);

  const sendGift = useCallback(
    async (recipient: GiftRecipient) => {
      if (!recipient.id || amount < 1 || isSending) return;

      setIsSending(true);
      const payload: SendGiftRequest = {
        recipientId: recipient.id,
        recipientName: recipient.name,
        amount,
        meetupId,
      };

      try {
        const res = await giftService.sendGift(payload);
        playGiftSound();
        setSessionTotal(res.totalSentThisSession);
        const burstId = `${Date.now()}-${Math.random()}`;
        setBursts((prev) => [
          ...prev,
          { id: burstId, amount: res.amount, recipientName: recipient.name },
        ]);
        window.setTimeout(() => {
          setBursts((prev) => prev.filter((b) => b.id !== burstId));
        }, 2200);
      } finally {
        setIsSending(false);
      }
    },
    [amount, isSending, meetupId],
  );

  return {
    amount,
    setAmount,
    sendGift,
    bursts,
    sessionTotal,
    isSending,
  };
}
