export interface PayfastCheckoutResponse {
  actionUrl: string;
  fields: Record<string, string>;
  mPaymentId: string;
}

export function submitPayfastCheckout(checkout: PayfastCheckoutResponse): void {
  try {
    sessionStorage.setItem('lavey_payfast_m_payment_id', checkout.mPaymentId);
  } catch {
    // ignore
  }

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = checkout.actionUrl;
  form.style.display = 'none';

  for (const [name, value] of Object.entries(checkout.fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}
