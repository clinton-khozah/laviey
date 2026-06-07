import type { GiftBurst } from '@/hooks/gifts/useMeetingGift';

export interface MeetingGiftPanelProps {
  open: boolean;
  recipientName: string;
  amount: number;
  sessionTotal: number;
  isSending: boolean;
  bursts: GiftBurst[];
  onClose: () => void;
  onAmountChange: (amount: number) => void;
  onSendGift: () => void;
}
