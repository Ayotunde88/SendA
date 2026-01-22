import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { strictAPICall, TransactionError, ensureNetworkOrThrow } from "../utils/networkGuard";



export const API_BASE_URL =
  Platform.OS === "android"
    ? process.env.EXPO_PUBLIC_API_BASE_URL_ANDROID
    : process.env.EXPO_PUBLIC_API_BASE_URL_IOS;

// ============ FETCH WITH TIMEOUT HELPER ============
const DEFAULT_TIMEOUT_MS = 15000; // 15 seconds
const CACHED_TOTAL_BALANCE_KEY = "cached_total_balance_v1";
const TOTAL_BALANCE_CACHE_TTL_MS = 2 * 60 * 1000; // 2 mins (adjust if you want)

function mapConfigError(err: any, fallbackMsg: string) {
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
export const checkEmailVerified = async (phone: string): Promise<{
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  email: string | null;
}> => {
  try {
    const res = await fetch(`${API_BASE_URL}/users/email-verified?phone=${encodeURIComponent(phone)}`);
    if (!res.ok) {
      return { emailVerified: false, emailVerifiedAt: null, email: null };
    }
    return res.json();
  } catch (error) {
    console.error('Failed to check email verification status:', error);
    return { emailVerified: false, emailVerifiedAt: null, email: null };
  }
};

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

// ============ PERSONA IDENTITY VERIFICATION ============

/**
 * Create Persona Inquiry session for identity verification
 * Backend fetches user data by phone/email and creates the inquiry
 */
export async function createPersonaInquiry(params: {
  phone?: string;
  email?: string;
}): Promise<{
  success: boolean;
  inquiry_id?: string;
  session_token?: string;
  resume_url?: string;
  status?: string;
  user_id?: string;
  message?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/persona/create-inquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to create Persona inquiry:', error);
    return { success: false, message: 'Failed to start identity verification' };
  }
}

/**
 * Get Persona Inquiry status
 */
export async function getPersonaInquiryStatus(inquiryId: string): Promise<{
  success: boolean;
  status?: string;
  reference_id?: string;
  created_at?: string;
  completed_at?: string;
  message?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/persona/inquiry-status?inquiry_id=${encodeURIComponent(inquiryId)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to get Persona inquiry status:', error);
    return { success: false, message: 'Failed to get verification status' };
  }
}

/**
 * Resume an existing Persona Inquiry session
 */
export async function resumePersonaInquiry(params: {
  phone?: string;
  email?: string;
}): Promise<{
  success: boolean;
  inquiry_id?: string;
  resume_url?: string;
  status?: string;
  message?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/persona/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to resume Persona inquiry:', error);
    return { success: false, message: 'Failed to resume verification' };
  }
}


// ============ PLAID IDENTITY VERIFICATION ============

/**
 * Create Plaid Identity Verification session
 * Backend fetches user data by phone/email and creates the IDV session
 */
// Legacy Plaid functions (kept for compatibility)
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
  // Redirect to Persona
  const result = await createPersonaInquiry(params);
  return {
    success: result.success,
    link_token: result.session_token,
    idv_session_id: result.inquiry_id,
    shareable_url: result.resume_url,
    user_id: result.user_id,
    message: result.message,
  };
}

