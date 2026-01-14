import { Platform } from "react-native";

// Use the same base URL as the main api config
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
 * Currency to country code mapping for Flutterwave-supported countries
 */
export const CURRENCY_TO_COUNTRY: Record<string, string> = {
  NGN: 'NG',
  KES: 'KE',
  GHS: 'GH',
  TZS: 'TZ',
  UGX: 'UG',
  ZAR: 'ZA',
  XOF: 'SN',
  XAF: 'CM',
  ZMW: 'ZM',
  MWK: 'MW',
  SLL: 'SL',
  RWF: 'RW',
  ETB: 'ET',
  EGP: 'EG',
};

/**
 * Country names for display
 */
export const COUNTRY_NAMES: Record<string, string> = {
  NG: "Nigeria",
  KE: "Kenya",
  GH: "Ghana",
  TZ: "Tanzania",
  UG: "Uganda",
  ZA: "South Africa",
  SN: "Senegal",
  CM: "Cameroon",
  ZM: "Zambia",
  MW: "Malawi",
  SL: "Sierra Leone",
  RW: "Rwanda",
  ET: "Ethiopia",
  EG: "Egypt",
};

/**
 * Get currency symbol
 */
export const getCurrencySymbol = (code: string): string => {
  const symbols: Record<string, string> = {
    NGN: "₦",
    GHS: "₵",
    KES: "KSh",
    UGX: "USh",
    TZS: "TSh",
    ZAR: "R",
    RWF: "FRw",
    XOF: "CFA",
    XAF: "FCFA",
    ZMW: "ZK",
    MWK: "MK",
    SLL: "Le",
    ETB: "Br",
    EGP: "E£",
    CAD: "$",
    USD: "$",
  };
  return symbols[code] || code;
};

/**
 * Check if a currency is supported by Flutterwave
 */
export function isFlutterwaveCurrency(currencyCode: string): boolean {
  return currencyCode in CURRENCY_TO_COUNTRY;
}

/**
 * Get country code from currency code
 */
export function getCountryFromCurrency(currencyCode: string): string | null {
  return CURRENCY_TO_COUNTRY[currencyCode] || null;
}

/**
 * Get list of banks for any Flutterwave-supported country
 * @param countryCode - Two-letter country code (e.g., 'NG', 'KE', 'GH')
 */
export async function getBanksByCountry(countryCode: string): Promise<Bank[]> {
  try {
    const url = `${API_BASE_URL}/flutterwave/banks/${countryCode.toUpperCase()}`;

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
      console.error(`[Flutterwave Banks ${countryCode}] Non-OK response:`, status, raw?.slice(0, 300));
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
      console.error(`[Flutterwave Banks ${countryCode}] Non-JSON response:`, contentType, raw?.slice(0, 300));
      return [];
    }

    if (typeof (parsed as any).success === 'boolean' && !(parsed as any).success) {
      console.error(`[Flutterwave Banks ${countryCode}] Backend returned success=false:`, parsed);
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
      console.warn(`[Flutterwave Banks ${countryCode}] Empty bank list from backend:`, parsed);
    }

    return banks;
  } catch (error) {
    console.error(`Failed to fetch banks for ${countryCode}:`, error);
    return [];
  }
}

/**
 * Get list of Nigerian banks from Flutterwave
 * @deprecated Use getBanksByCountry('NG') instead
 */
export async function getNigerianBanks(): Promise<Bank[]> {
  return getBanksByCountry('NG');
}

/**
 * Verify a bank account (currently only supports Nigeria)
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

export type LocalBalanceResponse = {
  success: boolean;
  balance: number;
  currency?: string;
  message?: string;
};

/**
 * Get user's wallet balance from local ledger for any exotic currency
 * @param phone - User's phone number
 * @param currency - Currency code (e.g., 'NGN', 'GHS', 'RWF')
 */
export async function getLocalBalance(phone: string, currency: string): Promise<LocalBalanceResponse> {
  try {
    const encodedPhone = encodeURIComponent(phone);
    const upperCurrency = currency.toUpperCase().trim();
    const response = await fetch(
      `${API_BASE_URL}/flutterwave/user/balance/${upperCurrency}?phone=${encodedPhone}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const contentType = response.headers.get('content-type') || '';
    const status = response.status;
    const raw = await response.text();

    if (!response.ok) {
      console.error(`[${upperCurrency} Balance] Non-OK response:`, status, raw?.slice(0, 300));
      return {
        success: false,
        balance: 0,
        message: `Failed to fetch balance (HTTP ${status})`,
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
      console.error(`[${upperCurrency} Balance] Non-JSON response:`, contentType, raw?.slice(0, 300));
      return {
        success: false,
        balance: 0,
        message: 'Unexpected server response while fetching balance. Check API URL.',
      };
    }

    console.log(`[${upperCurrency} Balance] Response:`, parsed);

    return {
      success: (parsed as any).success || false,
      balance: (parsed as any).balance || 0,
      currency: (parsed as any).currency || upperCurrency,
      message: (parsed as any).message,
    };
  } catch (error) {
    console.error(`Failed to fetch ${currency} balance:`, error);
    return {
      success: false,
      balance: 0,
      message: 'Failed to fetch balance',
    };
  }
}

/**
 * Get user's NGN wallet balance from local ledger
 * @deprecated Use getLocalBalance(phone, 'NGN') instead
 */
export async function getNGNBalance(phone: string): Promise<NGNBalanceResponse> {
  return getLocalBalance(phone, 'NGN');
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

/**
 * Send money to any Flutterwave-supported country
 */
export type SendFlutterwaveRequest = {
  phone: string;
  amount: number;
  currency: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  accountName: string;
  fromCurrency?: string;
  fromAmount?: number;
  narration?: string;
};

export async function sendFlutterwave(request: SendFlutterwaveRequest): Promise<SendNGNResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/flutterwave/send/${request.currency.toLowerCase()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: request.phone,
        amount: request.amount,
        from_currency: request.fromCurrency,
        from_amount: request.fromAmount,
        account_number: request.accountNumber,
        bank_code: request.bankCode,
        bank_name: request.bankName,
        account_name: request.accountName,
        narration: request.narration || 'Transfer',
      }),
    });
    return await response.json();
  } catch (error) {
    console.error(`Failed to send ${request.currency}:`, error);
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
    const raw = await response.text();

    if (!response.ok) {
      console.error('[Flutterwave Transactions] Non-OK response:', status, raw?.slice(0, 300));
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
      console.error('[Flutterwave Transactions] Non-JSON response:', contentType, raw?.slice(0, 300));
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