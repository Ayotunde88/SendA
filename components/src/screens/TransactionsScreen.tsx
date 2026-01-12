import React, { useState, useCallback, useEffect, useMemo } from "react";
import { View, Text, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenShell from "../../../components/ScreenShell";
import Pill from "../../../components/Pill";
import { styles } from "../../../theme/styles";
import { COLORS } from "../../../theme/colors";
import { getUserTransactions, WalletTransaction } from "../../../api/transactions";

interface TransactionGroup {
  date: string;
  items: WalletTransaction[];
}

const STATUS_FILTERS = ["All", "Completed", "Pending", "Failed"];

export default function AllTransactionsScreen() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [currencyFilter, setCurrencyFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const loadTransactions = useCallback(async (refresh = false) => {
    try {
      const phone = await AsyncStorage.getItem("user_phone");
      if (!phone) {
        setTransactions([]);
        return;
      }

      const currentPage = refresh ? 1 : page;
      const res = await getUserTransactions(phone, currentPage, 50, currencyFilter || undefined);

      if (res.success) {
        if (refresh) {
          setTransactions(res.transactions);
          setPage(1);
        } else {
          setTransactions(prev => [...prev, ...res.transactions]);
        }
        setHasMore(res.hasNext);
      }
    } catch (e) {
      console.error("Failed to load transactions:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, currencyFilter]);

  useEffect(() => {
    loadTransactions(true);
  }, [currencyFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTransactions(true);
  }, [loadTransactions]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    let filtered = transactions;
    if (statusFilter !== "All") {
      filtered = transactions.filter(
        tx => tx.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    const groups: Record<string, WalletTransaction[]> = {};
    
    for (const tx of filtered) {
      const date = new Date(tx.createdAt);
      const dateKey = date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(tx);
    }

    return Object.entries(groups)
      .map(([date, items]) => ({ date, items }))
      .sort((a, b) => {
        const dateA = new Date(a.items[0]?.createdAt || 0);
        const dateB = new Date(b.items[0]?.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });
  }, [transactions, statusFilter]);

  const getTransactionIcon = (tx: WalletTransaction): string => {
    switch (tx.transactionType) {
      case "conversion": return "⇄";
      case "payout":
      case "transfer_out": return "↑";
      case "deposit":
      case "transfer_in": return "↓";
      case "fee": return "💰";
      default: return "•";
    }
  };

  const getTransactionTitle = (tx: WalletTransaction): string => {
    if (tx.counterpartyName) {
      if (tx.transactionType === "payout" || tx.transactionType === "transfer_out") {
        return `To ${tx.counterpartyName}`;
      }
      return `From ${tx.counterpartyName}`;
    }

    switch (tx.transactionType) {
      case "conversion":
        return `Convert ${tx.fromCurrency || tx.currency} → ${tx.toCurrency || ""}`;
      case "payout": return `Sent ${tx.currency}`;
      case "deposit": return `Received ${tx.currency}`;
      case "fee": return "Fee";
      default: return tx.description || tx.transactionType || "Transaction";
    }
  };

  const formatAmount = (tx: WalletTransaction): string => {
    const isOutgoing = tx.transactionType === "payout" || tx.transactionType === "transfer_out" || tx.amount < 0;
    const absAmount = Math.abs(tx.amount);
    const formatted = absAmount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${isOutgoing ? "-" : "+"}${formatted} ${tx.currency}`;
  };

  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "completed": return "#22c55e";
      case "pending":
      case "processing": return "#f59e0b";
      case "failed":
      case "cancelled": return "#ef4444";
      default: return "#6b7280";
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScreenShell padded={false}>
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Transactions</Text>
              <Text style={styles.subtitle}>All your financial activity</Text>
            </View>
          </View>

          {/* Status Filters */}
          <View style={styles.filtersRow}>
            {STATUS_FILTERS.map((filter) => (
              <Pressable key={filter} onPress={() => setStatusFilter(filter)}>
                <Pill
                  title={filter}
                  active={statusFilter === filter}
                />
              </Pressable>
            ))}
          </View>

          {/* Transactions List */}
          {loading ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={{ marginTop: 12, color: "#9CA3AF", fontWeight: "600" }}>
                Loading transactions...
              </Text>
            </View>
          ) : groupedTransactions.length === 0 ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>📋</Text>
              <Text style={{ color: "#6b7280", fontWeight: "600", fontSize: 16 }}>
                No transactions yet
              </Text>
            </View>
          ) : (
            groupedTransactions.map((group, idx) => (
              <View key={idx} style={{ marginTop: 14, paddingHorizontal: 16 }}>
                <Text style={styles.groupDate}>{group.date}</Text>
                <View style={styles.groupLine} />

                {group.items.map((tx) => (
                  <Pressable
                    key={tx.reference}
                    style={styles.txRow}
                    onPress={() =>
                      router.push({
                        pathname: "/transactiondetail/[reference]",
                        params: { reference: String(tx.reference) },
                      } as any)
                    }
                  >
                    <View style={styles.txLeft}>
                      <View style={styles.txIcon}>
                        <Text style={{ fontWeight: "900", fontSize: 16 }}>
                          {getTransactionIcon(tx)}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.txTitle}>{getTransactionTitle(tx)}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={styles.txTime}>{formatTime(tx.createdAt)}</Text>
                          <View
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: getStatusColor(tx.status),
                            }}
                          />
                          <Text
                            style={{
                              fontSize: 11,
                              color: getStatusColor(tx.status),
                              fontWeight: "600",
                              textTransform: "capitalize",
                            }}
                          >
                            {tx.status}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.txRight}>
                      <Text
                        style={[
                          styles.txAmt,
                          {
                            color:
                              tx.transactionType === "payout" || tx.amount < 0
                                ? "#ef4444"
                                : "#22c55e",
                          },
                        ]}
                      >
                        {formatAmount(tx)}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ))
          )}

          {/* Load More */}
          {hasMore && !loading && (
            <Pressable
              onPress={() => {
                setPage(p => p + 1);
                loadTransactions(false);
              }}
              style={{
                marginHorizontal: 16,
                marginTop: 16,
                paddingVertical: 12,
                backgroundColor: "#f3f4f6",
                borderRadius: 8,
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "700", color: "#374151" }}>Load More</Text>
            </Pressable>
          )}
        </ScrollView>
      </ScreenShell>
    </SafeAreaView>
  );
}