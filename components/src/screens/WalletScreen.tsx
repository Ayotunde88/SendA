import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAutoPolling } from "../../../hooks/useAutoPolling";
import { View, Text, Pressable, ActivityIndicator, ScrollView, RefreshControl, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ScreenShell from "./../../ScreenShell";
import WalletAction from "./../../WalletAction";
import DetailRow from "./../../DetailRow";
import { styles } from "../../../theme/styles";
import { COLORS } from "../../../theme/colors";
import * as apiConfig from "../../../api/config";
import { getLocalBalance, getFlutterwaveTransactions } from "../../../api/flutterwave";
import { getUserTransactions, WalletTransaction } from "../../../api/transactions";
import { usePendingSettlements } from "../../../hooks/usePendingSettlements";

const CACHED_ACCOUNTS_KEY = "cached_accounts_v1";

/** Update a single currency's balance in the shared accounts cache */
async function updateCachedAccountBalance(currencyCode: string, newBalance: number) {
  try {
    const raw = await AsyncStorage.getItem(CACHED_ACCOUNTS_KEY);
    if (!raw) return;
    const accounts = JSON.parse(raw);
    if (!Array.isArray(accounts)) return;

    const ccy = String(currencyCode || "").toUpperCase().trim();
    const updated = accounts.map((acc: any) => {
      if (String(acc?.currencyCode || "").toUpperCase().trim() === ccy) {
        return { ...acc, balance: newBalance };
      }
      return acc;
    });

    await AsyncStorage.setItem(CACHED_ACCOUNTS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.log("[WalletScreen] Failed to update cached account balance:", e);
  }
}

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
  isExotic?: boolean;
  accountNumber?: string;
  routingNumber?: string;
  sortCode?: string;
  bankName?: string;
  bankAddress?: string;
}

interface NGNTransaction {
  id: string; // stable
  amount: number;
  recipientName: string;
  recipientBank: string;
  status: string;
  createdAt: string;
}

/** ---------- helpers ---------- */
function safeNumber(v: any, fallback = 0) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeCcy(v: any) {
  return String(v || "").toUpperCase().trim();
}

/** Stable YYYY-MM-DD key for grouping (prevents group reorder flicker) */
function dayKey(dateString: string) {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "unknown";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function prettyDayLabel(yyyyMmDd: string) {
  if (yyyyMmDd === "unknown") return "Unknown date";
  const [y, m, d] = yyyyMmDd.split("-").map((x) => Number(x));
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Stable tx id fallback (NO random) */
function stableTxId(parts: Array<string | number | undefined | null>) {
  const raw = parts.map((p) => String(p ?? "")).join("|");
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) >>> 0;
  return `h_${h}`;
}

export default function WalletScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [tab, setTab] = useState("Transactions");
  const [account, setAccount] = useState<AccountDetails | null>(null);

  const [refreshingBalance, setRefreshingBalance] = useState(false);

  // Transactions state
  const [ngnTransactions, setNgnTransactions] = useState<NGNTransaction[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);

  // ✅ Separate flags: initial load vs background refresh (prevents flicker)
  const [txInitialLoading, setTxInitialLoading] = useState(true);
  const [txRefreshing, setTxRefreshing] = useState(false);

  const isNGN = account?.currencyCode?.toUpperCase() === "NGN";

  /** ---- Pending settlements (hybrid balance) ---- **/
  const {
    getOptimisticBalance,
    refresh: refreshPendingSettlements,
    settlements,
    checkAndClearIfSettled,
    removeSettlement,
  } = usePendingSettlements();

  const currencyCode = normalizeCcy(account?.currencyCode);
  const displayBalance =
    account?.balance !== null && account?.balance !== undefined
      ? getOptimisticBalance(account.balance, currencyCode)
      : account?.balance;

  // Parse initial account data from params (and hydrate missing balance from cache)
  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      if (!params.accountData) return;

      try {
        const parsed = JSON.parse(params.accountData as string);
        const rawBalance = (parsed as any)?.balance;
        const balanceNum =
          typeof rawBalance === "number"
            ? rawBalance
            : typeof rawBalance === "string" && rawBalance.trim() !== ""
            ? Number(rawBalance)
            : NaN;

        const initialBalance = Number.isFinite(balanceNum) ? balanceNum : null;

        if (cancelled) return;
        setAccount({
          ...(parsed as any),
          balance: initialBalance,
        });

        // If navigation param didn't include a usable balance, try restore from cached accounts.
        if (initialBalance === null) {
          const cachedAccountsRaw = await AsyncStorage.getItem(CACHED_ACCOUNTS_KEY);
          if (!cachedAccountsRaw) return;

          const cached = JSON.parse(cachedAccountsRaw);
          if (!Array.isArray(cached)) return;

          const ccy = normalizeCcy((parsed as any)?.currencyCode);
          const cachedMatch = cached.find((a: any) => normalizeCcy(a?.currencyCode) === ccy);

          const cachedBal = cachedMatch?.balance;
          const cachedNum =
            typeof cachedBal === "number"
              ? cachedBal
              : typeof cachedBal === "string" && cachedBal.trim() !== ""
              ? Number(cachedBal)
              : NaN;

          if (!cancelled && Number.isFinite(cachedNum)) {
            setAccount((prev) => (prev ? { ...prev, balance: cachedNum } : prev));
          }
        }
      } catch (e) {
        console.log("Error parsing account data:", e);
      }
    };

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [params.accountData]);

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (!account?.currencyCode) return;

    const isLocalLedger = Boolean(account?.isExotic) || isNGN;

    try {
      setRefreshingBalance(true);
      const phone = await AsyncStorage.getItem("user_phone");
      if (!phone) return;

      let nextBalance: number | null | undefined = undefined;

      if (isLocalLedger) {
        const response = await getLocalBalance(phone, account.currencyCode);
        const next = safeNumber((response as any)?.balance, NaN);
        if ((response as any)?.success && Number.isFinite(next)) {
          nextBalance = next;
          setAccount((prev) => (prev ? { ...prev, balance: next } : null));
          await updateCachedAccountBalance(account.currencyCode, next);
        }
      } else {
        const response = (apiConfig as any).getUserWallets
          ? await (apiConfig as any).getUserWallets(phone)
          : { success: false };

        if ((response as any)?.success) {
          const updatedWallet = ((response as any).wallets || []).find(
            (w: any) => normalizeCcy(w.currencyCode) === normalizeCcy(account.currencyCode)
          );
          const raw = updatedWallet?.balance;
          const next = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;

          if (Number.isFinite(next)) {
            nextBalance = next;
            setAccount((prev) => (prev ? { ...prev, balance: next } : null));
            await updateCachedAccountBalance(account.currencyCode, next);
          }
        }
      }

      // Clear pending settlement once balances match
      if (typeof nextBalance === "number" && settlements.length > 0) {
        const ccy = normalizeCcy(account.currencyCode);
        const related = settlements.filter(
          (s) => normalizeCcy(s.sellCurrency) === ccy || normalizeCcy(s.buyCurrency) === ccy
        );

        for (const s of related) {
          const sellCcy = normalizeCcy(s.sellCurrency);
          const buyCcy = normalizeCcy(s.buyCurrency);

          const sellNeedsConfirm = safeNumber(s.sellAmount, 0) !== 0;
          const buyNeedsConfirm = safeNumber(s.buyAmount, 0) !== 0;

          const sellSettled =
            !sellNeedsConfirm
              ? true
              : sellCcy === ccy && typeof s.sellBalanceBefore === "number"
              ? await checkAndClearIfSettled(
                  sellCcy,
                  nextBalance,
                  safeNumber(s.sellBalanceBefore, 0) - safeNumber(s.sellAmount, 0),
                  0.01
                )
              : false;

          const buySettled =
            !buyNeedsConfirm
              ? true
              : buyCcy === ccy && typeof s.buyBalanceBefore === "number"
              ? await checkAndClearIfSettled(
                  buyCcy,
                  nextBalance,
                  safeNumber(s.buyBalanceBefore, 0) + safeNumber(s.buyAmount, 0),
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
      setRefreshingBalance(false);
    }
  }, [account?.currencyCode, account?.isExotic, isNGN, settlements, checkAndClearIfSettled, removeSettlement]);

  // ✅ Fetch NGN transactions (supports silent refresh)
  const fetchNGNTransactions = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!isNGN) return;

      const silent = !!opts?.silent;

      try {
        if (!silent) setTxInitialLoading(true);
        setTxRefreshing(silent);

        const phone = await AsyncStorage.getItem("user_phone");
        if (!phone) return;

        const response = await getFlutterwaveTransactions(phone);
        if ((response as any)?.success) {
          const mapped: NGNTransaction[] = ((response as any).transactions || []).map((t: any) => {
            const createdAt =
              t.created_at ??
              t.createdAt ??
              t.created_at_datetime ??
              t.date ??
              new Date().toISOString();

            const amount = safeNumber(t.amount ?? t.amount_paid ?? t.charge, 0);

            const recipientName =
              t.recipient?.name ??
              t.customer?.name ??
              t.name ??
              t.beneficiary_name ??
              t.account_name ??
              "—";

            const recipientBank =
              t.recipient?.bank ??
              t.customer?.bank ??
              t.beneficiary_bank ??
              t.bank ??
              t.account_bank ??
              "—";

            const stableId =
              t.id ??
              t.transaction_id ??
              t.tx_ref ??
              t.flw_ref ??
              stableTxId([createdAt, amount, recipientName, recipientBank, t.status]);

            return {
              id: String(stableId),
              amount,
              recipientName,
              recipientBank,
              status: String(t.status ?? t.transaction_status ?? t.response_code ?? "pending"),
              createdAt: String(createdAt),
            };
          });

          setNgnTransactions(mapped);
        }
      } catch (error) {
        console.log("Failed to fetch NGN transactions:", error);
      } finally {
        setTxInitialLoading(false);
        setTxRefreshing(false);
      }
    },
    [isNGN]
  );

  // ✅ Fetch non-NGN transactions (supports silent refresh)
  const fetchWalletTransactions = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (isNGN || !account?.currencyCode) return;

      const silent = !!opts?.silent;

      try {
        if (!silent) setTxInitialLoading(true);
        setTxRefreshing(silent);

        const phone = await AsyncStorage.getItem("user_phone");
        if (!phone) return;

        const response = await getUserTransactions(phone, 1, 50, account.currencyCode);
        if ((response as any)?.success) {
          // ✅ keep previous list if backend returns empty transiently
          const next = (response as any).transactions || [];
          if (Array.isArray(next)) setWalletTransactions(next);
        }
      } catch (error) {
        console.log("Failed to fetch wallet transactions:", error);
      } finally {
        setTxInitialLoading(false);
        setTxRefreshing(false);
      }
    },
    [isNGN, account?.currencyCode]
  );

  // ✅ Initial load once account is ready
  useEffect(() => {
    if (!account?.currencyCode) return;

    (async () => {
      await refreshPendingSettlements();
      await refreshBalance();
      if (isNGN) await fetchNGNTransactions({ silent: false });
      else await fetchWalletTransactions({ silent: false });
    })();
  }, [account?.currencyCode]);

  // Auto-polling (silent refresh to avoid flicker)
  const fetchAllData = useCallback(async () => {
    if (!account) return;
    await refreshPendingSettlements();
    await refreshBalance();
    if (isNGN) await fetchNGNTransactions({ silent: true });
    else await fetchWalletTransactions({ silent: true });
  }, [account, refreshPendingSettlements, refreshBalance, isNGN, fetchNGNTransactions, fetchWalletTransactions]);

  useAutoPolling(fetchAllData, {
    intervalMs: 15000,
    enabled: !!account?.currencyCode, // ✅ poll even if no settlements (still silent, no flicker)
    fetchOnMount: false, // we already do initial fetch in useEffect above
  });

  // Pull-to-refresh handler (non-silent)
  const onRefreshTransactions = useCallback(async () => {
    setTxRefreshing(true);
    try {
      await refreshPendingSettlements();
      await refreshBalance();
      if (isNGN) await fetchNGNTransactions({ silent: false });
      else await fetchWalletTransactions({ silent: false });
    } finally {
      setTxRefreshing(false);
    }
  }, [isNGN, refreshPendingSettlements, refreshBalance, fetchNGNTransactions, fetchWalletTransactions]);

  const formatBalance = (balance: number | null | undefined, ccy: string) => {
    if (balance === null || balance === undefined) return `— ${ccy}`;
    return `${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${ccy}`;
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

  // ✅ Memoized grouped lists (less re-render churn)
  const ngnGroups = useMemo(() => {
    const groups: Record<string, NGNTransaction[]> = {};
    for (const tx of ngnTransactions) {
      const key = dayKey(tx.createdAt);
      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
    }
    const entries = Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0])); // YYYY-MM-DD sort
    entries.forEach(([, arr]) => arr.sort((x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime()));
    return entries;
  }, [ngnTransactions]);

  const walletGroups = useMemo(() => {
    const groups: Record<string, WalletTransaction[]> = {};
    for (const tx of walletTransactions) {
      const key = dayKey(tx.createdAt);
      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
    }
    const entries = Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    entries.forEach(([, arr]) => arr.sort((x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime()));
    return entries;
  }, [walletTransactions]);

  if (!account) {
    return (
      <ScreenShell>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </ScreenShell>
    );
  }

  const renderTransactionsList = () => {
    if (txInitialLoading) {
      return <ActivityIndicator size="small" color={COLORS.primary} style={styles.walletTxLoading} />;
    }

    if (isNGN) {
      if (ngnTransactions.length === 0) return <Text style={styles.walletTxEmpty}>No transactions yet</Text>;

      return (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={txRefreshing}
              onRefresh={onRefreshTransactions}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          {ngnGroups.map(([day, items]) => (
            <View key={day}>
              <Text style={styles.walletTxGroupTitle}>{prettyDayLabel(day)}</Text>

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
                              {new Date(tx.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            </Text>

                            <Text style={[styles.walletTxStatus, statusStyle]}>• {statusLabel(tx.status)}</Text>
                          </View>
                        </View>

                        <View style={styles.walletTxRight}>
                          <Text style={[styles.walletTxAmt, styles.walletTxAmtNeg]}>
                            -₦{safeNumber(tx.amount, 0).toLocaleString()}
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
    }

    // non-NGN
    if (walletTransactions.length === 0) return <Text style={styles.walletTxEmpty}>No transactions yet</Text>;

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={txRefreshing}
            onRefresh={onRefreshTransactions}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {walletGroups.map(([day, items]) => (
          <View key={day}>
            <Text style={styles.walletTxGroupTitle}>{prettyDayLabel(day)}</Text>

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
                const rowKey = String(tx.id || tx.reference || stableTxId([tx.createdAt, tx.amount, tx.transactionType, tx.currency, tx.counterpartyName]));

                return (
                  <View key={rowKey}>
                    <Pressable
                      style={styles.walletTxRow}
                      onPress={() => router.push(`/transaction-detail/${tx.reference}` as any)}
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
                            {new Date(tx.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </Text>

                          <Text style={[styles.walletTxStatus, statusStyle]}>• {statusLabel(tx.status)}</Text>
                        </View>
                      </View>

                      <View style={styles.walletTxRight}>
                        <Text style={[styles.walletTxAmt, txIsCredit ? styles.walletTxAmtPos : styles.walletTxAmtNeg]}>
                          {txIsCredit ? "+" : "-"}
                          {tx.currency}{" "}
                          {safeNumber(tx.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
          <Text style={styles.walletAmount}>{formatBalance(displayBalance, account.currencyCode)}</Text>
          {refreshingBalance && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginLeft: 8 }} />}
        </View>

        {/* ✅ small, non-flickery indicator */}
        {tab === "Transactions" && txRefreshing && (
          <Text style={{ marginTop: 6, color: "#6b7280", fontSize: 12, fontWeight: "700" }}>Refreshing…</Text>
        )}

        {!isNGN && (
          <Pressable style={styles.limitsPill}>
            <Text style={{ marginRight: 8 }}>🪙</Text>
            <Text style={{ fontWeight: "800", color: "#2D2D2D" }}>View account limits</Text>
          </Pressable>
        )}

        <View style={styles.walletActionRow}>
          <WalletAction icon="↑" label="Send" onPress={() => router.push(`/sendmoney?from=${account.currencyCode}`)} />
          <WalletAction icon="＋" label="Add" onPress={() => router.push("/addmoneymethods")} />
          <WalletAction icon="－" label="Withdraw" onPress={() => {}} />
          <WalletAction icon="↻" label="Convert" onPress={() => router.push(`/convert?from=${account.currencyCode}`)} />
        </View>

        <View style={styles.pillTabs}>
          <Pressable style={[styles.pillTab, tab === "Transactions" && styles.pillTabActive]} onPress={() => setTab("Transactions")}>
            <Text style={[styles.pillTabText, tab === "Transactions" && styles.pillTabTextActive]}>Transactions</Text>
          </Pressable>

          {!isNGN && (
            <Pressable style={[styles.pillTab, tab === "Account" && styles.pillTabActive]} onPress={() => setTab("Account")}>
              <Text style={[styles.pillTabText, tab === "Account" && styles.pillTabTextActive]}>Account details</Text>
            </Pressable>
          )}
        </View>
      </View>

      {tab === "Transactions" ? (
        <View>{renderTransactionsList()}</View>
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
