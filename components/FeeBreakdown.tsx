/**
 * FeeBreakdown Component
 * Displays transparent fee information for conversions, sends, and withdrawals
 */
import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";

export interface FeeInfo {
  feeAmount: number;
  feeCurrency: string;
  feeType?: string;
  feePercentage?: number;
  flatFee?: number;
  totalDebit?: number;
  feeAmountInBaseCurrency?: number;
  baseCurrency?: string;
  baseCurrencySymbol?: string;
}

interface FeeBreakdownProps {
  fee: FeeInfo | null;
  sellAmount: number | null | undefined;
  sellCurrency: string;
  buyAmount: number | null | undefined;
  buyCurrency: string;
  rate: number | null;
  compact?: boolean;
}

export default function FeeBreakdown({
  fee,
  sellAmount,
  sellCurrency,
  buyAmount,
  buyCurrency,
  rate,
  compact = false,
}: FeeBreakdownProps) {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    NGN: "₦",
    CAD: "C$",
    GHS: "₵",
    KES: "KSh",
    RWF: "FRw",
  };

  const toNumber = (v: any) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const formatAmount = (amount: number | null | undefined, currency: string) => {
    const safe = toNumber(amount);
    const ccy = String(currency || "").toUpperCase().trim();
    const symbol = symbols[ccy] || "";
    return `${symbol}${safe.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const hasFee = !!fee && toNumber(fee.feeAmount) > 0;

  // Fee deducted from sell amount (your logic)
  const totalYouGet = useMemo(() => {
    const sell = toNumber(sellAmount);
    if (!hasFee) return sell;

    const feeAmt = toNumber(fee?.feeAmount);
    const feeCcy = String(fee?.feeCurrency || "").toUpperCase().trim();
    const sellCcy = String(sellCurrency || "").toUpperCase().trim();

    return feeCcy === sellCcy ? sell - feeAmt : sell;
  }, [sellAmount, hasFee, fee, sellCurrency]);

  const showDualCurrency =
    !!fee &&
    fee.feeAmountInBaseCurrency != null &&
    !!fee.baseCurrency &&
    String(fee.baseCurrency).toUpperCase().trim() !==
      String(fee.feeCurrency).toUpperCase().trim();

  const primaryFeeDisplay = useMemo(() => {
    if (!fee) return "";
    if (showDualCurrency) {
      const baseAmt = toNumber(fee.feeAmountInBaseCurrency);
      const baseSymbol = fee.baseCurrencySymbol || "";
      return `${baseSymbol}${baseAmt.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
    return formatAmount(fee.feeAmount, fee.feeCurrency);
  }, [fee, showDualCurrency]);

  const secondaryFeeDisplay = useMemo(() => {
    if (!fee || !showDualCurrency) return "";
    return `≈ ${formatAmount(fee.feeAmount, fee.feeCurrency)}`;
  }, [fee, showDualCurrency]);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {hasFee && (
          <View style={styles.compactRow}>
            <Text style={styles.compactLabel}>Fee</Text>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.compactValue}>{primaryFeeDisplay}</Text>
              {!!secondaryFeeDisplay && <Text style={styles.feeConversion}>{secondaryFeeDisplay}</Text>}
            </View>
          </View>
        )}
        <View style={styles.compactRow}>
          <Text style={styles.compactLabelBold}>Total you get</Text>
          <Text style={styles.compactValueBold}>{formatAmount(totalYouGet, sellCurrency)}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Transaction Summary</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Conversion amount</Text>
        <Text style={styles.value}>{formatAmount(sellAmount, sellCurrency)}</Text>
      </View>

      {hasFee && (
        <View style={styles.row}>
          <View style={styles.labelWithBadge}>
            <Text style={styles.label}>Platform fee</Text>
            {fee?.feeType === "percentage" && fee?.feePercentage != null && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{toNumber(fee.feePercentage)}%</Text>
              </View>
            )}
          </View>

          <View style={{ alignItems: "flex-end", flexShrink: 1, maxWidth: "55%" }}>
            <Text style={styles.feeValue}>{primaryFeeDisplay}</Text>
            {!!secondaryFeeDisplay && <Text style={styles.feeConversion}>{secondaryFeeDisplay}</Text>}
          </View>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={styles.totalLabel}>Total you get</Text>
        <Text style={styles.totalValue}>{formatAmount(totalYouGet, sellCurrency)}</Text>
      </View>

      {!!rate && Number.isFinite(rate) && (
        <View style={styles.rateContainer}>
          <Text style={styles.rateText}>
            1 {sellCurrency} = {toNumber(rate).toFixed(4)} {buyCurrency}
          </Text>
        </View>
      )}

      <View style={styles.receiveContainer}>
        <Text style={styles.receiveLabel}>You'll receive</Text>
        <Text style={styles.receiveValue}>{formatAmount(buyAmount, buyCurrency)}</Text>
      </View>

      <View style={styles.noteContainer}>
        <Text style={styles.noteIcon}>✓</Text>
        <Text style={styles.noteText}>Mid-market rate • No hidden fees</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
  },
  compactContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  compactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  compactLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  compactValue: {
    fontSize: 13,
    color: "#6B7280",
  },
  compactLabelBold: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  compactValueBold: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    color: "#6B7280",
  },
  labelWithBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "600",
  },
  value: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  feeValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#DC2626",
  },
  feeConversion: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  rateContainer: {
    marginTop: 8,
    alignItems: "center",
  },
  rateText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  receiveContainer: {
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: "center",
  },
  receiveLabel: {
    fontSize: 13,
    color: "#065F46",
    marginBottom: 4,
  },
  receiveValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#059669",
  },
  noteContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  noteIcon: {
    fontSize: 12,
    color: "#059669",
    marginRight: 6,
  },
  noteText: {
    fontSize: 12,
    color: "#6B7280",
  },
});
