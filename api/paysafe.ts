import { Platform } from 'react-native';
import { 
  strictAPICall, 
  executeTransaction, 
  TransactionError,
  strictFetch,
  strictParseJSON,
  TRANSACTION_TIMEOUT_MS 
} from '../utils/networkGuard';

// Platform-specific API URLs - matches config.ts pattern (includes /api suffix)
const API_BASE_URL =
  Platform.OS === 'android'
    ? process.env.EXPO_PUBLIC_API_BASE_URL_ANDROID || 'http://10.0.2.2:5000/api'
    : process.env.EXPO_PUBLIC_API_BASE_URL_IOS || 'http://127.0.0.1:5000/api';

export { TransactionError };

export interface SendEFTRequest {
  phone: string;           // Required by Flask backend
  amount: number;          // Required
  recipientName: string;   // Required
  accountNumber: string;   // Required (5-12 digits)
  institutionNumber: string; // Required (3 digits)
  transitNumber: string;   // Required (5 digits)
  message?: string;
}

export interface SendEFTResponse {
  success: boolean;
  message?: string;
  transactionId?: string;
  reference?: string;
  amount?: number;
  recipientName?: string;
  accountNumber?: string;
  status?: string;
}

export interface EFTTransaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  reference: string;
  createdAt: string;
}

export interface ValidateBankResponse {
  success: boolean;
  valid: boolean;
  bankName?: string;
  errors?: string[];
  message?: string;
}

/**
 * Send CAD via EFT (Electronic Funds Transfer) using Paysafe
 * THROWS on any error - use try/catch to handle
 * Transaction will NOT proceed if network is unstable or any validation fails
 */
export async function sendEFT(request: SendEFTRequest): Promise<SendEFTResponse> {
  return executeTransaction(async () => {
    console.log('[Paysafe] Sending EFT:', {
      amount: request.amount,
      recipientName: request.recipientName,
      accountNumber: `***${request.accountNumber.slice(-4)}`
    });

    // Pre-validate required fields before network call
    if (!request.phone || !request.amount || !request.recipientName || 
        !request.accountNumber || !request.institutionNumber || !request.transitNumber) {
      throw new TransactionError(
        'Missing required fields for EFT transfer',
        'VALIDATION_FAILED'
      );
    }

    if (request.amount <= 0) {
      throw new TransactionError(
        'Amount must be greater than 0',
        'INVALID_AMOUNT'
      );
    }

    // Validate Canadian banking numbers
    if (!isValidInstitutionNumber(request.institutionNumber)) {
      throw new TransactionError(
        'Institution number must be exactly 3 digits',
        'INVALID_INSTITUTION'
      );
    }

    if (!isValidTransitNumber(request.transitNumber)) {
      throw new TransactionError(
        'Transit number must be exactly 5 digits',
        'INVALID_TRANSIT'
      );
    }

    if (!isValidAccountNumber(request.accountNumber)) {
      throw new TransactionError(
        'Account number must be between 5 and 12 digits',
        'INVALID_ACCOUNT'
      );
    }

    const response = await strictFetch(`${API_BASE_URL}/paysafe/send-eft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      timeoutMs: TRANSACTION_TIMEOUT_MS,
    });

    // Check for HTTP errors
    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        throw new TransactionError(
          `Server error (${response.status}). Please try again.`,
          `HTTP_${response.status}`
        );
      }
      throw new TransactionError(
        errorData?.message || `EFT transfer failed (${response.status})`,
        `HTTP_${response.status}`,
        { details: errorData }
      );
    }

    const data = await strictParseJSON<SendEFTResponse>(response);

    if (!data.success) {
      throw new TransactionError(
        data.message || 'EFT transfer failed',
        'EFT_FAILED',
        { details: data }
      );
    }

    console.log('[Paysafe] EFT response:', data);
    return data;
  }, 'EFT Transfer');
}

/**
 * Validate Canadian banking details
 * THROWS on any error - use try/catch to handle
 */
export async function validateBankDetails(
  institutionNumber: string,
  transitNumber: string,
  accountNumber: string
): Promise<ValidateBankResponse> {
  return executeTransaction(async () => {
    console.log('[Paysafe] Validating bank details');

    const data = await strictAPICall<ValidateBankResponse>(
      `${API_BASE_URL}/paysafe/validate-bank`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institutionNumber, transitNumber, accountNumber }),
        context: 'Validate bank details',
        timeoutMs: TRANSACTION_TIMEOUT_MS,
      }
    );

    console.log('[Paysafe] Bank validation response:', data);
    return data;
  }, 'Bank Validation');
}

/**
 * Get Paysafe/EFT transaction history
 * THROWS on any error - use try/catch to handle
 */
export async function getEFTTransactions(phone: string): Promise<{
  success: boolean;
  transactions: EFTTransaction[];
  message?: string;
}> {
  const data = await strictAPICall<any>(
    `${API_BASE_URL}/paysafe/transactions?phone=${encodeURIComponent(phone)}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      context: 'Get EFT transactions',
      timeoutMs: TRANSACTION_TIMEOUT_MS,
    }
  );

  return {
    success: true,
    transactions: data.transactions || [],
    message: data.message,
  };
}

/**
 * Get transaction status
 * THROWS on any error - use try/catch to handle
 */
export async function getTransactionStatus(transactionId: string): Promise<{
  success: boolean;
  status?: string;
  message?: string;
}> {
  const data = await strictAPICall<any>(
    `${API_BASE_URL}/paysafe/status/${encodeURIComponent(transactionId)}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      context: 'Get transaction status',
      timeoutMs: TRANSACTION_TIMEOUT_MS,
    }
  );

  return data;
}

// Validators are defined above to avoid duplicate declarations.

/**
 * Validate Canadian institution number (3 digits)
 */
export function isValidInstitutionNumber(num: string): boolean {
  return /^\d{3}$/.test(num);
}

/**
 * Validate Canadian transit number (5 digits)
 */
export function isValidTransitNumber(num: string): boolean {
  return /^\d{5}$/.test(num);
}

/**
 * Validate Canadian account number (5-12 digits)
 */
export function isValidAccountNumber(num: string): boolean {
  return /^\d{5,12}$/.test(num);
}