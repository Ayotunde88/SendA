import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const API_BASE_URL =
  Platform.OS === "android"
    ? process.env.EXPO_PUBLIC_API_BASE_URL_ANDROID
    : process.env.EXPO_PUBLIC_API_BASE_URL_IOS;

// ============ FETCH WITH TIMEOUT HELPER ============
const DEFAULT_TIMEOUT_MS = 15000; // 15 seconds





const CACHED_ACCOUNTS_KEY = "cached_accounts_v1";
const ACCOUNTS_CACHE_TTL_MS = 2 * 60 * 1000; // 2 mins

type CachedAccount = {
  id?: string;
  currencyCode: string;
  balance: number | null;
  updatedAt: number;
  [k: string]: any;
};

async function loadCachedAccounts(): Promise<CachedAccount[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHED_ACCOUNTS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function saveCachedAccounts(accounts: any[]) {
  try {
    const now = Date.now();
    const normalized = (accounts || []).map((a: any) => ({
      ...a,
      currencyCode: String(a.currencyCode || a.currency_code || "").toUpperCase().trim(),
      updatedAt: now,
    }));
    await AsyncStorage.setItem(CACHED_ACCOUNTS_KEY, JSON.stringify(normalized));
  } catch (e) {
    console.log("[cache] saveCachedAccounts failed:", e);
  }
}

/**
 * Merge API accounts with cached accounts:
 * - If API gives 0/null but cache had a recent non-zero, keep cache.
 * - If API gives a real number, update cache.
 */
function mergeWithCache(apiAccounts: any[], cached: CachedAccount[]) {
  const cachedMap = new Map<string, CachedAccount>();
  cached.forEach((c) => cachedMap.set(String(c.currencyCode).toUpperCase().trim(), c));

  const now = Date.now();

  return (apiAccounts || []).map((acc: any) => {
    const ccy = String(acc.currencyCode || acc.currency_code || "").toUpperCase().trim();
    const cachedAcc = cachedMap.get(ccy);

    const raw = acc.balance;
    const apiBal =
      typeof raw === "number"
        ? raw
        : typeof raw === "string" && raw.trim() !== ""
          ? Number(raw)
          : NaN;

    const apiHasValid = Number.isFinite(apiBal);
    const cacheHasValid = cachedAcc && typeof cachedAcc.balance === "number" && Number.isFinite(cachedAcc.balance);

    // suspicious "0" update
    const apiIsSuspiciousZero = apiHasValid && apiBal === 0 && cacheHasValid && (cachedAcc!.balance as number) !== 0;

    const cacheFresh =
      cachedAcc && (now - (cachedAcc.updatedAt || 0)) < ACCOUNTS_CACHE_TTL_MS;

    if ((!apiHasValid || apiIsSuspiciousZero) && cacheHasValid && cacheFresh) {
      return { ...acc, currencyCode: ccy, balance: cachedAcc!.balance };
    }

    return { ...acc, currencyCode: ccy, balance: apiHasValid ? apiBal : null };
  });
}



/**
 * Fetch with timeout - prevents requests from hanging indefinitely
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

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
  currencyCode: string;
  code: string;
  name: string;
  symbol?: string;
  flag?: string;
  dialCode?: string;
}

// Updated getCountries function
// Cache for countries to avoid refetching on every poll
let countriesCache: { data: Country[]; timestamp: number } | null = null;
const COUNTRIES_CACHE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

export const getCountries = async (): Promise<Country[]> => {
  // Return cached data if fresh
  const now = Date.now();
  if (countriesCache && (now - countriesCache.timestamp) < COUNTRIES_CACHE_MAX_AGE_MS) {
    return countriesCache.data;
  }

  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/countries/public`, {}, 10000);
    if (!response.ok) throw new Error('Failed to fetch countries');
    const data = await response.json();
    const countries = data.map((c: any) => ({
      code: c.code,
      name: c.countryName || c.name,
      flag: c.flag,
      dialCode: c.dialCode,
      currencyCode: c.currencyCode,
      currencyEnabled: c.currencyEnabled,
    }));
    
    // Cache the result
    countriesCache = { data: countries, timestamp: now };
    return countries;
  } catch (error) {
    // If we have stale cache, return it instead of failing
    if (countriesCache) {
      console.log('[getCountries] Using stale cache due to error');
      return countriesCache.data;
    }
    throw error;
  }
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

// Cache for last known good balances to prevent flicker during transient failures
const balanceCache: Record<string, { balance: number; timestamp: number }> = {};
const BALANCE_CACHE_MAX_AGE_MS = 60000; // 1 minute

export const getUserAccounts = async (
  phone: string,
  includeBalances: boolean = false
): Promise<{ success: boolean; accounts?: any[]; error?: string }> => {
  try {
    const cached = await loadCachedAccounts();

    const url = `${API_BASE_URL}/currencycloud/user-accounts/${encodeURIComponent(phone)}${includeBalances ? "?includeBalances=true" : ""}`;
    const response = await fetchWithTimeout(url, {}, 15000);

    if (!response.ok) {
      // ✅ return cache if exists
      if (cached.length > 0) return { success: true, accounts: cached };
      return { success: false, accounts: [], error: `HTTP ${response.status}` };
    }

    const text = await response.text();
    if (!text || text.trim() === "") {
      if (cached.length > 0) return { success: true, accounts: cached };
      return { success: false, accounts: [], error: "Empty response" };
    }

    const data = JSON.parse(text);
    const apiAccounts = (data.accounts || []).map((acc: any) => ({
      ...acc,
      currencyCode: String(acc.currencyCode || acc.currency_code || "").toUpperCase().trim(),
    }));

    // ✅ merge with cache to prevent flicker-to-zero
    const merged = mergeWithCache(apiAccounts, cached);

    // ✅ save merged snapshot for Home + Wallet
    await saveCachedAccounts(merged);

    return { success: true, accounts: merged };
  } catch (error) {
    console.error("Get user accounts error:", error);
    const cached = await loadCachedAccounts();
    if (cached.length > 0) return { success: true, accounts: cached };
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

// Cache for total balance to prevent flicker during transient failures
let totalBalanceCache: { data: any; timestamp: number } | null = null;
const TOTAL_BALANCE_CACHE_MAX_AGE_MS = 30000; // 30 seconds

export const getTotalBalance = async (phone: string): Promise<{
  success: boolean;
  totalBalance?: number;
  homeCurrency?: string;
  homeCurrencySymbol?: string;
  error?: string;
}> => {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/currencycloud/user-total-balance?phone=${encodeURIComponent(phone)}`,
      {},
      12000 // 12 second timeout
    );
    
    if (!response.ok) {
      // Return cached data if available
      if (totalBalanceCache) {
        console.log('[getTotalBalance] Using cached balance due to non-ok response');
        return totalBalanceCache.data;
      }
      return { success: false, error: `HTTP ${response.status}` };
    }

    const text = await response.text();
    if (!text || text.trim() === '') {
      // Empty response - return cached data
      if (totalBalanceCache) {
        console.log('[getTotalBalance] Using cached balance due to empty response');
        return totalBalanceCache.data;
      }
      return { success: false, error: 'Empty response' };
    }

    const data = JSON.parse(text);
    
    // Only cache successful responses with valid balances
    if (data.success && typeof data.totalBalance === 'number') {
      totalBalanceCache = { data, timestamp: Date.now() };
  
    }
    
    return data;
  } catch (error: any) {
    console.log('[getTotalBalance] Error:', error.message);
    
    // Return cached data if available and not too old
    const now = Date.now();
    if (totalBalanceCache && (now - totalBalanceCache.timestamp) < TOTAL_BALANCE_CACHE_MAX_AGE_MS) {
      console.log('[getTotalBalance] Using cached balance due to error');
      return totalBalanceCache.data;
    }
    
    return { success: false, error: error.message || 'Network error' };
  }
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
        wallets: data.wallets.map((w: any) => {
          const rawBalance = w.balance;
          const parsedBalance =
            typeof rawBalance === "number"
              ? rawBalance
              : typeof rawBalance === "string" && rawBalance.trim() !== ""
                ? Number(rawBalance)
                : NaN;
          const balance = Number.isFinite(parsedBalance) ? parsedBalance : null;

          return {
            id: w.id,
            currencyCode: w.currency_code || w.currencyCode,
            currencyName: w.currency_name || w.currencyName,
            countryName: w.country_name || w.countryName,
            flag: w.flag || '🏳️',
            symbol: w.symbol || w.currency_code || '',
            balance,
            formattedBalance:
              w.formatted_balance || w.formattedBalance || (balance === null ? '' : `${balance}`),
            status: w.status || 'active',
          };
        }),
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
 * Register push notification token with the backend
 */
export async function registerPushToken(
  phone: string,
  pushToken: string,
  platform: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/users/push-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        push_token: pushToken,
        platform,
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to register push token:', error);
    return { success: false, message: 'Failed to register push token' };
  }
}

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