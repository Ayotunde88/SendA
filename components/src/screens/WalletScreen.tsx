import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native";
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


interface AccountDetails {
  id: string;
  currencyCode: string;
  accountName: string;
  iban?: string;
  bicSwift?: string;
  status: string;
  balance: number | null;
  flag: string;
  isExotic?: boolean;
  currencyName: string;
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

  const isNGN = account?.currencyCode?.toUpperCase() === "NGN";

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

      if (isLocalLedger) {
        // Exotic currencies (including NGN) live in the local ledger
        const response = await getLocalBalance(phone, account.currencyCode);
        if (response.success) {
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
    } catch (error) {
      console.log("Failed to refresh balance:", error);
    } finally {
      setRefreshing(false);
    }
  }, [account?.currencyCode, account?.isExotic, isNGN]);


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
      if (account) {
        console.log('[WalletScreen] Focus - refreshing balance for', account.currencyCode);
        refreshBalance();
        if (isNGN) {
          fetchNGNTransactions();
        } else {
          fetchWalletTransactions();
        }
      }
    }, [account?.currencyCode, isNGN, refreshBalance, fetchNGNTransactions, fetchWalletTransactions])
  );

  const formatBalance = (balance: number | null, currencyCode: string) => {
    if (balance === null || balance === undefined) return `0.00 ${currencyCode}`;
    return `${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyCode}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "successful":
        return "#22C55E";
      case "pending":
        return "#F59E0B";
      case "failed":
        return "#EF4444";
      default:
        return "#888";
    }
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

  return (
    <ScreenShell>
      <View style={styles.centerHeader}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Wallet</Text>
            {/* <Text style={styles.subtitle}>Send Money To Other Wallet</Text> */}
          </View>
        </View>
        <Text style={styles.flagBig}>{account.flag}</Text>
        <Text style={styles.walletTitle}>{account.currencyCode} balance</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.walletAmount}>{formatBalance(account.balance, account.currencyCode)}</Text>
          {refreshing && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginLeft: 8 }} />}
        </View>

        {!isNGN && (
          <Pressable style={styles.limitsPill}>
            <Text style={{ marginRight: 8 }}>🪙</Text>
            <Text style={{ fontWeight: "800", color: "#2D2D2D" }}>View account limits</Text>
          </Pressable>
        )}

        {isNGN ? (
          // NGN-specific actions
          <View style={styles.walletActionRow}>
            <WalletAction icon="↑" label="Send" onPress={() => router.push(`/sendmoney?from=${account.currencyCode}`)} />
            <WalletAction icon="＋" label="Add" onPress={() => router.push("/addmoneymethods")} />
            <WalletAction icon="－" label="Withdraw" onPress={() => {}} />
              <WalletAction 
              icon="↻" 
              label="Convert" 
              onPress={() => router.push(`/convert?from=${account.currencyCode}`)} 
            />
          </View>
        ) : (
          // Regular wallet actions
          <View style={styles.walletActionRow}>
            <WalletAction icon="↑" label="Send" onPress={() => router.push(`/sendmoney?from=${account.currencyCode}`)} />
            <WalletAction icon="＋" label="Add" onPress={() => router.push("/addmoneymethods")} />
            <WalletAction icon="－" label="Withdraw" onPress={() => {}} />
            <WalletAction
              icon="↻"
              label="Convert"
              onPress={() => router.push(`/convert?from=${account.currencyCode}`)}
            />
          </View>
        )}

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
        <View >
          {isNGN ? (
            loadingTransactions ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={styles.walletTxLoading} />
            ) : ngnTransactions.length === 0 ? (
              <Text style={styles.walletTxEmpty}>No transactions yet</Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {(() => {
                  // --- Group transactions by formatted date (e.g. "Jan 12, 2026") ---
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
                  groupEntries.forEach(([k, arr]) => {
                    arr.sort((x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime());
                  });

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

                  return groupEntries.map(([dateLabel, items]) => (
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
                              <Pressable
                                style={styles.walletTxRow}
                                onPress={() => {
                                  // OPTIONAL: route to details later
                                  // router.push({ pathname: "/transaction-details", params: { tx: JSON.stringify(tx) } } as any);
                                }}
                              >
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

                                  {/* If you want a second line for status color (like older UI), uncomment:
                                  <Text style={[styles.walletTxStatus, { marginTop: 4, color: getStatusColor(tx.status) }]}>
                                    {statusLabel(tx.status)}
                                  </Text>
                                  */}
                                </View>
                              </Pressable>

                              {idx !== items.length - 1 && <View style={styles.walletTxDivider} />}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ));
                })()}
                <View style={{ height: 18 }} />
              </ScrollView>
            )
          ) : (
            <Text style={styles.walletTxEmpty}>No transactions yet</Text>
          )}
        </View>
      ) : (
        // ... keep your Account details section as-is
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
