export interface SendGiftRequest {
  recipientId: string;
  recipientName: string;
  amount: number;
  meetupId: string;
}

export interface SendGiftResponse {
  amount: number;
  recipientId: string;
  totalSentThisSession: number;
}
