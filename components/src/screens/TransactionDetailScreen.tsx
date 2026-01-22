import React, { useState, useCallback, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView, Alert, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import ScreenShell from "../../../components/ScreenShell";
import { styles } from "../../../theme/styles";
import { COLORS } from "../../../theme/colors";
import { getTransactionByReference, WalletTransaction } from "../../../api/transactions";

export default function TransactionDetailScreen() {
  const router = useRouter();
  const { reference } = useLocalSearchParams<{ reference: string }>();

  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState<WalletTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const loadTransaction = useCallback(async () => {
    if (!reference) {
      setError("No transaction reference provided");
      setLoading(false);
      return;
    }

    try {
      const res = await getTransactionByReference(reference);
      if (res.success && res.transaction) {
        setTransaction(res.transaction);
      } else {
        setError(res.message || "Transaction not found");
      }
    } catch (e) {
      console.error("Failed to load transaction:", e);
      setError("Failed to load transaction");
    } finally {
      setLoading(false);
    }
  }, [reference]);

  useEffect(() => {
    loadTransaction();
  }, [loadTransaction]);

  const getStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case "completed":
        return COLORS.green;
      case "pending":
      case "processing":
        return COLORS.yellow;
      case "failed":
      case "cancelled":
        return COLORS.error;
      default:
        return COLORS.muted;
    }
  };

  const getStatusBgColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "rgba(34, 197, 94, 0.1)";
      case "pending":
      case "processing":
        return "rgba(245, 158, 11, 0.1)";
      case "failed":
      case "cancelled":
        return "rgba(239, 68, 68, 0.1)";
      default:
        return "rgba(107, 114, 128, 0.1)";
    }
  };

  const getTransactionTypeLabel = (type: string): string => {
    switch (type) {
      case "conversion":
        return "Currency Conversion";
      case "payout":
        return "Money Sent";
      case "deposit":
        return "Money Received";
      case "transfer_in":
        return "Transfer In";
      case "transfer_out":
        return "Transfer Out";
      case "fee":
        return "Fee";
      default:
        return type || "Transaction";
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const formatAmount = (amount: number, currency: string): string => {
    return `${Math.abs(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency}`;
  };

  const generateReceiptHtml = (tx: WalletTransaction): string => {
    const isOut = tx.transactionType === "payout" || tx.transactionType === "transfer_out" || tx.amount < 0;
    const amountColor = isOut ? COLORS.error : COLORS.green;
    const amountPrefix = isOut ? "-" : "+";

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9fafb; padding: 20px; }
            .receipt { max-width: 400px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, ${COLORS.primary}, #6366f1); padding: 24px; text-align: center; color: #fff; }
            .header h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
            .header p { font-size: 12px; opacity: 0.9; }
            .amount-section { padding: 24px; text-align: center; border-bottom: 1px solid #e5e7eb; }
            .type-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
            .amount { font-size: 32px; font-weight: 700; color: ${amountColor}; }
            .status { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 12px; background: ${getStatusBgColor(tx.status)}; color: ${getStatusColor(tx.status)}; }
            .section { padding: 20px 24px; border-bottom: 1px solid #e5e7eb; }
            .section:last-child { border-bottom: none; }
            .section-title { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; font-weight: 600; }
            .row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; }
            .row-label { font-size: 14px; color: #6b7280; }
            .row-value { font-size: 14px; color: #111827; font-weight: 500; text-align: right; }
            .row-value.red { color: #ef4444; }
            .reference { font-family: monospace; font-size: 12px; background: #f3f4f6; padding: 8px 12px; border-radius: 8px; margin-top: 8px; word-break: break-all; }
            .footer { padding: 20px 24px; text-align: center; background: #f9fafb; }
            .footer p { font-size: 11px; color: #9ca3af; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h1>Transaction Receipt</h1>
              <p>Thank you for using our service</p>
            </div>
            <div class="amount-section">
              <div class="type-label">${getTransactionTypeLabel(tx.transactionType)}</div>
              <div class="amount">${amountPrefix}${formatAmount(tx.amount, tx.currency)}</div>
              <div class="status">${tx.status.toUpperCase()}</div>
            </div>

${tx.transactionType === "conversion" && tx.fromCurrency && tx.toCurrency ? `
            <div class="section">
              <div class="section-title">Conversion Details</div>
              <div class="row">
                <span class="row-label">From</span>
                <span class="row-value">${tx.fromAmount?.toLocaleString()} ${tx.fromCurrency}</span>
              </div>
              <div class="row">
                <span class="row-label">To</span>
                <span class="row-value">${tx.toAmount?.toLocaleString()} ${tx.toCurrency}</span>
              </div>
${tx.exchangeRate ? `
              <div class="row">
                <span class="row-label">Exchange Rate</span>
                <span class="row-value">1 ${tx.fromCurrency} = ${tx.exchangeRate.toFixed(6)} ${tx.toCurrency}</span>
              </div>
` : ''}
            </div>
` : ''}

${tx.counterpartyName ? `
            <div class="section">
              <div class="section-title">${isOut ? 'Recipient' : 'Sender'}</div>
              <div class="row">
                <span class="row-label">Name</span>
                <span class="row-value">${tx.counterpartyName}</span>
              </div>
${tx.counterpartyBank ? `
              <div class="row">
                <span class="row-label">Bank</span>
                <span class="row-value">${tx.counterpartyBank}</span>
              </div>
` : ''}
${tx.counterpartyAccount ? `
              <div class="row">
                <span class="row-label">Account</span>
                <span class="row-value">•••• ${tx.counterpartyAccount.slice(-4)}</span>
              </div>
` : ''}
            </div>
` : ''}

            <div class="section">
              <div class="section-title">Transaction Info</div>
              <div class="row">
                <span class="row-label">Date</span>
                <span class="row-value">${formatDate(tx.createdAt)}</span>
              </div>
              <div class="row">
                <span class="row-label">Time</span>
                <span class="row-value">${formatTime(tx.createdAt)}</span>
              </div>
${tx.provider ? `
              <div class="row">
                <span class="row-label">Provider</span>
                <span class="row-value">${tx.provider}</span>
              </div>
` : ''}
              <div class="reference">${tx.reference}</div>
            </div>

${tx.feeAmount && tx.feeAmount > 0 ? `
            <div class="section">
              <div class="section-title">Fees & Charges</div>
              <div class="row">
                <span class="row-label">Transaction Amount</span>
                <span class="row-value">${formatAmount(Math.abs(tx.amount), tx.currency)}</span>
              </div>
              <div class="row">
                <span class="row-label">Platform Fee</span>
                 <span class="row-value red">-${tx.feeAmountInBaseCurrency && tx.baseCurrency && tx.baseCurrency !== (tx.feeCurrency || tx.currency) ? `${tx.baseCurrencySymbol || ''}${tx.feeAmountInBaseCurrency.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style="color:#6B7280;font-size:12px;">(≈ ${formatAmount(tx.feeAmount, tx.feeCurrency || tx.currency)})</span>` : formatAmount(tx.feeAmount, tx.feeCurrency || tx.currency)}</span>
              </div>
              <div class="row">
                <span class="row-label"><strong>Total Charged</strong></span>
                <span class="row-value"><strong>${formatAmount(Math.abs(tx.amount) + tx.feeAmount, tx.currency)}</strong></span>
              </div>
            </div>
` : ''}

            <div class="footer">
              <p>Generated on ${new Date().toLocaleString()}</p>
              <p>Reference: ${tx.reference}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handleDownloadReceipt = async () => {
    if (!transaction) return;

    setGeneratingPdf(true);
    try {
      const html = generateReceiptHtml(transaction);
      const { uri } = await Print.printToFileAsync({ html });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Save or Share Receipt",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Success", "Receipt saved to: " + uri);
      }
    } catch (e) {
      console.error("Failed to generate receipt:", e);
      Alert.alert("Error", "Failed to generate receipt. Please try again.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleShareReceipt = async () => {
    if (!transaction) return;

    setGeneratingPdf(true);
    try {
      const html = generateReceiptHtml(transaction);
      const { uri } = await Print.printToFileAsync({ html });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Share Receipt",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Sharing Unavailable", "Sharing is not available on this device.");
      }
    } catch (e) {
      console.error("Failed to share receipt:", e);
      Alert.alert("Error", "Failed to share receipt. Please try again.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <ScreenShell>
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 12, color: "#9CA3AF", fontWeight: "600" }}>
              Loading transaction...
            </Text>
          </View>
        </ScreenShell>
      </SafeAreaView>
    );
  }

  if (error || !transaction) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <ScreenShell>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>
            <Text style={styles.title}>Transaction Details</Text>
          </View>
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>❌</Text>
            <Text style={{ color: COLORS.error, fontWeight: "700", fontSize: 16 }}>
              {error || "Transaction not found"}
            </Text>
            <Pressable
              onPress={() => router.back()}
              style={{
                marginTop: 20,
                paddingHorizontal: 24,
                paddingVertical: 12,
                backgroundColor: COLORS.primary,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Go Back</Text>
            </Pressable>
          </View>
        </ScreenShell>
      </SafeAreaView>
    );
  }

  const isOutgoing = transaction.transactionType === "payout" || transaction.transactionType === "transfer_out" || transaction.amount < 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScreenShell padded={false}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>
            <Text style={styles.title}>Transaction Details</Text>
          </View>

          {/* Amount Card */}
          <View style={styles.amountCard}>
            <Text style={styles.typeLabel}>
              {getTransactionTypeLabel(transaction.transactionType)}
            </Text>
            <Text
              style={[
                styles.amount,
                { color: isOutgoing ? COLORS.error : COLORS.green },
              ]}
            >
              {isOutgoing ? "-" : "+"}
              {formatAmount(transaction.amount, transaction.currency)}
            </Text>

            {/* Status Badge */}
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusBgColor(transaction.status) },
              ]}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: getStatusColor(transaction.status),
                }}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(transaction.status) },
                ]}
              >
                {transaction.status}
              </Text>
            </View>
          </View>

          {/* Conversion Details */}
          {transaction.transactionType === "conversion" &&
            transaction.fromCurrency &&
            transaction.toCurrency && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Conversion Details</Text>
                <View style={styles.conversionRow}>
                  <View style={styles.conversionBox}>
                    <Text style={styles.conversionLabel}>From</Text>
                    <Text style={styles.conversionAmount}>
                      {transaction.fromAmount?.toLocaleString()} {transaction.fromCurrency}
                    </Text>
                  </View>
                  <Text style={styles.conversionArrow}>→</Text>
                  <View style={styles.conversionBox}>
                    <Text style={styles.conversionLabel}>To</Text>
                    <Text style={styles.conversionAmount}>
                      {transaction.toAmount?.toLocaleString()} {transaction.toCurrency}
                    </Text>
                  </View>
                </View>
                {transaction.exchangeRate && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Exchange Rate</Text>
                    <Text style={styles.detailValue}>
                      1 {transaction.fromCurrency} = {transaction.exchangeRate.toFixed(6)} {transaction.toCurrency}
                    </Text>
                  </View>
                )}
              </View>
            )}

          {/* Recipient Details */}
          {transaction.counterpartyName && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {isOutgoing ? "Recipient" : "Sender"}
              </Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Name</Text>
                <Text style={styles.detailValue}>{transaction.counterpartyName}</Text>
              </View>
              {transaction.counterpartyBank && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Bank</Text>
                  <Text style={styles.detailValue}>{transaction.counterpartyBank}</Text>
                </View>
              )}
              {transaction.counterpartyAccount && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Account</Text>
                  <Text style={styles.detailValue}>
                    •••• {transaction.counterpartyAccount.slice(-4)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Transaction Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transaction Info</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reference</Text>
              <Text style={[styles.detailValue, { fontFamily: "monospace" }]}>
                {transaction.reference}
              </Text>
            </View>
            {transaction.externalReference && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Provider Ref</Text>
                <Text style={[styles.detailValue, { fontFamily: "monospace" }]}>
                  {transaction.externalReference}
                </Text>
              </View>
            )}
            {transaction.provider && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Provider</Text>
                <Text style={styles.detailValue}>{transaction.provider}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatDate(transaction.createdAt)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>{formatTime(transaction.createdAt)}</Text>
            </View>
            {transaction.completedAt && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Completed</Text>
                <Text style={styles.detailValue}>
                  {formatDate(transaction.completedAt)} at {formatTime(transaction.completedAt)}
                </Text>
              </View>
            )}
          </View>

          {/* Fees & Charges Section */}
          {transaction.feeAmount && transaction.feeAmount > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fees & Charges</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Transaction Amount</Text>
                <Text style={styles.detailValue}>
                  {formatAmount(Math.abs(transaction.amount), transaction.currency)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Platform Fee</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  {transaction.feeAmountInBaseCurrency && transaction.baseCurrency && 
                   transaction.baseCurrency !== (transaction.feeCurrency || transaction.currency) ? (
                    <>
                      <Text style={[styles.detailValue, { color: COLORS.error }]}>
                        -{transaction.baseCurrencySymbol || ''}{transaction.feeAmountInBaseCurrency.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                        ≈ {formatAmount(transaction.feeAmount, transaction.feeCurrency || transaction.currency)}
                      </Text>
                    </>
                  ) : (
                    <Text style={[styles.detailValue, { color: COLORS.error }]}>
                      -{formatAmount(transaction.feeAmount, transaction.feeCurrency || transaction.currency)}
                    </Text>
                  )}
                </View>
              </View>
              <View style={{ 
                borderTopWidth: 1, 
                borderTopColor: COLORS.border, 
                borderStyle: 'dashed',
                marginVertical: 8 
              }} />
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { fontWeight: "700" }]}>Total Charged</Text>
                <Text style={[styles.detailValue, { fontWeight: "700" }]}>
                  {formatAmount(Math.abs(transaction.amount) + transaction.feeAmount, transaction.currency)}
                </Text>
              </View>
            </View>
          )}

          {/* Description */}
          {transaction.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{transaction.description}</Text>
            </View>
          )}

          {/* Download & Share Buttons */}
          <View style={{ paddingHorizontal: 16, marginTop: 24, gap: 12 }}>
            <Pressable
              onPress={handleDownloadReceipt}
              disabled={generatingPdf}
              style={styles.outlineBtn}
            >
              <Text style={{ color: COLORS.green, fontWeight: "700", fontSize: 16 }}>
                Download Receipt
              </Text>
            </Pressable>

            <Pressable
              onPress={handleShareReceipt}
              disabled={generatingPdf}
              style={styles.primaryBtn}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                Share Receipt
              </Text>
            </Pressable>
          </View>

          {/* Help Button */}
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <Pressable
              onPress={() => {}}
              style={styles.helpButton}
            >
              <Text style={styles.helpButtonText}>Need help with this transaction?</Text>
            </Pressable>
          </View>
        </ScrollView>
      </ScreenShell>
    </SafeAreaView>
  );
}

