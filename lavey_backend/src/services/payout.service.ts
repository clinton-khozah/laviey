import { createSupabaseUserClient } from '../lib/supabase.user.js';
import { getSupabaseAdmin, isAdminDataSourceReady } from '../lib/supabase.admin.js';
import type { AuthUser } from '../types/api.types.js';
import { AppError } from '../utils/appError.js';

export interface PayoutBankDto {
  id: string;
  name: string;
  logoUrl: string;
  countryCode: string;
}

export interface WithdrawalMethodDto {
  id: string;
  label: string;
  description: string;
  processingTime: string;
  minAmountUsd: number;
}

export interface PayoutCatalogDto {
  banks: PayoutBankDto[];
  methods: WithdrawalMethodDto[];
}

export interface PayoutAccountDto {
  methodId: string;
  methodLabel: string;
  bankId: string | null;
  bankName: string | null;
  bankLogoUrl: string | null;
  accountHolder: string;
  accountNumberMask: string;
  accountType: 'checking' | 'savings';
}

export interface GiftWalletDto {
  totalEarningsUsd: number;
  pendingWithdrawalUsd: number;
  availableUsd: number;
  withdrawEnabled: boolean;
  payoutAccount: PayoutAccountDto | null;
}

function maskAccountNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) return '••••';
  return `•••• ${digits.slice(-4)}`;
}

function isMissingPayoutSchema(message: string): boolean {
  return /payout_banks|withdrawal_methods|user_payout_accounts|gift_withdrawals/i.test(message);
}

export async function getPayoutCatalog(): Promise<PayoutCatalogDto> {
  const { supabase } = await import('../lib/supabase.js');

  const [banksResult, methodsResult] = await Promise.all([
    supabase
      .from('payout_banks')
      .select('id, name, logo_url, country_code')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('withdrawal_methods')
      .select('id, label, description, processing_time, min_amount_cents')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ]);

  if (banksResult.error || methodsResult.error) {
    const message = banksResult.error?.message ?? methodsResult.error?.message ?? 'Catalog read failed';
    if (isMissingPayoutSchema(message)) {
      throw new AppError(
        500,
        'PAYOUT_SCHEMA_MISSING',
        'Payout tables are missing. Run sql/019_gift_payouts.sql in Supabase.',
      );
    }
    throw new AppError(500, 'PAYOUT_CATALOG_FAILED', message);
  }

  return {
    banks: ((banksResult.data ?? []) as Array<{
      id: string;
      name: string;
      logo_url: string;
      country_code: string;
    }>).map((row) => ({
      id: row.id,
      name: row.name,
      logoUrl: row.logo_url,
      countryCode: row.country_code,
    })),
    methods: ((methodsResult.data ?? []) as Array<{
      id: string;
      label: string;
      description: string;
      processing_time: string;
      min_amount_cents: number;
    }>).map((row) => ({
      id: row.id,
      label: row.label,
      description: row.description,
      processingTime: row.processing_time,
      minAmountUsd: row.min_amount_cents / 100,
    })),
  };
}

async function getPendingWithdrawalCents(
  supabase: ReturnType<typeof createSupabaseUserClient>,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('gift_withdrawals')
    .select('amount_cents')
    .eq('user_id', userId)
    .in('status', ['pending', 'processing']);

  if (error) {
    if (isMissingPayoutSchema(error.message)) return 0;
    throw new AppError(500, 'PAYOUT_PENDING_READ_FAILED', error.message);
  }

  return ((data ?? []) as Array<{ amount_cents: number }>).reduce(
    (sum, row) => sum + row.amount_cents,
    0,
  );
}

export async function getGiftWallet(authUser: AuthUser, accessToken: string): Promise<GiftWalletDto> {
  const supabase = createSupabaseUserClient(accessToken);

  const [statsResult, profileResult, accountResult, pendingCents] = await Promise.all([
    supabase.from('profile_stats').select('gift_earnings_cents').eq('user_id', authUser.id).maybeSingle(),
    supabase.from('profiles').select('gift_withdraw_enabled').eq('user_id', authUser.id).maybeSingle(),
    supabase
      .from('user_payout_accounts')
      .select(
        'withdrawal_method_id, payout_bank_id, account_holder, account_number, account_type, withdrawal_methods(label), payout_banks(name, logo_url)',
      )
      .eq('user_id', authUser.id)
      .maybeSingle(),
    getPendingWithdrawalCents(supabase, authUser.id),
  ]);

  if (statsResult.error) {
    throw new AppError(500, 'PAYOUT_BALANCE_FAILED', statsResult.error.message);
  }

  const earningsCents = (statsResult.data as { gift_earnings_cents: number } | null)?.gift_earnings_cents ?? 0;
  const withdrawEnabled =
    (profileResult.data as { gift_withdraw_enabled: boolean } | null)?.gift_withdraw_enabled ?? true;

  let payoutAccount: PayoutAccountDto | null = null;

  if (accountResult.data && !accountResult.error) {
    const row = accountResult.data as {
      withdrawal_method_id: string;
      payout_bank_id: string | null;
      account_holder: string;
      account_number: string;
      account_type: 'checking' | 'savings';
      withdrawal_methods: { label: string } | { label: string }[] | null;
      payout_banks: { name: string; logo_url: string } | { name: string; logo_url: string }[] | null;
    };

    const method = Array.isArray(row.withdrawal_methods)
      ? row.withdrawal_methods[0]
      : row.withdrawal_methods;
    const bank = Array.isArray(row.payout_banks) ? row.payout_banks[0] : row.payout_banks;

    payoutAccount = {
      methodId: row.withdrawal_method_id,
      methodLabel: method?.label ?? 'Bank transfer',
      bankId: row.payout_bank_id,
      bankName: bank?.name ?? null,
      bankLogoUrl: bank?.logo_url ?? null,
      accountHolder: row.account_holder,
      accountNumberMask: maskAccountNumber(row.account_number),
      accountType: row.account_type,
    };
  }

  const availableCents = Math.max(0, earningsCents - pendingCents);

  return {
    totalEarningsUsd: earningsCents / 100,
    pendingWithdrawalUsd: pendingCents / 100,
    availableUsd: availableCents / 100,
    withdrawEnabled,
    payoutAccount,
  };
}