export async function getPlaidIdvStatus(idvSessionId: string): Promise<{
  success: boolean;
  status?: string;
  steps?: any;
  user?: any;
  completed_at?: string;
  message?: string;
}> {
  // Redirect to Persona
  const result = await getPersonaInquiryStatus(idvSessionId);
  return {
    success: result.success,
    status: result.status,
    completed_at: result.completed_at,
    message: result.message,
  };
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
  const now = Date.now();

  // ✅ Return cached data if still fresh
  if (
    countriesCache &&
    now - countriesCache.timestamp < COUNTRIES_CACHE_MAX_AGE_MS
  ) {
    return countriesCache.data;
  }

  try {
    // 🔒 1️⃣ Check internet FIRST
    await ensureNetworkOrThrow();

    // 🌍 2️⃣ Make API request
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/countries/public`,
      {},
      10000
    );

    if (!response.ok) {
      throw new Error("SERVER_ERROR");
    }

    const data = await response.json();

    const countries: Country[] = data.map((c: any) => ({
      code: c.code,
      name: c.countryName || c.name,
      flag: c.flag,
      dialCode: c.dialCode,
      currencyCode: c.currencyCode,
      currencyEnabled: c.currencyEnabled,
    }));

    // 💾 3️⃣ Cache result
    countriesCache = { data: countries, timestamp: now };

    return countries;
  } catch (error: any) {
    // 🧠 4️⃣ If offline → return stale cache if available
    if (error?.message === "NO_INTERNET") {
      if (countriesCache) {
        console.log("[getCountries] Offline → using cached countries");
        return countriesCache.data;
      }

      // Explicit error for UI
      throw new Error("NO_INTERNET");
    }

    // 🧠 5️⃣ Other errors → still fallback to cache
    if (countriesCache) {
      console.log("[getCountries] Error → using stale cache");
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

export const verifyEmailOtp = async (email: string, code: string, phone: string) => {
  const res = await fetch(`${API_BASE_URL}/otp/email/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, phone }),
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
  user?: any;
  message?: string;
  code?: string;
  isNetworkError?: boolean;
  isTimeoutError?: boolean;
}> {
  try {
    const data = await strictAPICall<any>(`${API_BASE_URL}/users/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
      timeoutMs: 12000,
      context: "Fetch user profile",
      validateSuccess: false,
    });

    return data;
  } catch (err) {
    return mapConfigError(err, "Failed to fetch profile");
  }
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




function normalizeCurrency(code: any) {
  return String(code || "").toUpperCase().trim();
}

function isValidNumber(n: any) {
  return typeof n === "number" && Number.isFinite(n);
}

/**
 * Merge API snapshot with cached snapshot:
 * - If API has a valid number balance -> use it
 * - If API balance is missing/null/invalid -> keep cached balance (prevents 0.00 flicker)
 */
export function mergeAccountsWithCache(apiAccounts: any[], cachedAccounts: any[]) {
  const cachedMap = new Map<string, any>();
  for (const c of cachedAccounts || []) {
    const key = normalizeCurrency(c.currencyCode || c.currency_code);
    if (key) cachedMap.set(key, c);
  }

  const merged = (apiAccounts || []).map((a) => {
    const key = normalizeCurrency(a.currencyCode || a.currency_code);
    const old = cachedMap.get(key);

    const apiBal = a.balance;
    const apiHasBalance = isValidNumber(apiBal);

    return {
      ...old,
      ...a,
      currencyCode: key,
      balance: apiHasBalance ? apiBal : (old?.balance ?? null),
    };
  });

  // Keep cached-only accounts if API didn’t return them (rare but happens)
  for (const [key, old] of cachedMap.entries()) {
    if (!merged.some((m) => normalizeCurrency(m.currencyCode) === key)) {
      merged.push(old);
    }
  }

  return merged;
}



export const getUserAccounts = async (
  phone: string,
  includeBalances: boolean = false
): Promise<{ success: boolean; accounts?: any[]; error?: string; source?: "api" | "cache"; fetchedAt?: number }> => {
  try {
    const cached = await loadCachedAccounts();

    const url = `${API_BASE_URL}/currencycloud/user-accounts/${encodeURIComponent(phone)}${includeBalances ? "?includeBalances=true" : ""}`;
    const response = await fetchWithTimeout(url, {}, 15000);

    if (!response.ok) {
      // ✅ return cache if exists
      if (cached.length > 0) return { success: true, accounts: cached, source: "cache", fetchedAt: Date.now() };
      return { success: false, accounts: [], error: `HTTP ${response.status}` };
    }

    const text = await response.text();
    if (!text || text.trim() === "") {
      if (cached.length > 0) return { success: true, accounts: cached, source: "cache", fetchedAt: Date.now() };
      return { success: false, accounts: [], error: "Empty response" };
    }

    const data = JSON.parse(text);
    const apiAccounts = (data.accounts || []).map((acc: any) => ({
    ...acc,
    currencyCode: String(acc.currencyCode || acc.currency_code || "").toUpperCase().trim(),
    // IMPORTANT: do NOT coerce missing balance to 0
    balance:
      typeof acc.balance === "number" && Number.isFinite(acc.balance)
        ? acc.balance
        : null,
  }));

  const merged = mergeAccountsWithCache(apiAccounts, cached);


    // ✅ save merged snapshot for Home + Wallet
    await saveCachedAccounts(merged);

    return { success: true, accounts: merged, source: "api", fetchedAt: Date.now() };
  } catch (error) {
    console.error("Get user accounts error:", error);
    const cached = await loadCachedAccounts();
    if (cached.length > 0) return { success: true, accounts: cached, source: "cache", fetchedAt: Date.now() };
    
    return { success: false, error: "Network error" };

  }
};


// In mobile api/config.ts - update getExchangeRates function:
export async function getExchangeRates(pairs: string): Promise<{
  success: boolean;
  rates?: any[];
  message?: string;
  code?: string;
  isNetworkError?: boolean;
  isTimeoutError?: boolean;
}> {
  const url = `${API_BASE_URL}/exchange-rates/public?source=live&pairs=${encodeURIComponent(pairs)}`;

  try {
    const data = await strictAPICall<any>(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      timeoutMs: 10000,
      context: "Fetch exchange rates",
      validateSuccess: false,
    });

    return {
      success: !!data?.success,
      rates: Array.isArray(data?.rates) ? data.rates : [],
      message: data?.message,
    };
  } catch (err) {
    return { ...mapConfigError(err, "Failed to fetch exchange rates"), rates: [] };
  }
}


// Cache for total balance to prevent flicker during transient failures
const totalBalanceCacheByPhone: Record<string, { data: any; timestamp: number }> = {};
const TOTAL_BALANCE_CACHE_MAX_AGE_MS = 30000; // 30 seconds

// Short-lived quote cache + in-flight de-duplication to prevent rate-limits
const __quoteCache = new Map<string, { ts: number; data: any }>();
const __quoteInflight = new Map<string, Promise<any>>();

export const getTotalBalance = async (phone: string): Promise<{
  cached: any;
  success: boolean;
  totalBalance?: number;
  homeCurrency?: string;
  homeCurrencySymbol?: string;
  error?: string;
}> => {
  const key = String(phone || "");
  const now = Date.now();
  const cachedEntry = key ? totalBalanceCacheByPhone[key] : undefined;

  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/currencycloud/user-total-balance?phone=${encodeURIComponent(phone)}`,
      {},
      12000 // 12 second timeout
    );

    if (!response.ok) {
      // Return cached data for THIS phone only (prevents cross-user leakage)
      if (cachedEntry) {
        console.log("[getTotalBalance] Using cached balance due to non-ok response");
        return cachedEntry.data;
      }
      return { cached: null, success: false, error: `HTTP ${response.status}` };
    }

    const text = await response.text();
    if (!text || text.trim() === "") {
      // Empty response - return cached data for THIS phone only
      if (cachedEntry) {
        console.log("[getTotalBalance] Using cached balance due to empty response");
        return cachedEntry.data;
      }
      return { cached: null, success: false, error: "Empty response" };
    }

    const data = JSON.parse(text);

    // Only cache successful responses with valid balances
    if (key && data.success && typeof data.totalBalance === "number") {
      totalBalanceCacheByPhone[key] = { data, timestamp: Date.now() };
    }

    return data;
  } catch (error: any) {
    console.log("[getTotalBalance] Error:", error?.message);

    // Return cached data if available and not too old (for THIS phone only)
    if (key && cachedEntry && (now - cachedEntry.timestamp) < TOTAL_BALANCE_CACHE_MAX_AGE_MS) {
      console.log("[getTotalBalance] Using cached balance due to error");
      return cachedEntry.data;
    }

    return {
      cached: cachedEntry ? cachedEntry.data : null,
      success: false,
      error: error?.message || "Network error",
    };
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
  code?: string;
  isNetworkError?: boolean;
  isTimeoutError?: boolean;
}> {
  const encodedPhone = encodeURIComponent(phone);
  const url = `${API_BASE_URL}/currencycloud/user/wallets?phone=${encodedPhone}`;

  try {
    const data = await strictAPICall<any>(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      timeoutMs: 12000,
      context: "Fetch wallets",
      validateSuccess: false,
    });

    if (data?.success && Array.isArray(data?.wallets)) {
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
            flag: w.flag || "🏳️",
            symbol: w.symbol || w.currency_code || "",
            balance,
            formattedBalance:
              w.formatted_balance || w.formattedBalance || (balance === null ? "" : `${balance}`),
            status: w.status || "active",
          };
        }),
      };
    }

    return {
      success: false,
      wallets: [],
      message: data?.message || "Failed to load wallets",
    };
  } catch (err) {
    return { ...mapConfigError(err, "Failed to fetch wallets"), wallets: [] };
  }
}


