/**
 * Flutterwave API functions for mobile app
 * Handles NGN wallet balance and send operations to Nigerian bank accounts
 */

import { Platform } from "react-native";

// Use the same base URL as the main api config
// IMPORTANT: Set EXPO_PUBLIC_API_URL in your environment, or update this fallback to your actual backend URL
export const API_BASE_URL =
  Platform.OS === 'android'
    ? process.env.EXPO_PUBLIC_API_BASE_URL_ANDROID || 'http://10.0.2.2:5000/api'
    : process.env.EXPO_PUBLIC_API_BASE_URL_IOS || 'http://127.0.0.1:5000/api';

export type Bank = {
  code: string;
  name: string;
};

export type VerifyAccountResponse = {
  success: boolean;
  accountName?: string;
  accountNumber?: string;
  message?: string;
};

export type SendNGNRequest = {
  phone: string;
  amount: number;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  accountName: string;
  narration?: string;
};

export type SendNGNResponse = {
  success: boolean;
  message?: string;
  newBalance?: number;
  payout?: {
    id: string;
    flwReference: string;
    amount: number;
    recipientName: string;
    recipientBank: string;
    status: string;
  };
};

export type FlutterwaveTransaction = {
  id: string;
  flwReference: string;
  currency: string;
  amount: number;
  recipientName: string;
  recipientBankName: string;
  recipientAccountNumber: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
};

/**
 * Get list of Nigerian banks from Flutterwave
 */
export async function getNigerianBanks(): Promise<Bank[]> {
  try {
    const url = `${API_BASE_URL}/flutterwave/banks/ng`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const status = response.status;
    const contentType = response.headers.get('content-type') || '';
    const raw = await response.text();

    if (!response.ok) {
      console.error('[Flutterwave Banks] Non-OK response:', status, raw?.slice(0, 300));
      return [];
    }

    const parsed = (() => {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    })();

    if (!parsed || typeof parsed !== 'object') {
      console.error('[Flutterwave Banks] Non-JSON response:', contentType, raw?.slice(0, 300));
      return [];
    }

    // Some backends return { success, banks }, others return { success, data: [...] }
    if (typeof (parsed as any).success === 'boolean' && !(parsed as any).success) {
      console.error('[Flutterwave Banks] Backend returned success=false:', parsed);
      return [];
    }

    const banksRaw: any[] = Array.isArray((parsed as any).banks)
      ? (parsed as any).banks
      : Array.isArray((parsed as any).data)
      ? (parsed as any).data
      : Array.isArray((parsed as any).data?.banks)
      ? (parsed as any).data.banks
      : [];

    const banks = banksRaw
      .map((b: any) => ({
        code: String(b?.code ?? b?.bank_code ?? b?.bankCode ?? '').trim(),
        name: String(b?.name ?? b?.bank_name ?? b?.bankName ?? '').trim(),
      }))
      .filter((b: Bank) => Boolean(b.code) && Boolean(b.name));

    if (banks.length === 0) {
      console.warn('[Flutterwave Banks] Empty bank list from backend:', parsed);
    }

    return banks;
  } catch (error) {
    console.error('Failed to fetch Nigerian banks:', error);
    return [];
  }
}

/**
 * Verify a Nigerian bank account
 */
export async function verifyBankAccount(
  accountNumber: string,
  bankCode: string
): Promise<VerifyAccountResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/flutterwave/verify-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account_number: accountNumber,
        bank_code: bankCode,
      }),
    });
    
    return await response.json();
  } catch (error) {
    console.error('Failed to verify bank account:', error);
    return {
      success: false,
      message: 'Failed to verify account. Please try again.',
    };
  }
}

export type NGNBalanceResponse = {
  success: boolean;
  balance: number;
  currency?: string;
  message?: string;
};

/**
 * Get user's NGN wallet balance from local ledger
 */
export async function getNGNBalance(phone: string): Promise<NGNBalanceResponse> {
  try {
    const encodedPhone = encodeURIComponent(phone);
    const response = await fetch(
      `${API_BASE_URL}/flutterwave/user/balance/NGN?phone=${encodedPhone}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const contentType = response.headers.get('content-type') || '';
    const status = response.status;

    // Read once; never call response.json() to avoid RN "Unexpected character: <" crashes
    const raw = await response.text();

    if (!response.ok) {
      console.error('[NGN Balance] Non-OK response:', status, raw?.slice(0, 300));
      return {
        success: false,
        balance: 0,
        message: `Failed to fetch balance (HTTP ${status})`,
      };
    }

    // If server lies about content-type (or returns HTML), parsing will fail and we'll return a clean error.
    const parsed = (() => {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    })();

    if (!parsed || typeof parsed !== 'object') {
      console.error('[NGN Balance] Non-JSON response:', contentType, raw?.slice(0, 300));
      return {
        success: false,
        balance: 0,
        message: 'Unexpected server response while fetching balance. Check API URL.',
      };
    }

    console.log('[NGN Balance] Response:', parsed);

    return {
      success: (parsed as any).success || false,
      balance: (parsed as any).balance || 0,
      currency: (parsed as any).currency,
      message: (parsed as any).message,
    };
  } catch (error) {
    console.error('Failed to fetch NGN balance:', error);
    return {
      success: false,
      balance: 0,
      message: 'Failed to fetch balance',
    };
  }
}


/**
 * Send NGN to any Nigerian bank account
 */
export async function sendNGN(request: SendNGNRequest): Promise<SendNGNResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/flutterwave/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: request.phone,
        amount: request.amount,
        account_number: request.accountNumber,
        bank_code: request.bankCode,
        bank_name: request.bankName,
        account_name: request.accountName,
        narration: request.narration || 'Transfer',
      }),
    });
    
    return await response.json();
  } catch (error) {
    console.error('Failed to send NGN:', error);
    return {
      success: false,
      message: 'Failed to send money. Please try again.',
    };
  }
}

export type FlutterwaveTransactionsResponse = {
  success: boolean;
  transactions: FlutterwaveTransaction[];
  message?: string;
};

/**
 * Get user's Flutterwave transaction history
 */
export async function getFlutterwaveTransactions(
  phone: string
): Promise<FlutterwaveTransactionsResponse> {
  try {
    const encodedPhone = encodeURIComponent(phone);
    const response = await fetch(
      `${API_BASE_URL}/flutterwave/user/transactions?phone=${encodedPhone}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const contentType = response.headers.get('content-type') || '';
    const status = response.status;

    // Read once; never call response.json() to avoid RN "Unexpected character: <" crashes
    const raw = await response.text();

    if (!response.ok) {
      console.error(
        '[Flutterwave Transactions] Non-OK response:',
        status,
        raw?.slice(0, 300)
      );
      return {
        success: false,
        transactions: [],
        message: `Failed to fetch transactions (HTTP ${status})`,
      };
    }

    const parsed = (() => {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    })();

    if (!parsed || typeof parsed !== 'object') {
      console.error(
        '[Flutterwave Transactions] Non-JSON response:',
        contentType,
        raw?.slice(0, 300)
      );
      return {
        success: false,
        transactions: [],
        message: 'Unexpected server response while fetching transactions. Check API URL.',
      };
    }

    console.log('[Flutterwave Transactions] Response:', parsed);

    return {
      success: (parsed as any).success || false,
      transactions: Array.isArray((parsed as any).transactions)
        ? (parsed as any).transactions
        : [],
      message: (parsed as any).message,
    };
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    return {
      success: false,
      transactions: [],
      message: 'Failed to fetch transactions',
    };
  }
}