export async function savePayoutAccount(
  authUser: AuthUser,
  accessToken: string,
  input: {
    methodId: string;
    bankId: string;
    accountHolder: string;
    accountNumber: string;
    accountType?: 'checking' | 'savings';
  },
): Promise<PayoutAccountDto> {
  const accountHolder = input.accountHolder.trim();
  const accountNumber = input.accountNumber.replace(/\s/g, '').trim();

  if (!accountHolder) throw new AppError(400, 'ACCOUNT_HOLDER_REQUIRED', 'Account holder name is required');
  if (accountNumber.length < 4) {
    throw new AppError(400, 'ACCOUNT_NUMBER_INVALID', 'Enter a valid account number');
  }

  const supabase = createSupabaseUserClient(accessToken);

  const [methodCheck, bankCheck] = await Promise.all([
    supabase.from('withdrawal_methods').select('id, label').eq('id', input.methodId).eq('is_active', true).maybeSingle(),
    supabase.from('payout_banks').select('id, name, logo_url').eq('id', input.bankId).eq('is_active', true).maybeSingle(),
  ]);

  if (!methodCheck.data) throw new AppError(400, 'WITHDRAWAL_METHOD_INVALID', 'Invalid withdrawal method');
  if (!bankCheck.data) throw new AppError(400, 'PAYOUT_BANK_INVALID', 'Select a supported bank');

  const bank = bankCheck.data as { id: string; name: string; logo_url: string };
  const method = methodCheck.data as { id: string; label: string };

  const { error } = await supabase.from('user_payout_accounts').upsert(
    {
      user_id: authUser.id,
      withdrawal_method_id: input.methodId,
      payout_bank_id: input.bankId,
      account_holder: accountHolder,
      account_number: accountNumber,
      account_type: input.accountType ?? 'checking',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    throw new AppError(500, 'PAYOUT_ACCOUNT_SAVE_FAILED', error.message);
  }

  return {
    methodId: method.id,
    methodLabel: method.label,
    bankId: bank.id,
    bankName: bank.name,
    bankLogoUrl: bank.logo_url,
    accountHolder,
    accountNumberMask: maskAccountNumber(accountNumber),
    accountType: input.accountType ?? 'checking',
  };
}

export async function requestGiftWithdrawal(
  authUser: AuthUser,
  accessToken: string,
  amountUsd: number,
): Promise<{ withdrawalId: string; pendingWithdrawalUsd: number; availableUsd: number }> {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    throw new AppError(400, 'WITHDRAW_AMOUNT_INVALID', 'Enter a valid withdrawal amount');
  }

  const amountCents = Math.round(amountUsd * 100);
  const supabase = createSupabaseUserClient(accessToken);
  const wallet = await getGiftWallet(authUser, accessToken);

  if (!wallet.withdrawEnabled) {
    throw new AppError(403, 'WITHDRAW_DISABLED', 'Withdrawals are disabled on your account. Contact support.');
  }

  if (!wallet.payoutAccount) {
    throw new AppError(400, 'PAYOUT_ACCOUNT_REQUIRED', 'Save your bank details before withdrawing');
  }

  const catalog = await getPayoutCatalog();
  const method = catalog.methods.find((m) => m.id === wallet.payoutAccount!.methodId) ?? catalog.methods[0];
  const minCents = Math.round((method?.minAmountUsd ?? 10) * 100);

  if (amountCents < minCents) {
    throw new AppError(400, 'WITHDRAW_MIN_NOT_MET', `Minimum withdrawal is $${(minCents / 100).toFixed(2)}`);
  }

  if (amountCents > Math.round(wallet.availableUsd * 100)) {
    throw new AppError(400, 'WITHDRAW_INSUFFICIENT_FUNDS', `You can withdraw up to $${wallet.availableUsd.toFixed(2)}`);
  }

  const { data, error } = await supabase
    .from('gift_withdrawals')
    .insert({
      user_id: authUser.id,
      withdrawal_method_id: wallet.payoutAccount.methodId,
      payout_bank_id: wallet.payoutAccount.bankId,
      amount_cents: amountCents,
      status: 'pending',
      account_mask: wallet.payoutAccount.accountNumberMask,
    })
    .select('id')
    .single();

  if (error) {
    throw new AppError(500, 'WITHDRAW_REQUEST_FAILED', error.message);
  }

  const updatedWallet = await getGiftWallet(authUser, accessToken);

  return {
    withdrawalId: (data as { id: string }).id,
    pendingWithdrawalUsd: updatedWallet.pendingWithdrawalUsd,
    availableUsd: updatedWallet.availableUsd,
  };
}

export async function setGiftWithdrawEnabled(userId: string, enabled: boolean): Promise<void> {
  if (!isAdminDataSourceReady()) {
    throw new AppError(503, 'ADMIN_DATA_UNAVAILABLE', 'Admin data source is not configured');
  }
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from('profiles')
    .update({ gift_withdraw_enabled: enabled })
    .eq('user_id', userId);
  if (error) throw new AppError(500, 'WITHDRAW_TOGGLE_FAILED', error.message);
}