// Get conversion quote
export const getConversionQuote = async (
  phone: string,
  sellCurrency: string,
  buyCurrency: string,
  amount: number,
  fixedSide: "sell" | "buy" = "sell"
): Promise<any> => {
  try {
    // ---- Client-side quote dedupe & short cache ----
    // Typing into an amount field can trigger multiple quote requests.
    // This layer coalesces in-flight identical requests and reuses a fresh quote
    // for a few seconds to avoid "too many API requests" errors.
    const key = [
      String(phone || ""),
      String(sellCurrency || "").toUpperCase().trim(),
      String(buyCurrency || "").toUpperCase().trim(),
      fixedSide,
      // round to cents so tiny formatting diffs don't spam the API
      Number.isFinite(amount) ? Math.round(amount * 100) / 100 : amount,
    ].join("|");

    const now = Date.now();
    const cached = (__quoteCache.get(key) || null);
    if (cached && now - cached.ts < 3500) {
      return cached.data;
    }

    const inflight = __quoteInflight.get(key);
    if (inflight) return inflight;

    const promise = strictAPICall<any>(`${API_BASE_URL}/currencycloud/user/convert/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        sell_currency: sellCurrency,
        buy_currency: buyCurrency,
        amount,
        fixed_side: fixedSide,
      }),
      timeoutMs: 15000,
      context: "Get conversion quote",
      validateSuccess: false,
    });

    __quoteInflight.set(key, promise);
    try {
      const data = await promise;
      __quoteCache.set(key, { ts: Date.now(), data });
      return data;
    } finally {
      __quoteInflight.delete(key);
    }
  } catch (err) {
    return mapConfigError(err, "Failed to get quote");
  }
};


// Execute conversion
export const executeConversion = async (
  phone: string,
  sellCurrency: string,
  buyCurrency: string,
  amount: number,
  fixedSide: "sell" | "buy" = "sell"
): Promise<any> => {
  try {
    const data = await strictAPICall<any>(`${API_BASE_URL}/currencycloud/user/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        sell_currency: sellCurrency,
        buy_currency: buyCurrency,
        amount,
        fixed_side: fixedSide,
      }),
      timeoutMs: 20000,
      context: "Execute conversion",
      validateSuccess: false,
    });

    return data;
  } catch (err) {
    return mapConfigError(err, "Conversion failed");
  }
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
 * Rate alert model used by the rate-alerts endpoints
 */
