const PAYMENT_ID_KEY = 'lavey_payfast_m_payment_id';

export function savePendingPayfastCheckout(mPaymentId: string): void {
  try {
    sessionStorage.setItem(PAYMENT_ID_KEY, mPaymentId);
  } catch {
    // ignore storage failures
  }
}

export function readPendingPayfastCheckout(): string | null {
  try {
    return sessionStorage.getItem(PAYMENT_ID_KEY);
  } catch {
    return null;
  }
}

export function clearPendingPayfastCheckout(): void {
  try {
    sessionStorage.removeItem(PAYMENT_ID_KEY);
  } catch {
    // ignore
  }
}

export function readPayfastReturnParams(): {
  mPaymentId?: string;
  paymentStatus?: string;
  pfPaymentId?: string;
} {
  const params = new URLSearchParams(window.location.search);
  return {
    mPaymentId: params.get('m_payment_id') ?? undefined,
    paymentStatus: params.get('payment_status') ?? undefined,
    pfPaymentId: params.get('pf_payment_id') ?? undefined,
  };
}
