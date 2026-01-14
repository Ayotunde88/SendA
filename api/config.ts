// api/config.ts

import { Platform } from "react-native";

export const API_BASE_URL =
  Platform.OS === "android"
    ? process.env.EXPO_PUBLIC_API_BASE_URL_ANDROID
    : process.env.EXPO_PUBLIC_API_BASE_URL_IOS;

export const api = {
  sendOtp: async (phone: string, brand = "MoneyFlow") => {
    const res = await fetch(`${API_BASE_URL}/otp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, brand }),
    });
    return res.json();
  },

  verifyOtp: async (requestId: string, code: string) => {
    const res = await fetch(`${API_BASE_URL}/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: requestId, code }),
    });
    return res.json();
  },
};

// ============ PLAID IDENTITY VERIFICATION ============

/**
 * Create Plaid Identity Verification session
 * Backend fetches user data by phone/email and creates the IDV session
 */
export async function createPlaidIdvSession(params: {
  phone?: string;
  email?: string;
}): Promise<{
  success: boolean;
  link_token?: string;
  idv_session_id?: string;
  shareable_url?: string;
  user_id?: string;
  message?: string;
  error_code?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/plaid/create-idv-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to create Plaid IDV session:', error);
    return { success: false, message: 'Failed to start identity verification' };
  }
}

/**
 * Get Plaid IDV session status
 */
export async function getPlaidIdvStatus(idvSessionId: string): Promise<{
  success: boolean;
  status?: string;
  steps?: any;
  user?: any;
  completed_at?: string;
  message?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/plaid/idv-status?idv_session_id=${encodeURIComponent(idvSessionId)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to get Plaid IDV status:', error);
    return { success: false, message: 'Failed to get verification status' };
  }
}

export async function checkPinExists(phone: string) {
  const res = await fetch(`${API_BASE_URL}/users/pin/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  return res.json();
}

export async function verifyPin(phone: string, pin: string) {
  const res = await fetch(`${API_BASE_URL}/users/pin/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, pin }),
  });
  return res.json();
}

export async function saveBasicInfo(
  phone: string,
  data: {
    first_name: string;
    middle_name?: string;
    last_name: string;
    email: string;
    date_of_birth: string;
  }
) {
  const res = await fetch(`${API_BASE_URL}/users/basic-info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, ...data }),
  });
  return res.json();
}

export async function setPassword(phone: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/users/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
  });
  return res.json();
}

export async function applyReferralCode(phone: string, referral_code: string) {
  const res = await fetch(`${API_BASE_URL}/users/referral`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, referral_code }),
  });
  return res.json();
}

export async function completeOnboarding(phone: string) {
  const res = await fetch(`${API_BASE_URL}/users/complete-onboarding`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  return res.json();
}

export async function createPin(phone: string, pin: string) {
  const res = await fetch(`${API_BASE_URL}/users/pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: phone.trim(), pin }),
  });

  const data = await res.json().catch(() => ({}));
  return data; // { success, message, user_id? }
}

export interface Country {
  code: string;
  name: string;
  symbol?: string;
  flag?: string;
  dialCode?: string;
}

// Updated getCountries function
export const getCountries = async (): Promise<Country[]> => {
  const response = await fetch(`${API_BASE_URL}/countries/public`);
  if (!response.ok) throw new Error('Failed to fetch countries');
  const data = await response.json();
  return data.map((c: any) => ({
    code: c.code,
    name: c.countryName || c.name,
    flag: c.flag,
    dialCode: c.dialCode,
    currencyCode: c.currencyCode,
    currencyEnabled: c.currencyEnabled,
  }));
};

// New function to save base currency to backend
export const saveBaseCurrency = async (phone: string, baseCurrency: string, token: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/users/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ phone, baseCurrency }),
  });
  if (!response.ok) throw new Error('Failed to save base currency');
};

