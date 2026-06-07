import { env, usesBackendAuth } from '@/config/env';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { httpClient } from '@/services/api/httpClient';
import type { ApiResponse } from '@/types';
import {
  loadBankInfo,
  loadPendingWithdrawal,
  maskAccountNumber,
  saveBankInfo,
  setPendingWithdrawal,
} from '@/utils/gift/payoutStorage';
import { getGiftEarnings } from '@/utils/gift/giftEarningsStorage';
import { authService } from '@/services/auth/authService';
import { sleep } from '@/utils/sleep';

export interface PayoutBank {
  id: string;
  name: string;
  logoUrl: string;
  countryCode: string;
}

export interface WithdrawalMethod {
  id: string;
  label: string;
  description: string;
  processingTime: string;
  minAmountUsd: number;
}

export interface PayoutCatalog {
  banks: PayoutBank[];
  methods: WithdrawalMethod[];
}

export interface PayoutAccount {
  methodId: string;
  methodLabel: string;
  bankId: string | null;
  bankName: string | null;
  bankLogoUrl: string | null;
  accountHolder: string;
  accountNumberMask: string;
  accountType: 'checking' | 'savings';
}

export interface GiftWallet {
  totalEarningsUsd: number;
  pendingWithdrawalUsd: number;
  availableUsd: number;
  withdrawEnabled: boolean;
  payoutAccount: PayoutAccount | null;
}

export interface SavePayoutAccountInput {
  methodId: string;
  bankId: string;
  accountHolder: string;
  accountNumber: string;
  accountType?: 'checking' | 'savings';
}

const MOCK_CATALOG: PayoutCatalog = {
  methods: [
    {
      id: 'bank_transfer',
      label: 'Bank transfer',
      description: 'Standard ACH or EFT to your linked account',
      processingTime: '3–5 business days',
      minAmountUsd: 10,
    },
    {
      id: 'instant_eft',
      label: 'Instant EFT',
      description: 'Same-day payout where supported (South Africa)',
      processingTime: 'Same business day',
      minAmountUsd: 10,
    },
  ],
  banks: [
    { id: 'chase', name: 'Chase', logoUrl: '/bank-logos/chase.svg', countryCode: 'US' },
    { id: 'bank-of-america', name: 'Bank of America', logoUrl: '/bank-logos/bank-of-america.svg', countryCode: 'US' },
    { id: 'wells-fargo', name: 'Wells Fargo', logoUrl: '/bank-logos/wells-fargo.svg', countryCode: 'US' },
    { id: 'capitec', name: 'Capitec', logoUrl: '/bank-logos/capitec.svg', countryCode: 'ZA' },
    { id: 'fnb', name: 'FNB', logoUrl: '/bank-logos/fnb.svg', countryCode: 'ZA' },
    { id: 'standard-bank', name: 'Standard Bank', logoUrl: '/bank-logos/standard-bank.svg', countryCode: 'ZA' },
    { id: 'nedbank', name: 'Nedbank', logoUrl: '/bank-logos/nedbank.svg', countryCode: 'ZA' },
    { id: 'absa', name: 'Absa', logoUrl: '/bank-logos/absa.svg', countryCode: 'ZA' },
  ],
};

function usesBackendPayouts(): boolean {
  return usesBackendAuth() && !env.useMockApi;
}

function mockUserId(): string {
  return authService.getStoredSession()?.user?.id ?? 'me';
}

function findBankByName(name: string, catalog: PayoutCatalog): PayoutBank | undefined {
  const normalized = name.trim().toLowerCase();
  return catalog.banks.find((b) => b.name.toLowerCase() === normalized || b.id === normalized);
}

export const payoutService = {
  async getCatalog(): Promise<PayoutCatalog> {
    if (!usesBackendPayouts()) {
      await sleep(120);
      return MOCK_CATALOG;
    }
    const res = await httpClient.get<ApiResponse<PayoutCatalog>>(API_ENDPOINTS.gifts.payoutCatalog);
    return res.data;
  },

  async getWallet(): Promise<GiftWallet> {
    if (!usesBackendPayouts()) {
      await sleep(180);
      const userId = mockUserId();
      const earnings = getGiftEarnings(userId);
      const pending = loadPendingWithdrawal();
      const bank = loadBankInfo();
      const bankMatch = findBankByName(bank.bankName, MOCK_CATALOG);

      let payoutAccount: PayoutAccount | null = null;
      if (bank.accountHolder && bank.bankName && bank.accountNumber.length >= 4) {
        payoutAccount = {
          methodId: 'bank_transfer',
          methodLabel: 'Bank transfer',
          bankId: bankMatch?.id ?? null,
          bankName: bankMatch?.name ?? bank.bankName,
          bankLogoUrl: bankMatch?.logoUrl ?? null,
          accountHolder: bank.accountHolder,
          accountNumberMask: maskAccountNumber(bank.accountNumber),
          accountType: 'checking',
        };
      }

      return {
        totalEarningsUsd: earnings,
        pendingWithdrawalUsd: pending,
        availableUsd: Math.max(0, earnings - pending),
        withdrawEnabled: true,
        payoutAccount,
      };
    }

    const res = await httpClient.get<ApiResponse<GiftWallet>>(API_ENDPOINTS.gifts.wallet);
    return res.data;
  },

  async savePayoutAccount(input: SavePayoutAccountInput): Promise<PayoutAccount> {
    if (!usesBackendPayouts()) {
      await sleep(350);
      const bank = MOCK_CATALOG.banks.find((b) => b.id === input.bankId);
      const method = MOCK_CATALOG.methods.find((m) => m.id === input.methodId);
      saveBankInfo({
        accountHolder: input.accountHolder,
        bankName: bank?.name ?? input.bankId,
        accountNumber: input.accountNumber,
      });
      return {
        methodId: input.methodId,
        methodLabel: method?.label ?? 'Bank transfer',
        bankId: input.bankId,
        bankName: bank?.name ?? null,
        bankLogoUrl: bank?.logoUrl ?? null,
        accountHolder: input.accountHolder,
        accountNumberMask: maskAccountNumber(input.accountNumber),
        accountType: input.accountType ?? 'checking',
      };
    }

    const res = await httpClient.put<ApiResponse<PayoutAccount>>(API_ENDPOINTS.gifts.payoutAccount, {
      body: input,
    });
    return res.data;
  },

  async requestWithdrawal(amountUsd: number): Promise<{
    withdrawalId: string;
    pendingWithdrawalUsd: number;
    availableUsd: number;
  }> {
    if (!usesBackendPayouts()) {
      await sleep(500);
      const wallet = await this.getWallet();
      const nextPending = wallet.pendingWithdrawalUsd + amountUsd;
      setPendingWithdrawal(nextPending);
      return {
        withdrawalId: 'mock',
        pendingWithdrawalUsd: nextPending,
        availableUsd: Math.max(0, wallet.totalEarningsUsd - nextPending),
      };
    }

    const res = await httpClient.post<
      ApiResponse<{ withdrawalId: string; pendingWithdrawalUsd: number; availableUsd: number }>
    >(API_ENDPOINTS.gifts.withdraw, { body: { amountUsd } });
    return res.data;
  },
};
