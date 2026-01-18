import { Platform } from "react-native";
import { strictAPICall, TransactionError } from "../utils/networkGuard";

// Use the same base URL as the main api config
export const API_BASE_URL =
  Platform.OS === "android"
    ? process.env.EXPO_PUBLIC_API_BASE_URL_ANDROID || "http://10.0.2.2:5000/api"
    : process.env.EXPO_PUBLIC_API_BASE_URL_IOS || "http://127.0.0.1:5000/api";
/**
 * Currency to country code mapping for Flutterwave-supported countries
 * (Used by recipient screens + UI labels)
 */
export const CURRENCY_TO_COUNTRY: Record<string, string> = {
  NGN: "NG",
  KES: "KE",
  GHS: "GH",
  TZS: "TZ",
  UGX: "UG",
  ZAR: "ZA",
  XOF: "SN",
  XAF: "CM",
  ZMW: "ZM",
  MWK: "MW",
  SLL: "SL",
  RWF: "RW",
  ETB: "ET",
  EGP: "EG",
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
  const c = String(currencyCode || "").toUpperCase().trim();
  return !!CURRENCY_TO_COUNTRY[c];
}

export type Bank = { code: string; name: string };

export type VerifyAccountResponse = {
  success: boolean;
  accountName?: string;
  accountNumber?: string;
  message?: string;
  code?: string;
  isNetworkError?: boolean;
  isTimeoutError?: boolean;
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
  code?: string;
  isNetworkError?: boolean;
  isTimeoutError?: boolean;
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

export type NGNBalanceResponse = {
  success: boolean;
  balance: number;
  currency?: string;
  message?: string;
  code?: string;
  isNetworkError?: boolean;
  isTimeoutError?: boolean;
};

export type LocalBalanceResponse = {
  success: boolean;
  balance: number;
  currency?: string;
  message?: string;
  code?: string;
  isNetworkError?: boolean;
  isTimeoutError?: boolean;
};

export type FlutterwaveTransactionsResponse = {
  success: boolean;
  transactions: FlutterwaveTransaction[];
  message?: string;
  code?: string;
  isNetworkError?: boolean;
  isTimeoutError?: boolean;
};

function mapTxError(err: any, fallbackMsg: string) {
  if (err instanceof TransactionError) {
    return {
      success: false,
      message: err.message,
      code: err.code,
      isNetworkError: err.isNetworkError,
      isTimeoutError: err.isTimeoutError,
    };
  }
  return { success: false, message: fallbackMsg, code: "UNKNOWN_ERROR" };
}

/**
 * Get list of banks for any Flutterwave-supported country
 */
export async function getBanksByCountry(countryCode: string): Promise<Bank[]> {
  try {
    const url = `${API_BASE_URL}/flutterwave/banks/${countryCode.toUpperCase()}`;
    const data = await strictAPICall<any>(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      timeoutMs: 10000,
      context: "Fetch banks",
      validateSuccess: false,
    });

    const banksRaw: any[] = Array.isArray(data?.banks)
      ? data.banks
      : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.data?.banks)
      ? data.data.banks
      : [];

    return banksRaw
      .map((b: any) => ({
        code: String(b?.code ?? b?.bank_code ?? b?.bankCode ?? "").trim(),
        name: String(b?.name ?? b?.bank_name ?? b?.bankName ?? "").trim(),
      }))
      .filter((b: Bank) => Boolean(b.code) && Boolean(b.name));
  } catch (error) {
    console.error(`Failed to fetch banks for ${countryCode}:`, error);
    return [];
  }
}

export async function getNigerianBanks(): Promise<Bank[]> {
  return getBanksByCountry("NG");
}

/**
 * Verify a bank account (currently only supports Nigeria)
 */
export async function verifyBankAccount(
  accountNumber: string,
  bankCode: string
): Promise<VerifyAccountResponse> {
  try {
    const data = await strictAPICall<any>(`${API_BASE_URL}/flutterwave/verify-account`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account_number: accountNumber,
        bank_code: bankCode,
      }),
      timeoutMs: 12000,
      context: "Verify bank account",
      validateSuccess: false,
    });

    return {
      success: !!data?.success,
      accountName: data?.accountName ?? data?.account_name,
      accountNumber: data?.accountNumber ?? data?.account_number,
      message: data?.message,
    };
  } catch (err) {
    return mapTxError(err, "Failed to verify account. Please try again.");
  }
}

/**
 * Get user's wallet balance from local ledger for any exotic currency
 */
export async function getLocalBalance(phone: string, currency: string): Promise<LocalBalanceResponse> {
  const encodedPhone = encodeURIComponent(phone);
  const upperCurrency = currency.toUpperCase().trim();
  const url = `${API_BASE_URL}/flutterwave/user/balance/${upperCurrency}?phone=${encodedPhone}`;

  try {
    const data = await strictAPICall<any>(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      timeoutMs: 10000,
      context: `Fetch ${upperCurrency} balance`,
      validateSuccess: false,
    });

    const bal = Number(data?.balance ?? 0);
    return {
      success: !!data?.success,
      balance: Number.isFinite(bal) ? bal : 0,
      currency: data?.currency || upperCurrency,
      message: data?.message,
    };
  } catch (err) {
    const e = mapTxError(err, "Failed to fetch balance");
    return { ...e, balance: 0, currency: upperCurrency };
  }
}

export async function getNGNBalance(phone: string): Promise<NGNBalanceResponse> {
  return getLocalBalance(phone, "NGN");
}

/**
 * Send NGN to any Nigerian bank account
 */
export async function sendNGN(request: SendNGNRequest): Promise<SendNGNResponse> {
  try {
    const data = await strictAPICall<any>(`${API_BASE_URL}/flutterwave/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: request.phone,
        amount: request.amount,
        account_number: request.accountNumber,
        bank_code: request.bankCode,
        bank_name: request.bankName,
        account_name: request.accountName,
        narration: request.narration || "Transfer",
      }),
      timeoutMs: 15000,
      context: "Send NGN transfer",
      validateSuccess: false,
    });

    return data;
  } catch (err) {
    return mapTxError(err, "Failed to send money. Please try again.");
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
    const data = await strictAPICall<any>(
      `${API_BASE_URL}/flutterwave/send/${request.currency.toLowerCase()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: request.phone,
          amount: request.amount,
          from_currency: request.fromCurrency,
          from_amount: request.fromAmount,
          account_number: request.accountNumber,
          bank_code: request.bankCode,
          bank_name: request.bankName,
          account_name: request.accountName,
          narration: request.narration || "Transfer",
        }),
        timeoutMs: 15000,
        context: `Send ${request.currency} transfer`,
        validateSuccess: false,
      }
    );

    return data;
  } catch (err) {
    return mapTxError(err, "Failed to send money. Please try again.");
  }
}

/**
 * Get user's Flutterwave transaction history
 */
export async function getFlutterwaveTransactions(phone: string): Promise<FlutterwaveTransactionsResponse> {
  const encodedPhone = encodeURIComponent(phone);
  const url = `${API_BASE_URL}/flutterwave/user/transactions?phone=${encodedPhone}`;

  try {
    const data = await strictAPICall<any>(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      timeoutMs: 10000,
      context: "Fetch Flutterwave transactions",
      validateSuccess: false,
    });

    return {
      success: !!data?.success,
      transactions: Array.isArray(data?.transactions) ? data.transactions : [],
      message: data?.message,
    };
  } catch (err) {
    return { ...mapTxError(err, "Failed to fetch transactions"), transactions: [] };
  }
}