// Add to api/config.ts
export const checkPhoneExists = async (phone: string): Promise<{ exists: boolean; message: string }> => {
  const res = await fetch(`${API_BASE_URL}/users/check-phone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  return res.json();
};

export const login = async (phone: string, password: string): Promise<{
  suspended: boolean;
  user: any;
  accessToken: any;
  auth_token: any;
  success: boolean;
  message: string;
  token?: string;
}> => {
  const res = await fetch(`${API_BASE_URL}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  return res.json();
};

export type Region = { code: string; name: string };

export async function getRegionsByCountryName(countryName: string): Promise<Region[]> {
  const res = await fetch("https://countriesnow.space/api/v0.1/countries/states", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ country: countryName }),
  });

  const json = await res.json();

  // Expected shape:
  // { error: false, msg: "...", data: { name: "Canada", states: [{ name: "Ontario", state_code: "ON" }, ...] } }
  if (!res.ok || json?.error) {
    throw new Error(json?.msg || "Failed to fetch regions");
  }

  const states = json?.data?.states ?? [];
  return states.map((s: any) => ({
    code: s.state_code || s.name, // some countries don't have codes
    name: s.name,
  }));
}

export const sendEmailOtp = async (email: string) => {
  const res = await fetch(`${API_BASE_URL}/otp/email/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return res.json();
};

export const verifyEmailOtp = async (email: string, code: string) => {
  const res = await fetch(`${API_BASE_URL}/otp/email/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  return res.json();
};

export const resendEmailOtp = async (email: string) => {
  const res = await fetch(`${API_BASE_URL}/otp/email/resend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return res.json();
};

export async function saveUserAddress(payload: {
  phone: string;
  countryCode: string;
  countryName: string;
  buildingOrHouse: string;
  street: string;
  city: string;
  region: string;
  stateOrProvince: string;
  postalCode: string;
}): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(`${API_BASE_URL}/users/address`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response.json();
}

export async function getUserProfile(phone: string): Promise<{
  success: boolean;
  user?: {
    first_name: string;
    baseCurrency: any;
    homeCurrencySymbol: any;
    homeCurrency: any;
    country: any;
    countryCode: any;
    id: string;
    phone: string;
    email: string;
    firstName: string;
    lastName: string;
    kycStatus: string;
    status: string;
    onboardingStep: string;
  };
  message?: string;
}> {
  const res = await fetch(`${API_BASE_URL}/users/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  return res.json();
}

// Fetch enabled currencies from backend

interface Currency {
  enabled: boolean;
  code: string;
  countryCode: string; // 2-letter ISO country code
  name: string;
  countryName: string;
  symbol: string;
  flag: string;
  dialCode: string;
}

export async function getPublicCurrencies(includeAll = false): Promise<Currency[]> {
  const url = includeAll
    ? `${API_BASE_URL}/currencies/public?all=true`
    : `${API_BASE_URL}/currencies/public`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch currencies");
  return res.json();
}

export const createCurrencyAccount = async (
  userPhone: string,
  currencyCode: string,
  country: string
): Promise<{ success: boolean; message: string; account?: any }> => {
  const response = await fetch(`${API_BASE_URL}/currencycloud/create-account`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_phone: userPhone,
      currency_code: currencyCode,
      country: country
    })
  });
  return response.json();
};

export const getUserAccounts = async (
  phone: string,
  includeBalances: boolean = false
): Promise<{ success: boolean; accounts?: any[]; error?: string }> => {
  try {
    const url = `${API_BASE_URL}/currencycloud/user-accounts/${encodeURIComponent(phone)}${includeBalances ? '?includeBalances=true' : ''}`;
    const response = await fetch(url);
    const data = await response.json();
    return { success: response.ok, accounts: data.accounts || [], error: data.error };
  } catch (error) {
    console.error("Get user accounts error:", error);
    return { success: false, error: "Network error" };
  }
};