export interface RateAlert {
  toCurrency: any;
  fromCurrency: any;
  trigger_count: number;
  triggered_at: any;
  triggerCount: number;
  id?: number;
  phone?: string;
  from_currency?: string;
  to_currency?: string;
  target_rate?: number;
  direction?: "above" | "below";
  is_recurring?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
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

export async function getRateAlerts(phone: string, activeOnly = false): Promise<{ success: boolean; alerts: RateAlert[]; message?: string }> {
  try {
    const url = `${API_BASE_URL}/rate-alerts?phone=${encodeURIComponent(phone)}&active=${activeOnly}`;
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.json();
  } catch (error) {
    console.error('Failed to fetch rate alerts:', error);
    return { success: false, alerts: [], message: 'Failed to fetch rate alerts' };
  }
}

/**
 * Create a new rate alert
 */
export async function createRateAlert(params: {
  phone: string;
  from_currency: string;
  to_currency: string;
  target_rate: number;
  direction: 'above' | 'below';
  is_recurring: boolean;
}): Promise<{ success: boolean; alert?: RateAlert; message?: string }> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/rate-alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return response.json();
  } catch (error) {
    console.error('Failed to create rate alert:', error);
    return { success: false, message: 'Failed to create rate alert' };
  }
}

/**
 * Update a rate alert
 */
export async function updateRateAlert(alertId: number, updates: {
  target_rate?: number;
  direction?: 'above' | 'below';
  is_recurring?: boolean;
  is_active?: boolean;
}): Promise<{ success: boolean; alert?: RateAlert; message?: string }> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/rate-alerts/${alertId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return response.json();
  } catch (error) {
    console.error('Failed to update rate alert:', error);
    return { success: false, message: 'Failed to update rate alert' };
  }
}

/**
 * Delete a rate alert
 */
export async function deleteRateAlert(alertId: number): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/rate-alerts/${alertId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.json();
  } catch (error) {
    console.error('Failed to delete rate alert:', error);
    return { success: false, message: 'Failed to delete rate alert' };
  }
}

export async function calculateSendFee(params: {
  phone: string;
  transactionType: 'send' | 'withdrawal' | 'conversion' | 'funding';
  amount: number;
  currency: string;
  fromCurrency?: string;
  toCurrency?: string;
}): Promise<{
  success: boolean;
  feeAmount?: number;
  feeCurrency?: string;
  feeConfig?: {
    fee_type: string;
    percentage_fee?: number;
    flat_fee?: number;
  };
  totalAmount?: number;
  feeAmountInBaseCurrency?: number;
  baseCurrency?: string;
  baseCurrencySymbol?: string;
  message?: string;
}> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/fees/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: params.phone,
        transactionType: params.transactionType,
        amount: params.amount,
        currency: params.currency,
        fromCurrency: params.fromCurrency,
        toCurrency: params.toCurrency,
      }),
    });
    return response.json();
  } catch (error) {
    console.error('Failed to calculate send fee:', error);
    return { success: false, message: 'Failed to calculate fee' };
  }
}