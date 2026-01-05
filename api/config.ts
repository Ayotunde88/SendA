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

// export async function createPin(phone: string, pin: string) {
//   const res = await fetch(`${API_BASE_URL}/users/pin`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ phone, pin }),
//   });
//   return res.json();
// }

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

// api/config.ts
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

export const getCountries = async (): Promise<Country[]> => {
  const res = await fetch(`${API_BASE_URL}/currencies/public`);
  if (!res.ok) throw new Error('Failed to fetch countries');
  const data = await res.json();
  return data.map((c: any) => ({
    code: c.code,
    name: c.countryName || c.name, // Use countryName for display
    flag: c.flag || '🏳️',
    dialCode: c.dialCode || '',
    }));
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
    user: any;
    accessToken: any;
    auth_token: any; success: boolean; message: string; token?: string 
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
// api/config.ts

interface Currency {
  code: string;
  countryCode: string; // 2-letter ISO country code
  name: string;
  countryName: string;
  symbol: string;
  flag: string;
  dialCode: string;
}

export async function getPublicCurrencies(): Promise<Currency[]> {
  const res = await fetch(`${API_BASE_URL}/currencies/public`);
  if (!res.ok) throw new Error("Failed to fetch currencies");
  return res.json();
}


export const createCurrencyAccount = async (
  userPhone: string,      // moved to first
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
export const getExchangeRates = async (source?: string, pairs?: string) => {
  const params = new URLSearchParams();
  if (source) params.append("source", source);
  if (pairs) params.append("pairs", pairs);
  
  const queryString = params.toString();
  const url = `${API_BASE_URL}/exchange-rates/public${queryString ? `?${queryString}` : ""}`;
  
  const res = await fetch(url);
  return res.json();
};

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










