  open: boolean;
  recipientName: string;
  amount: number;
  sessionTotal: number;
  isSending: boolean;
  onClose: () => void;
  onAmountChange: (amount: number) => void;
  onSendGift: () => void;
}
