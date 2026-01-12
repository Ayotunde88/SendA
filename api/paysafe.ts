/**
 * Paysafe API Client for CAD Interac e-Transfers
 */
import { Platform } from 'react-native';

// API Base URL - same pattern as flutterwave.ts
export const API_BASE_URL =
  Platform.OS === 'android'
    ? process.env.EXPO_PUBLIC_API_BASE_URL_ANDROID || 'http://10.0.2.2:5000/api'
    : process.env.EXPO_PUBLIC_API_BASE_URL_IOS || 'http://127.0.0.1:5000/api';


export interface SendInteracRequest {
  phone: string;
  amount: number;
  recipientEmail: string;
  recipientName: string;
  message?: string;
}

export interface SendInteracResponse {
  success: boolean;
  message?: string;
  transactionId?: string;
  reference?: string;
  amount?: number;
  recipientEmail?: string;
  recipientName?: string;
  status?: string;
}

export interface InteracTransaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  reference: string;
  createdAt: string;
}

export interface VerifyAutoDepositResponse {
  success: boolean;
  autoDeposit: boolean;
  maxAmount?: number;
  message?: string;
}

/**
 * Request body for sending an EFT (electronic funds transfer)
 */
export interface SendEFTRequest {
  amount: number;
  recipientName: string;
  accountNumber: string;
  transitNumber?: string;
  phone: string;
  institutionNumber: string;
  reference?: string;
  description?: string;
  currency?: string;
  recipientEmail?: string;
}

/**
 * Response returned after attempting to send an EFT
 */
export interface SendEFTResponse {
  success: boolean;
  message?: string;
  transactionId?: string;
  reference?: string;
  amount?: number;
  status?: string;
  recipientName?: string;
  accountNumberMasked?: string;
}

/**
 * Send CAD via Interac e-Transfer using Paysafe
 */
export async function sendInterac(request: SendInteracRequest): Promise<SendInteracResponse> {
  try {
    console.log('[Paysafe] Sending Interac e-Transfer:', {
      amount: request.amount,
      recipientEmail: request.recipientEmail,
      recipientName: request.recipientName
    });

    const response = await fetch(`${API_BASE_URL}/paysafe/send-interac`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();
    console.log('[Paysafe] Send response:', data);

    return data;
  } catch (error) {
    console.error('[Paysafe] Send Interac error:', error);
    return {
      success: false,
      message: 'Failed to send Interac e-Transfer. Please try again.',
    };
  }
}

/**
 * Verify if recipient email is registered for Interac Auto-Deposit
 */
export async function verifyAutoDeposit(email: string): Promise<VerifyAutoDepositResponse> {
  try {
    console.log('[Paysafe] Verifying auto-deposit for:', email);

    const response = await fetch(`${API_BASE_URL}/paysafe/verify-autodeposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    console.log('[Paysafe] Auto-deposit verification response:', data);

    return data;
  } catch (error) {
    console.error('[Paysafe] Verify auto-deposit error:', error);
    return {
      success: false,
      autoDeposit: false,
      message: 'Failed to verify auto-deposit status.',
    };
  }
}

/**
 * Get Paysafe/Interac transaction history
 */
export async function getInteracTransactions(phone: string): Promise<{
  success: boolean;
  transactions: InteracTransaction[];
  message?: string;
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/paysafe/transactions?phone=${encodeURIComponent(phone)}`
    );

    const data = await response.json();
    return {
      success: data.success,
      transactions: data.transactions || [],
      message: data.message,
    };
  } catch (error) {
    console.error('[Paysafe] Get transactions error:', error);
    return {
      success: false,
      transactions: [],
      message: 'Failed to fetch transactions',
    };
  }
}



/**
 * Get transaction status
 */
export async function getTransactionStatus(transactionId: string): Promise<{
  success: boolean;
  status?: string;
  message?: string;
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/paysafe/status/${encodeURIComponent(transactionId)}`
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Paysafe] Get status error:', error);
    return {
      success: false,
      message: 'Failed to get transaction status',
    };
  }
}

export async function sendEFT(request: SendEFTRequest): Promise<SendEFTResponse> {
  try {
    console.log('[Paysafe] Sending EFT:', {
      amount: request.amount,
      recipientName: request.recipientName,
      accountNumber: `***${request.accountNumber.slice(-4)}`
    });

    const response = await fetch(`${API_BASE_URL}/paysafe/send-eft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const text = await response.text();
    if (!text) {
      console.error('[Paysafe] Empty response from server');
      return {
        success: false,
        message: 'No response from server. Please check your connection.',
      };
    }

    try {
      const data = JSON.parse(text);
      console.log('[Paysafe] EFT response:', data);
      return data;
    } catch (parseError) {
      console.error('[Paysafe] Failed to parse response:', text);
      return {
        success: false,
        message: 'Invalid response from server. Please try again.',
      };
    }
  } catch (error) {
    console.error('[Paysafe] Send EFT error:', error);
    return {
      success: false,
      message: 'Failed to send EFT. Please check your network connection.',
    };
  }
}


/**
 * Validate Interac email
 */
export function isValidInteracEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
