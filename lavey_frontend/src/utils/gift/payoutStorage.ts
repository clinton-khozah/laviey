export interface PayoutBankInfo {
  accountHolder: string;
  bankName: string;
  accountNumber: string;
}

const BANK_KEY = 'lavey_payout_bank';
const PENDING_KEY = 'lavey_payout_pending';

export function loadBankInfo(): PayoutBankInfo {
  try {
    const raw = localStorage.getItem(BANK_KEY);
    if (!raw) {
      return { accountHolder: '', bankName: '', accountNumber: '' };
    }
    const parsed = JSON.parse(raw) as Partial<PayoutBankInfo>;
    return {
      accountHolder: parsed.accountHolder ?? '',
      bankName: parsed.bankName ?? '',
      accountNumber: parsed.accountNumber ?? '',
    };
  } catch {
    return { accountHolder: '', bankName: '', accountNumber: '' };
  }
}

export function saveBankInfo(info: PayoutBankInfo): void {
  try {
    localStorage.setItem(BANK_KEY, JSON.stringify(info));
  } catch {
    /* ignore */
  }
}

export function loadPendingWithdrawal(): number {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? Math.max(0, parseFloat(raw)) : 0;
  } catch {
    return 0;
  }
}

export function setPendingWithdrawal(amount: number): void {
  try {
    localStorage.setItem(PENDING_KEY, String(amount));
  } catch {
    /* ignore */
  }
}

export function maskAccountNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) return value;
  return `•••• ${digits.slice(-4)}`;
}
