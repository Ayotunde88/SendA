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
import { getNGNBalance, getFlutterwaveTransactions } from "../../../api/flutterwave";

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
    
    try {
      setRefreshing(true);
      const phone = await AsyncStorage.getItem("user_phone");
      if (!phone) return;

      if (isNGN) {
        // Fetch NGN balance from local wallet
        const response = await getNGNBalance(phone);
        if (response.success) {
          setAccount(prev => prev ? {
            ...prev,
            balance: response.balance
          } : null);
        }
      } else {
        // Fetch from CurrencyCloud (if available)
        const response = (apiConfig as any).getUserWallets ? await (apiConfig as any).getUserWallets(phone) : { success: false };
        if (response.success) {
          const updatedWallet = (response.wallets || []).find(
            (w: any) => w.currencyCode.toUpperCase() === account.currencyCode.toUpperCase()
          );
          if (updatedWallet) {
            setAccount(prev => prev ? {
              ...prev,
              balance: updatedWallet.balance
            } : null);
          }
        }
      }
    } catch (error) {
      console.log("Failed to refresh balance:", error);
    } finally {
      setRefreshing(false);
    }
  }, [account?.currencyCode, isNGN]);

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
        // Map the incoming FlutterwaveTransaction shape to our NGNTransaction shape.
        // Use safe fallbacks for fields that may be named differently by the API.
        const mapped: NGNTransaction[] = (response.transactions || []).map((t: any) => ({
          id: t.id || t.txid || String(t.transaction_id || ""),
          amount: Number(t.amount || t.value || 0),
          recipientName: t.recipientName || t.beneficiary_name || t.customer_name || t.name || "—",
          recipientBank: t.recipientBank || t.beneficiary_bank || t.bank_name || t.bank || "—",
          status: (t.status || t.transaction_status || "unknown").toString(),
          createdAt: t.created_at || t.createdAt || t.date || new Date().toISOString(),
        }));
        setNgnTransactions(mapped);
      }
    } catch (error) {
      console.log("Failed to fetch NGN transactions:", error);
    } finally {
      setLoadingTransactions(false);
    }
  }, [isNGN]);

  useFocusEffect(
    useCallback(() => {
      if (account) {
        console.log('[WalletScreen] Focus - refreshing balance for', account.currencyCode);
        refreshBalance();
        if (isNGN) {
          fetchNGNTransactions();
        }
      }
    }, [account?.currencyCode, isNGN, refreshBalance, fetchNGNTransactions])
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
        <View style={styles.simpleHeader}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
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
        <View style={{ marginTop: 12, paddingHorizontal: 16, flex: 1 }}>
          {isNGN ? (
            // NGN transactions (Flutterwave payouts)
            loadingTransactions ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 24 }} />
            ) : ngnTransactions.length === 0 ? (
              <Text style={{ color: "#888", textAlign: "center", marginTop: 24 }}>
                No transactions yet
              </Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {ngnTransactions.map((tx) => (
                  <View 
                    key={tx.id} 
                    style={{ 
                      backgroundColor: "#F8F8F8", 
                      borderRadius: 12, 
                      padding: 16, 
                      marginBottom: 12 
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "700", fontSize: 16, color: "#2D2D2D" }}>
                          {tx.recipientName}
                        </Text>
                        <Text style={{ color: "#888", fontSize: 13, marginTop: 2 }}>
                          {tx.recipientBank}
                        </Text>
                        <Text style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
                          {formatDate(tx.createdAt)}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ fontWeight: "700", fontSize: 16, color: "#2D2D2D" }}>
                          -₦{tx.amount.toLocaleString()}
                        </Text>
                        <Text style={{ 
                          fontSize: 12, 
                          color: getStatusColor(tx.status),
                          fontWeight: "600",
                          marginTop: 4
                        }}>
                          {tx.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )
          ) : (
            <Text style={{ color: "#888", textAlign: "center", marginTop: 24 }}>
              No transactions yet
            </Text>
          )}
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
