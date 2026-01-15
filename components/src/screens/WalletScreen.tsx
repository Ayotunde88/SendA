import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView, RefreshControl, Alert } from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ScreenShell from "./../../ScreenShell";
import WalletAction from "./../../WalletAction";
import DetailRow from "./../../DetailRow";
import { styles } from "../../../theme/styles";
import { COLORS } from "../../../theme/colors";
import * as apiConfig from "../../../api/config";
import { getNGNBalance, getLocalBalance, getFlutterwaveTransactions } from "../../../api/flutterwave";
import { getUserTransactions, WalletTransaction } from "../../../api/transactions";
import { usePendingSettlements } from "../../../hooks/usePendingSettlements";
import { PendingBadge } from "../../../components/PendingBadge";

interface AccountDetails {
  id: string;
  currencyCode: string;
  accountName: string;
  iban?: string;
  bicSwift?: string;
  status: string;
  balance: number | null;
  flag: string;
  currencyName: string;
  // If true, balance is stored in the local ledger (Flutterwave side)
  isExotic?: boolean;
  accountNumber?: string;
  routingNumber?: string;
  sortCode?: string;
  bankName?: string;
  bankAddress?: string;
}

interface NGNTransaction {
  id: string;
  amount: number;
  recipientName: string;
  recipientBank: string;
  status: string;
  createdAt: string;
}

