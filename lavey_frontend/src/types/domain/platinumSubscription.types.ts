export interface PlatinumSubscriptionStatus {
  isPremium: boolean;
  premiumExpiresAt: string | null;
  activeCheckout: {
    planKey: string;
    planLabel: string;
    price: string;
    period: string;
    status: string;
    isRecurring: boolean;
    cancelAtPeriodEnd: boolean;
  } | null;
}

export interface PlatinumCancelResult extends PlatinumSubscriptionStatus {
  emailSent: boolean;
}
