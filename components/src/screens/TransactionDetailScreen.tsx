import React, { useState, useCallback, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenShell from "../../../components/ScreenShell";
import { styles } from "../../../theme/styles";
import { COLORS } from "../../../theme/colors";
import { getTransactionByReference, WalletTransaction } from "../../../api/transactions";

type TransactionDetailScreenProps = {
  reference?: string;
};

export default function TransactionDetailScreen({ reference }: TransactionDetailScreenProps) {
  const router = useRouter();
//   const { reference } = useLocalSearchParams<{ reference: string }>();

  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState<WalletTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      case "completed": return "#22c55e";
      case "pending":
      case "processing": return "#f59e0b";
      case "failed":
      case "cancelled": return "#ef4444";
      default: return "#6b7280";
    }
  };

  const getStatusBgColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case "completed": return "rgba(34, 197, 94, 0.1)";
      case "pending":
      case "processing": return "rgba(245, 158, 11, 0.1)";
      case "failed":
      case "cancelled": return "rgba(239, 68, 68, 0.1)";
      default: return "rgba(107, 114, 128, 0.1)";
    }
  };

  const getTransactionTypeLabel = (type: string): string => {
    switch (type) {
      case "conversion": return "Currency Conversion";
      case "payout": return "Money Sent";
      case "deposit": return "Money Received";
      case "transfer_in": return "Transfer In";
      case "transfer_out": return "Transfer Out";
      case "fee": return "Fee";
      default: return type || "Transaction";
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
            <Text style={{ color: "#ef4444", fontWeight: "700", fontSize: 16 }}>
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
                { color: isOutgoing ? "#ef4444" : "#22c55e" },
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

          {/* Fee Info */}
          {transaction.feeAmount && transaction.feeAmount > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fees</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Fee Amount</Text>
                <Text style={styles.detailValue}>
                  {transaction.feeAmount.toFixed(2)} {transaction.feeCurrency || transaction.currency}
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

          {/* Help Button */}
          <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
            <Pressable onPress={() => {}} style={styles.helpButton}>
              <Text style={styles.helpButtonText}>Need help with this transaction?</Text>
            </Pressable>
          </View>
        </ScrollView>
      </ScreenShell>
    </SafeAreaView>
  );
}