export default function WalletScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [tab, setTab] = useState("Transactions");
  const [account, setAccount] = useState<AccountDetails | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [ngnTransactions, setNgnTransactions] = useState<NGNTransaction[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [refreshingTransactions, setRefreshingTransactions] = useState(false);

  const isNGN = account?.currencyCode?.toUpperCase() === "NGN";

  /** ---- Pending settlements (hybrid balance) ---- **/
  const {
    settlements: pendingSettlements,
    hasPendingForCurrency,
    getOptimisticBalance,
    refresh: refreshPendingSettlements,
    checkAndClearIfSettled,
    removeSettlement,
  } = usePendingSettlements();

  const currencyCode = account?.currencyCode?.toUpperCase() || "";
  const hasPending = hasPendingForCurrency(currencyCode);
  // ALWAYS use getOptimisticBalance - it returns actualBalance when no pending exists
  // This prevents flicker from conditional logic switching between sources
  const displayBalance = account?.balance !== null && account?.balance !== undefined
    ? getOptimisticBalance(account.balance, currencyCode)
    : account?.balance;

  const handleBlockedBySettlement = () => {
    Alert.alert(
      "Settlement in Progress",
      `Your ${currencyCode} wallet has a pending conversion that is still settling. Please wait for settlement to complete.`,
      [{ text: "OK" }]
    );
  };

  // Parse initial account data from params
  useEffect(() => {
    if (params.accountData) {
      try {
        const parsed = JSON.parse(params.accountData as string);
        setAccount(parsed);
      } catch (e) {
        console.log("Error parsing account data:", e);
      }
    }
  }, [params.accountData]);

  // Refresh balance on screen focus
  const refreshBalance = useCallback(async () => {
    if (!account?.currencyCode) return;

    const isLocalLedger = Boolean(account?.isExotic) || isNGN;

    try {
      setRefreshing(true);
      const phone = await AsyncStorage.getItem("user_phone");
      if (!phone) return;

      let nextBalance: number | null | undefined = undefined;

      if (isLocalLedger) {
        // Exotic currencies (including NGN) live in the local ledger
        const response = await getLocalBalance(phone, account.currencyCode);
        if (response.success) {
          nextBalance = response.balance;
          setAccount((prev) =>
            prev
              ? {
                  ...prev,
                  balance: response.balance,
                }
              : null
          );
        }
      } else {
        // Non-exotic currencies: fetch from CurrencyCloud wallets list
        const response = (apiConfig as any).getUserWallets
          ? await (apiConfig as any).getUserWallets(phone)
          : { success: false };
        if (response.success) {
          const updatedWallet = (response.wallets || []).find(
            (w: any) => w.currencyCode.toUpperCase() === account.currencyCode.toUpperCase()
          );
          if (updatedWallet) {
            nextBalance = updatedWallet.balance;
            setAccount((prev) =>
              prev
                ? {
                    ...prev,
                    balance: updatedWallet.balance,
                  }
                : null
            );
          }
        }
      }

      // If we have a pending settlement with a baseline for this currency, clear it once balances match.
      if (typeof nextBalance === 'number' && pendingSettlements.length > 0) {
        const ccy = (account.currencyCode || '').toUpperCase().trim();
        const related = pendingSettlements.filter(
          (s) =>
            (s.sellCurrency || '').toUpperCase().trim() === ccy ||
            (s.buyCurrency || '').toUpperCase().trim() === ccy
        );

        for (const s of related) {
          const sellCcy = (s.sellCurrency || '').toUpperCase().trim();
          const buyCcy = (s.buyCurrency || '').toUpperCase().trim();

          const sellNeedsConfirm = Number(s.sellAmount || 0) !== 0;
          const buyNeedsConfirm = Number(s.buyAmount || 0) !== 0;

          const sellSettled = !sellNeedsConfirm
            ? true
            : sellCcy === ccy && typeof s.sellBalanceBefore === 'number'
              ? await checkAndClearIfSettled(
                  sellCcy,
                  nextBalance,
                  Number(s.sellBalanceBefore) - Number(s.sellAmount || 0),
                  0.01
                )
              : false;

          const buySettled = !buyNeedsConfirm
            ? true
            : buyCcy === ccy && typeof s.buyBalanceBefore === 'number'
              ? await checkAndClearIfSettled(
                  buyCcy,
                  nextBalance,
                  Number(s.buyBalanceBefore) + Number(s.buyAmount || 0),
                  0.01
                )
              : false;

          if (sellSettled && buySettled) {
            await removeSettlement(s.id, true);
          }
        }
      }
    } catch (error) {
      console.log("Failed to refresh balance:", error);
    } finally {
      setRefreshing(false);
    }
  }, [account?.currencyCode, account?.isExotic, isNGN, pendingSettlements, checkAndClearIfSettled, removeSettlement]);

  // Fetch NGN transactions
  const fetchNGNTransactions = useCallback(async () => {
    if (!isNGN) return;
    
    try {
      setLoadingTransactions(true);
      const phone = await AsyncStorage.getItem("user_phone");
      if (!phone) return;

      const response = await getFlutterwaveTransactions(phone);
      console.log('[WalletScreen] NGN transactions response:', response);
      if (response.success) {
        // Map FlutterwaveTransaction (unknown shape) into our NGNTransaction shape
        const mapped: NGNTransaction[] = (response.transactions || []).map((t: any) => ({
          id:
            t.id ??
            t.transaction_id ??
            t.tx_ref ??
            t.flw_ref ??
            String(Date.now()) + Math.random().toString(36).slice(2),
          amount: Number(t.amount ?? t.amount_paid ?? t.charge ?? 0),
          recipientName:
            t.recipient?.name ??
            t.customer?.name ??
            t.name ??
            t.beneficiary_name ??
            t.account_name ??
            "—",
          recipientBank:
            t.recipient?.bank ??
            t.customer?.bank ??
            t.beneficiary_bank ??
            t.bank ??
            t.account_bank ??
            "—",
          status: (t.status ?? t.transaction_status ?? t.response_code ?? "pending"),
          createdAt:
            t.created_at ??
            t.createdAt ??
            t.created_at_datetime ??
            t.date ??
            new Date().toISOString(),
        }));

        setNgnTransactions(mapped);
      }
    } catch (error) {
      console.log("Failed to fetch NGN transactions:", error);
    } finally {
      setLoadingTransactions(false);
    }
  }, [isNGN]);

  // Fetch transactions for non-NGN wallets from unified ledger
  const fetchWalletTransactions = useCallback(async () => {
    if (isNGN || !account?.currencyCode) return;
    
    try {
      setLoadingTransactions(true);
      const phone = await AsyncStorage.getItem("user_phone");
      if (!phone) return;

      const response = await getUserTransactions(phone, 1, 50, account.currencyCode);
      console.log('[WalletScreen] Wallet transactions response:', response);
      if (response.success) {
        setWalletTransactions(response.transactions);
      }
    } catch (error) {
      console.log("Failed to fetch wallet transactions:", error);
    } finally {
      setLoadingTransactions(false);
    }
  }, [isNGN, account?.currencyCode]);

  useFocusEffect(
    useCallback(() => {
      refreshPendingSettlements();
      if (account) {
        console.log('[WalletScreen] Focus - refreshing balance for', account.currencyCode);
        refreshBalance();
        if (isNGN) {
          fetchNGNTransactions();
        } else {
          fetchWalletTransactions();
        }
      }
    }, [account?.currencyCode, isNGN, refreshBalance, fetchNGNTransactions, fetchWalletTransactions, refreshPendingSettlements])
  );

  // Pull-to-refresh handler
  const onRefreshTransactions = useCallback(async () => {
    setRefreshingTransactions(true);
    try {
      await refreshBalance();
      if (isNGN) {
        await fetchNGNTransactions();
      } else {
        await fetchWalletTransactions();
      }
    } finally {
      setRefreshingTransactions(false);
    }
  }, [isNGN, refreshBalance, fetchNGNTransactions, fetchWalletTransactions]);

  const formatBalance = (balance: number | null | undefined, currencyCode: string) => {
    if (balance === null || balance === undefined) return `0.00 ${currencyCode}`;
    return `${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyCode}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const normalizeStatus = (s: string) => {
    const x = String(s || "").toLowerCase().trim();
    if (x.includes("complete") || x.includes("success")) return "completed";
    if (x.includes("pend") || x.includes("process") || x.includes("queue")) return "pending";
    if (x.includes("fail") || x.includes("error") || x.includes("cancel")) return "failed";
    return "pending";
  };

  const statusLabel = (s: string) => {
    const key = normalizeStatus(s);
    if (key === "completed") return "Completed";
    if (key === "pending") return "Processing";
    return "Failed";
  };

  const getTransactionIcon = (type: string) => {
    const t = type?.toLowerCase() || "";
    if (t.includes("deposit") || t.includes("credit") || t.includes("inbound") || t.includes("funding")) return "↓";
    if (t.includes("withdraw") || t.includes("debit") || t.includes("payout") || t.includes("send")) return "↑";
    if (t.includes("convert") || t.includes("exchange")) return "↻";
    return "⇄";
  };

  const isCredit = (type: string) => {
    const t = type?.toLowerCase() || "";
    return t.includes("deposit") || t.includes("credit") || t.includes("inbound") || t.includes("funding");
  };

  if (!account) {
    return (
      <ScreenShell>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </ScreenShell>
    );
  }

  // Render NGN transactions
  const renderNGNTransactions = () => {
    if (loadingTransactions) {
      return <ActivityIndicator size="small" color={COLORS.primary} style={styles.walletTxLoading} />;
    }
    
    if (ngnTransactions.length === 0) {
      return <Text style={styles.walletTxEmpty}>No transactions yet</Text>;
    }

    // Group transactions by formatted date
    const groups = ngnTransactions.reduce<Record<string, NGNTransaction[]>>((acc, tx) => {
      const key = formatDate(tx.createdAt);
      if (!acc[key]) acc[key] = [];
      acc[key].push(tx);
      return acc;
    }, {});

    // Sort groups by date (newest first)
    const groupEntries = Object.entries(groups).sort((a, b) => {
      const da = new Date(a[0]).getTime();
      const db = new Date(b[0]).getTime();
      return db - da;
    });

    // Sort each group by createdAt (newest first)
    groupEntries.forEach(([, arr]) => {
      arr.sort((x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime());
    });

    return (
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshingTransactions}
            onRefresh={onRefreshTransactions}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {groupEntries.map(([dateLabel, items]) => (
          <View key={dateLabel}>
            <Text style={styles.walletTxGroupTitle}>{dateLabel}</Text>

            <View style={styles.walletTxCard}>
              {items.map((tx, idx) => {
                const sKey = normalizeStatus(tx.status);
                const statusStyle =
                  sKey === "completed"
                    ? styles.walletTxStatusCompleted
                    : sKey === "failed"
                    ? styles.walletTxStatusFailed
                    : styles.walletTxStatusPending;

                return (
                  <View key={tx.id}>
                    <Pressable style={styles.walletTxRow}>
                      <View style={styles.walletTxIconWrap}>
                        <Text style={styles.walletTxIconText}>⇄</Text>
                      </View>

                      <View style={styles.walletTxMid}>
                        <Text style={styles.walletTxName} numberOfLines={1}>
                          {tx.recipientName}
                        </Text>

                        <Text style={styles.walletTxBank} numberOfLines={1}>
                          {tx.recipientBank}
                        </Text>

                        <View style={styles.walletTxMetaRow}>
                          <Text style={styles.walletTxTime}>
                            {new Date(tx.createdAt).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </Text>

                          <Text style={[styles.walletTxStatus, statusStyle]}>
                            • {statusLabel(tx.status)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.walletTxRight}>
                        <Text style={[styles.walletTxAmt, styles.walletTxAmtNeg]}>
                          -₦{Number(tx.amount || 0).toLocaleString()}
                        </Text>
                      </View>
                    </Pressable>

                    {idx !== items.length - 1 && <View style={styles.walletTxDivider} />}
                  </View>
                );
              })}
            </View>
          </View>
        ))}
        <View style={{ height: 18 }} />
      </ScrollView>
    );
  };

  // Render non-NGN wallet transactions
  const renderWalletTransactions = () => {
    if (loadingTransactions) {
      return <ActivityIndicator size="small" color={COLORS.primary} style={styles.walletTxLoading} />;
    }
    
    if (walletTransactions.length === 0) {
      return <Text style={styles.walletTxEmpty}>No transactions yet</Text>;
    }

    // Group transactions by formatted date
    const groups = walletTransactions.reduce<Record<string, WalletTransaction[]>>((acc, tx) => {
      const key = formatDate(tx.createdAt);
      if (!acc[key]) acc[key] = [];
      acc[key].push(tx);
      return acc;
    }, {});

    // Sort groups by date (newest first)
    const groupEntries = Object.entries(groups).sort((a, b) => {
      const da = new Date(a[0]).getTime();
      const db = new Date(b[0]).getTime();
      return db - da;
    });

    // Sort each group by createdAt (newest first)
    groupEntries.forEach(([, arr]) => {
      arr.sort((x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime());
    });

    return (
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshingTransactions}
            onRefresh={onRefreshTransactions}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {groupEntries.map(([dateLabel, items]) => (
          <View key={dateLabel}>
            <Text style={styles.walletTxGroupTitle}>{dateLabel}</Text>

            <View style={styles.walletTxCard}>
              {items.map((tx, idx) => {
                const sKey = normalizeStatus(tx.status);
                const statusStyle =
                  sKey === "completed"
                    ? styles.walletTxStatusCompleted
                    : sKey === "failed"
                    ? styles.walletTxStatusFailed
                    : styles.walletTxStatusPending;

                const txIsCredit = isCredit(tx.transactionType);

                return (
                  <View key={tx.id || tx.reference}>
                    <Pressable
                      style={styles.walletTxRow}
                      onPress={() => {
                        router.push(`/transaction-detail/${tx.reference}` as any);
                      }}
                    >
                      <View style={styles.walletTxIconWrap}>
                        <Text style={styles.walletTxIconText}>{getTransactionIcon(tx.transactionType)}</Text>
                      </View>

                      <View style={styles.walletTxMid}>
                        <Text style={styles.walletTxName} numberOfLines={1}>
                          {tx.counterpartyName || tx.description || tx.transactionType || "Transaction"}
                        </Text>

                        <Text style={styles.walletTxBank} numberOfLines={1}>
                          {tx.counterpartyBank || tx.provider || tx.transactionType}
                        </Text>

                        <View style={styles.walletTxMetaRow}>
                          <Text style={styles.walletTxTime}>
                            {new Date(tx.createdAt).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </Text>

                          <Text style={[styles.walletTxStatus, statusStyle]}>
                            • {statusLabel(tx.status)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.walletTxRight}>
                        <Text style={[styles.walletTxAmt, txIsCredit ? styles.walletTxAmtPos : styles.walletTxAmtNeg]}>
                          {txIsCredit ? "+" : "-"}{tx.currency} {Number(tx.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                      </View>
                    </Pressable>

                    {idx !== items.length - 1 && <View style={styles.walletTxDivider} />}
                  </View>
                );
              })}
            </View>
          </View>
        ))}
        <View style={{ height: 18 }} />
      </ScrollView>
    );
  };

  return (
    <ScreenShell>
      <View style={styles.centerHeader}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Wallet</Text>
          </View>
        </View>
        <Text style={styles.flagBig}>{account.flag}</Text>
        <Text style={styles.walletTitle}>{account.currencyCode} balance</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={styles.walletAmount}>{formatBalance(displayBalance, account.currencyCode)}</Text>
          {refreshing && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginLeft: 8 }} />}
        </View>
        
        <View style={{ alignItems: 'center', marginTop: 4 }}>
          <PendingBadge visible={hasPending} label="Settling" size="medium" variant="pill" />
        </View>

        {hasPending && (
          <View style={{ backgroundColor: "#FEF3C7", padding: 12, marginHorizontal: 16, marginTop: 12, borderRadius: 8, flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>⏳</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: "#92400E", fontSize: 13 }}>Conversion Settling</Text>
              <Text style={{ color: "#92400E", fontSize: 11, marginTop: 2 }}>Send, withdraw, and convert are disabled until settlement completes.</Text>
            </View>
          </View>
        )}

        {!isNGN && (
          <Pressable style={styles.limitsPill}>
            <Text style={{ marginRight: 8 }}>🪙</Text>
            <Text style={{ fontWeight: "800", color: "#2D2D2D" }}>View account limits</Text>
          </Pressable>
        )}

        <View style={styles.walletActionRow}>
          <WalletAction icon="↑" label="Send" onPress={hasPending ? handleBlockedBySettlement : () => router.push(`/sendmoney?from=${account.currencyCode}`)} />
          <WalletAction icon="＋" label="Add" onPress={() => router.push("/addmoneymethods")} />
          <WalletAction icon="－" label="Withdraw" onPress={hasPending ? handleBlockedBySettlement : () => {}} />
          <WalletAction icon="↻" label="Convert" onPress={hasPending ? handleBlockedBySettlement : () => router.push(`/convert?from=${account.currencyCode}`)} />
        </View>

        <View style={styles.pillTabs}>
          <Pressable
            style={[styles.pillTab, tab === "Transactions" && styles.pillTabActive]}
            onPress={() => setTab("Transactions")}
          >
            <Text style={[styles.pillTabText, tab === "Transactions" && styles.pillTabTextActive]}>
              Transactions
            </Text>
          </Pressable>
          {!isNGN && (
            <Pressable
              style={[styles.pillTab, tab === "Account" && styles.pillTabActive]}
              onPress={() => setTab("Account")}
            >
              <Text style={[styles.pillTabText, tab === "Account" && styles.pillTabTextActive]}>
                Account details
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {tab === "Transactions" ? (
        <View>
          {isNGN ? renderNGNTransactions() : renderWalletTransactions()}
        </View>
      ) : (
        <View style={{ marginTop: 18 }}>
          <Text style={styles.sectionTitle}>Account details</Text>
          <View style={styles.detailsCard}>
            <DetailRow k="Account name" v={account.accountName || "—"} />
            <DetailRow k="Currency" v={`${account.currencyName} (${account.currencyCode})`} />
            {account.iban && <DetailRow k="IBAN" v={account.iban} />}
            {account.bicSwift && <DetailRow k="BIC/SWIFT" v={account.bicSwift} />}
            {account.accountNumber && <DetailRow k="Account Number" v={account.accountNumber} />}
            {account.routingNumber && <DetailRow k="Routing Number" v={account.routingNumber} />}
            {account.sortCode && <DetailRow k="Sort Code" v={account.sortCode} />}
            {account.bankName && <DetailRow k="Bank Name" v={account.bankName} />}
            {account.bankAddress && <DetailRow k="Bank Address" v={account.bankAddress} />}
            <DetailRow k="Status" v={account.status || "Active"} />
          </View>
        </View>
      )}
    </ScreenShell>
  );
}