// In mobile api/config.ts - update getExchangeRates function:
export async function getExchangeRates(pairs: string): Promise<{
  success: boolean;
  rates?: any[];
  message?: string;
}> {
  try {
    // Use source=live to fetch real-time rates from CurrencyCloud/OXR instead of database overrides
    const response = await fetch(`${API_BASE_URL}/exchange-rates/public?source=live&pairs=${encodeURIComponent(pairs)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
    return { success: false, rates: [], message: 'Failed to fetch exchange rates' };
  }
}

export const getTotalBalance = async (phone: string) => {
  const response = await fetch(`${API_BASE_URL}/currencycloud/user-total-balance?phone=${encodeURIComponent(phone)}`);
  return response.json();
};

// Add this to your api/config.ts
export async function getHistoricalRates(from: string, to: string, range: string) {
  const response = await fetch(
    `${API_BASE_URL}/exchange-rates/historical?from=${from}&to=${to}&range=${range}`
  );
  return response.json();
}

// ============ CONVERSION API FUNCTIONS ============

// Get user wallets with balances for conversion
export async function getUserWallets(phone: string): Promise<{
  success: boolean;
  wallets: any[];
  message?: string;
}> {
  try {
    const encodedPhone = encodeURIComponent(phone);
    // Use /user/wallets with query param - this endpoint correctly uses cc_contact_id for balance scoping
    const response = await fetch(`${API_BASE_URL}/currencycloud/user/wallets?phone=${encodedPhone}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (data.success && Array.isArray(data.wallets)) {
      return {
        success: true,
        wallets: data.wallets.map((w: any) => ({
          id: w.id,
          currencyCode: w.currency_code || w.currencyCode,
          currencyName: w.currency_name || w.currencyName,
          countryName: w.country_name || w.countryName,
          flag: w.flag || '🏳️',
          symbol: w.symbol || w.currency_code || '',
          balance: w.balance || 0,
          formattedBalance: w.formatted_balance || w.formattedBalance || `${w.balance || 0}`,
          status: w.status || 'active',
        })),
      };
    }

    return {
      success: false,
      wallets: [],
      message: data.message || 'Failed to load wallets',
    };
  } catch (error) {
    console.error('Failed to fetch wallets:', error);
    return {
      success: false,
      wallets: [],
      message: 'Failed to fetch wallets',
    };
  }
}

// Get conversion quote
export const getConversionQuote = async (
  phone: string,
  sellCurrency: string,
  buyCurrency: string,
  amount: number,
  fixedSide: "sell" | "buy" = "sell"
) => {
  const response = await fetch(`${API_BASE_URL}/currencycloud/user/convert/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone,
      sell_currency: sellCurrency,
      buy_currency: buyCurrency,
      amount,
      fixed_side: fixedSide,
    }),
  });
  return response.json();
};

// Execute conversion
export const executeConversion = async (
  phone: string,
  sellCurrency: string,
  buyCurrency: string,
  amount: number,
  fixedSide: "sell" | "buy" = "sell"
) => {
  const response = await fetch(`${API_BASE_URL}/currencycloud/user/convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone,
      sell_currency: sellCurrency,
      buy_currency: buyCurrency,
      amount,
      fixed_side: fixedSide,
    }),
  });
  return response.json();
};

/**
 * Currency destination for payout
 */
export interface PayoutDestination {
  code: string;
  name: string;
  countryName: string;
  flag: string;
  isExotic: boolean;
}

/**
 * Get available payout destinations
 * Returns exotic currencies (Flutterwave) + CAD (CurrencyCloud EFT)
 */
export async function getPayoutDestinations(): Promise<{
  success: boolean;
  destinations: PayoutDestination[];
  message?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/currencies/public`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    if (Array.isArray(data)) {
      // Filter for exotic currencies (Flutterwave payouts) + CAD (CurrencyCloud EFT)
      const destinations: PayoutDestination[] = data
        .filter((c: any) => c.is_exotic || c.isExotic || c.code === 'CAD')
        .map((c: any) => ({
          code: c.code,
          name: c.name,
          countryName: c.country_name || c.countryName || c.name,
          flag: c.flag || '🏳️',
          isExotic: c.is_exotic || c.isExotic || false,
        }));

      return { success: true, destinations };
    }

    return { success: false, destinations: [], message: 'Failed to fetch destinations' };
  } catch (error) {
    console.error('Failed to fetch payout destinations:', error);
    return { success: false, destinations: [], message: 'Failed to fetch payout destinations' };
  }
}
