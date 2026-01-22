import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAutoPolling } from "../../../hooks/useAutoPolling";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams } from "expo-router";
import ScreenShell from "./../../ScreenShell";
import CurrencyPill from "./../../CurrencyPill";
import CurrencyPickerModal, { Wallet } from "./../../CurrencyPickerModal";
import { styles } from "../../../theme/styles";
import { router } from "expo-router";
import { getUserWallets, getConversionQuote, executeConversion } from "../../../api/config";
import { addPendingSettlement, usePendingSettlements } from "../../../hooks/usePendingSettlements";
import FeeBreakdown, { FeeInfo } from "../../../components/FeeBreakdown";
import CountryFlag from "../../../components/CountryFlag";

// ✅ FIX: extend Wallet locally to include countryCode (API may return it)
type WalletWithCountry = Wallet & { countryCode?: string };

// Quick amount button component
const QuickAmountButton = ({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) => (
  <Pressable
    style={{
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: disabled ? "#E0E0E0" : "#F0F0F0",
      borderRadius: 16,
      marginRight: 8,
      opacity: disabled ? 0.5 : 1,
    }}
    onPress={onPress}
    disabled={disabled}
  >
    <Text style={{ color: "#333", fontWeight: "600", fontSize: 13 }}>{label}</Text>
  </Pressable>
);

export default function ConvertScreen() {
  const params = useLocalSearchParams();
  const initialFromCurrency = params.from as string | undefined;
  const initialToCurrency = params.to as string | undefined;

  const [userPhone, setUserPhone] = useState<string>("");
  const [wallets, setWallets] = useState<WalletWithCountry[]>([]);
  const [fromWallet, setFromWallet] = useState<WalletWithCountry | null>(null);
  const [toWallet, setToWallet] = useState<WalletWithCountry | null>(null);

  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [balanceExceeded, setBalanceExceeded] = useState(false);
  const [feeInfo, setFeeInfo] = useState<FeeInfo | null>(null);

  // Prevent wallet refreshes (polling / focus reload) from resetting user selections.
  const selectedFromCodeRef = useRef<string | null>(null);
  const selectedToCodeRef = useRef<string | null>(null);

  // Modal states
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const handleSelectFrom = useCallback(
    (w: Wallet) => {
      const next = w as WalletWithCountry;
      selectedFromCodeRef.current = next.currencyCode;
      setFromWallet(next);

      // If user picks same currency as "to", auto-swap
      if (toWallet && toWallet.currencyCode === next.currencyCode) {
        selectedToCodeRef.current = fromWallet?.currencyCode ?? null;
        setToWallet(fromWallet);
      }
    },
    [fromWallet, toWallet]
  );

  const handleSelectTo = useCallback(
    (w: Wallet) => {
      const next = w as WalletWithCountry;
      selectedToCodeRef.current = next.currencyCode;
      setToWallet(next);

      // If user picks same currency as "from", auto-swap
      if (fromWallet && fromWallet.currencyCode === next.currencyCode) {
        selectedFromCodeRef.current = toWallet?.currencyCode ?? null;
        setFromWallet(toWallet);
      }
    },
    [fromWallet, toWallet]
  );

  // Pending settlements for optimistic balance display
  const { hasPendingForCurrency, getOptimisticBalance } = usePendingSettlements();

  const getDisplayBalance = useCallback(
    (wallet: WalletWithCountry | null) => {
      if (!wallet) return 0;
      return getOptimisticBalance(wallet.balance, wallet.currencyCode);
    },
    [getOptimisticBalance]
  );

  const fromDisplayBalance = getDisplayBalance(fromWallet);
  const toDisplayBalance = getDisplayBalance(toWallet);

  const fromHasPending = hasPendingForCurrency(fromWallet?.currencyCode ?? "");

  useEffect(() => {
    AsyncStorage.getItem("user_phone").then((phone) => {
      if (phone) setUserPhone(phone);
      else setLoading(false);
    });
  }, []);

  useAutoPolling(
    useCallback(() => {
      if (userPhone) loadWallets();
    }, [userPhone]),
    { intervalMs: 60000, enabled: !!userPhone, fetchOnMount: true }
  );

  useEffect(() => {
    if (fromWallet && fromAmount) {
      const amount = parseFloat(fromAmount) || 0;
      setBalanceExceeded(amount > fromDisplayBalance);
    } else {
      setBalanceExceeded(false);
    }
  }, [fromAmount, fromWallet, fromDisplayBalance]);

  const loadWallets = async () => {
    try {
      // Load cached balances first
      const cachedRaw = await AsyncStorage.getItem("cached_accounts_v1");
      const cachedAccounts: { currencyCode: string; balance: number }[] = cachedRaw ? JSON.parse(cachedRaw) : [];
      const cachedBalanceMap: Record<string, number> = {};
      cachedAccounts.forEach((a) => {
        if (typeof a.balance === "number") cachedBalanceMap[a.currencyCode?.toUpperCase()] = a.balance;
      });

      const response = await getUserWallets(userPhone);

      if (response.success) {
        const mergedWallets: WalletWithCountry[] = response.wallets.map((w: WalletWithCountry) => {
          const ccy = w.currencyCode?.toUpperCase();
          const cachedBal = cachedBalanceMap[ccy];

          if (cachedBal !== undefined && (w.balance === null || w.balance === undefined)) {
            return { ...w, balance: cachedBal };
          }
          if (typeof cachedBal === "number" && typeof w.balance !== "number") {
            return { ...w, balance: cachedBal };
          }
          return w;
        });

        const activeWallets = mergedWallets.filter((w) => w.status === "active");
        setWallets(mergedWallets);

        const desiredFromCode =
          (selectedFromCodeRef.current ||
            fromWallet?.currencyCode ||
            initialFromCurrency ||
            activeWallets[0]?.currencyCode ||
            null)?.toUpperCase?.() ?? null;

        const desiredToCode =
          (selectedToCodeRef.current || toWallet?.currencyCode || initialToCurrency || null)?.toUpperCase?.() ?? null;

        const nextFrom =
          desiredFromCode
            ? activeWallets.find((w) => w.currencyCode?.toUpperCase() === desiredFromCode) || null
            : activeWallets[0] || null;

        let nextTo: WalletWithCountry | null = null;
        if (desiredToCode && desiredToCode !== nextFrom?.currencyCode?.toUpperCase()) {
          nextTo = activeWallets.find((w) => w.currencyCode?.toUpperCase() === desiredToCode) || null;
        }
        if (!nextTo) nextTo = activeWallets.find((w) => w.currencyCode !== nextFrom?.currencyCode) || null;

        if (nextFrom?.currencyCode) selectedFromCodeRef.current = nextFrom.currencyCode;
        if (nextTo?.currencyCode) selectedToCodeRef.current = nextTo.currencyCode;

        setFromWallet(nextFrom);
        setToWallet(nextTo);
      } else {
        Alert.alert("Error", response.message || "Failed to load wallets");
      }
    } catch (error) {
      console.error("Failed to load wallets:", error);
      Alert.alert("Error", "Failed to load your wallets");
    } finally {
      setLoading(false);
    }
  };

  const fetchQuote = useCallback(async () => {
    if (!fromWallet || !toWallet || !fromAmount || parseFloat(fromAmount) <= 0) {
      setToAmount("");
      setRate(null);
      setFeeInfo(null);
      return;
    }

    setQuoteLoading(true);
    try {
      const response = await getConversionQuote(userPhone, fromWallet.currencyCode, toWallet.currencyCode, parseFloat(fromAmount));

      if (response.success) {
        setToAmount(response.quote.buyAmount.toFixed(2));
        setRate(response.quote.rate);

        if (response.quote.feeAmount !== undefined) {
          setFeeInfo({
            feeAmount: response.quote.feeAmount,
            feeCurrency: response.quote.feeCurrency || fromWallet.currencyCode,
            feeType: response.quote.feeConfig?.fee_type,
            feePercentage: response.quote.feeConfig?.percentage_fee,
            flatFee: response.quote.feeConfig?.flat_fee,
            totalDebit: response.quote.totalDebit,
          });
        } else {
          setFeeInfo(null);
        }
      } else {
        setToAmount("");
        setRate(null);
        setFeeInfo(null);
      }
    } catch (error) {
      console.error("Quote failed:", error);
      setToAmount("");
      setRate(null);
      setFeeInfo(null);
    } finally {
      setQuoteLoading(false);
    }
  }, [fromWallet, toWallet, fromAmount, userPhone]);

  useEffect(() => {
    const debounce = setTimeout(fetchQuote, 500);
    return () => clearTimeout(debounce);
  }, [fetchQuote]);

  const handleQuickAmount = (percentage: number) => {
    if (fromWallet && fromDisplayBalance > 0) {
      setFromAmount((fromDisplayBalance * percentage).toFixed(2));
    }
  };

  const handleConvert = async () => {
    if (!fromWallet || !toWallet || !fromAmount) return;

    const amount = parseFloat(fromAmount);
    if (amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }

    if (amount > fromDisplayBalance) {
      router.push({
        pathname: "/result",
        params: {
          type: "error",
          title: "Conversion Failed",
          message: `Insufficient Balance. You only have ${fromDisplayBalance.toFixed(2)} ${fromWallet.currencyCode}`,
          primaryText: "Try again",
          primaryRoute: "back",
          secondaryText: "Contact support",
          secondaryRoute: "/help",
        },
      });
      return;
    }

    Alert.alert(
      "Confirm Conversion",
      `Convert ${fromAmount} ${fromWallet.currencyCode} to ${toAmount} ${toWallet.currencyCode}?\n\nRate: 1 ${fromWallet.currencyCode} = ${rate?.toFixed(4)} ${toWallet.currencyCode}`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Convert", onPress: executeConversionRequest },
      ]
    );
  };

  const executeConversionRequest = async () => {
    if (!fromWallet || !toWallet || !fromAmount) return;

    setConverting(true);
    try {
      const response = await executeConversion(userPhone, fromWallet.currencyCode, toWallet.currencyCode, parseFloat(fromAmount));

      if (response.success) {
        const conversionData = response.conversion;
        const sellAmount = conversionData?.sellAmount || parseFloat(fromAmount);
        const buyAmount = conversionData?.buyAmount || parseFloat(toAmount);
        const sellCurrency = conversionData?.sellCurrency || fromWallet.currencyCode;
        const buyCurrency = conversionData?.buyCurrency || toWallet.currencyCode;

        if (response.balanceUpdatePending) {
          const KNOWN_EXOTIC_CURRENCIES = ["NGN", "GHS", "RWF", "UGX", "TZS", "ZMW", "XOF", "XAF"];
          const norm = (c: string) => String(c || "").toUpperCase().trim();
          const isExotic = (c: string) => KNOWN_EXOTIC_CURRENCIES.includes(norm(c));

          const pendingSellAmount = isExotic(sellCurrency) ? 0 : sellAmount;
          const pendingBuyAmount = isExotic(buyCurrency) ? 0 : buyAmount;

          if (pendingSellAmount !== 0 || pendingBuyAmount !== 0) {
            await addPendingSettlement({
              sellCurrency: norm(sellCurrency),
              buyCurrency: norm(buyCurrency),
              sellAmount: pendingSellAmount,
              buyAmount: pendingBuyAmount,
              conversionId: conversionData?.id,
              sellBalanceBefore: fromWallet.balance,
              buyBalanceBefore: toWallet.balance,
            });
          }
        }

        router.push({
          pathname: "/result",
          params: {
            type: "success",
            title: "Conversion Complete",
            message: `You converted ${sellAmount.toFixed(2)} ${sellCurrency} to ${buyAmount.toFixed(2)} ${buyCurrency}`,
            subtitle: `Rate: 1 ${sellCurrency} = ${conversionData?.rate?.toFixed(4) || rate?.toFixed(4)} ${buyCurrency}`,
            primaryText: "Done",
            primaryRoute: "/(tabs)",
            secondaryText: "View wallet",
            secondaryRoute: "/(tabs)/wallet",
          },
        });
      } else {
        router.push({
          pathname: "/result",
          params: {
            type: "error",
            title: "Conversion Failed",
            message: response.message || "Something went wrong with the conversion.",
            primaryText: "Try again",
            primaryRoute: "back",
            secondaryText: "Contact support",
            secondaryRoute: "/help",
          },
        });
      }
    } catch (error) {
      console.error("[ConvertScreen] Conversion error:", error);
      router.push({
        pathname: "/result",
        params: {
          type: "error",
          title: "Conversion Failed",
          message: "Network error. Please check your connection and try again.",
          primaryText: "Try again",
          primaryRoute: "back",
          secondaryText: "Contact support",
          secondaryRoute: "/help",
        },
      });
    } finally {
      setConverting(false);
    }
  };

  const swapCurrencies = () => {
    const temp = fromWallet;
    setFromWallet(toWallet);
    setToWallet(temp);
    setFromAmount("");
    setToAmount("");
    setRate(null);
  };

  if (loading) {
    return (
      <ScreenShell>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#2E9E6A" />
          <Text style={{ marginTop: 16, color: "#666" }}>Loading wallets...</Text>
        </View>
      </ScreenShell>
    );
  }

  if (wallets.length < 2) {
    return (
      <ScreenShell>
        <View style={styles.simpleHeader}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
        </View>

        <View style={{ flex: 1, padding: 20 }}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Convert Currency</Text>
              <Text style={styles.subtitle}>You need at least 2 currency wallets to convert between currencies.</Text>
            </View>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => router.push("/addaccount")}
            >
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>+ Add Currency</Text>
            </Pressable>
          </View>
          {wallets.length > 0 && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 12 }}>
                Your Current Wallet{wallets.length > 1 ? "s" : ""}
              </Text>

              {wallets.map((wallet) => (
                <View
                  key={wallet.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: wallet.status === "active" ? "#F5F5F5" : "#E0E0E0",
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 10,
                    opacity: wallet.status === "active" ? 1 : 0.6,
                  }}
                >
                  <CountryFlag currencyCode={wallet.currencyCode} fallbackEmoji={wallet.flag} size="lg" style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "600", color: "#333" }}>{wallet.currencyName}</Text>
                    <Text style={{ fontSize: 14, color: "#666" }}>
                      {wallet.formattedBalance} {wallet.currencyCode}
                    </Text>
                  </View>

                  {wallet.status !== "active" && (
                    <View style={{ backgroundColor: "#9E9E9E", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "600" }}>INACTIVE</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {wallets.length === 0 && (
            <View style={{ backgroundColor: "#FFF3E0", borderRadius: 12, padding: 16, marginBottom: 24 }}>
              <Text style={{ color: "#E65100", fontSize: 14 }}>
                You don't have any currency wallets yet. Add your first currency to get started.
              </Text>
            </View>
          )}

          <Pressable
            style={{ backgroundColor: "#2E9E6A", borderRadius: 12, padding: 16, alignItems: "center" }}
            onPress={() => router.push("/addaccount")}
          >
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
              + Add {wallets.length === 0 ? "Currency" : "Another Currency"}
            </Text>
          </Pressable>

          <Text style={{ fontSize: 12, color: "#999", textAlign: "center", marginTop: 16 }}>
            Add {wallets.length === 0 ? "at least 2 currencies" : "one more currency"} to start converting
          </Text>
        </View>
      </ScreenShell>
    );
  }

  const canConvert =
    !!fromWallet &&
    !!toWallet &&
    !!fromAmount &&
    parseFloat(fromAmount) > 0 &&
    !balanceExceeded &&
    !fromHasPending &&
    !!rate &&
    !quoteLoading;

  return (
    <ScreenShell>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>

            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Convert Currency</Text>
              <Text style={styles.subtitle}>Convert your currency with ease here</Text>
            </View>

            <View style={styles.helpCircle}>
              <Text style={styles.helpCircleText}>?</Text>
            </View>
          </View>

          {/* FROM */}
          <View style={styles.convertBox}>
            <Text style={{ color: "#2E9E6A", fontWeight: "900" }}>You are converting</Text>
            <View style={styles.convertRow}>
              <TextInput
                value={fromAmount}
                onChangeText={setFromAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor="#BDBDBD"
                style={[styles.amountInput, { fontSize: 28 }, balanceExceeded && { color: "#EF4444" }]}
              />
              <CurrencyPill
                flag={fromWallet?.flag || "🏳️"}
                code={fromWallet?.currencyCode || "Select"}
                countryCode={fromWallet?.countryCode ?? ""}
                onPress={() => setShowFromPicker(true)}
              />
            </View>

            <Text style={[styles.convertBalance, balanceExceeded && { color: "#EF4444" }]}>
              Balance: {fromDisplayBalance.toFixed(2)} {fromWallet?.currencyCode || ""}
            </Text>

            {balanceExceeded && <Text style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}>⚠️ Insufficient balance</Text>}
            {fromHasPending && <Text style={{ color: "#F59E0B", fontSize: 12, marginTop: 4 }}>⏳ Settlement pending - conversion blocked</Text>}

            <View style={{ flexDirection: "row", marginTop: 12 }}>
              <QuickAmountButton label="25%" onPress={() => handleQuickAmount(0.25)} disabled={!fromWallet || fromDisplayBalance <= 0 || fromHasPending} />
              <QuickAmountButton label="50%" onPress={() => handleQuickAmount(0.5)} disabled={!fromWallet || fromDisplayBalance <= 0 || fromHasPending} />
              <QuickAmountButton label="75%" onPress={() => handleQuickAmount(0.75)} disabled={!fromWallet || fromDisplayBalance <= 0 || fromHasPending} />
              <QuickAmountButton label="MAX" onPress={() => handleQuickAmount(1.0)} disabled={!fromWallet || fromDisplayBalance <= 0 || fromHasPending} />
            </View>
          </View>

          {/* MID */}
          <View style={styles.convertMid}>
            <Pressable onPress={swapCurrencies}>
              <Text style={{ fontSize: 24 }}>⇅</Text>
            </Pressable>

            {rate ? (
              <Text style={styles.muted}>
                1 {fromWallet?.currencyCode} = {rate.toFixed(4)} {toWallet?.currencyCode}
              </Text>
            ) : quoteLoading ? (
              <Text style={styles.muted}>Fetching rate...</Text>
            ) : (
              <Text style={styles.muted}>Enter amount to see rate</Text>
            )}

            <Text style={styles.muted}>⚡ Instant conversion</Text>
          </View>

          {/* TO */}
          <View style={styles.convertBox}>
            <Text style={{ color: "#2E9E6A", fontWeight: "900" }}>To</Text>
            <View style={styles.convertRow}>
              <TextInput
                value={quoteLoading ? "..." : toAmount}
                editable={false}
                placeholder="0.00"
                placeholderTextColor="#BDBDBD"
                style={[styles.amountInput, { fontSize: 28, color: "#333" }]}
              />
              <CurrencyPill
                flag={toWallet?.flag || "🏳️"}
                code={toWallet?.currencyCode || "Select"}
                countryCode={toWallet?.countryCode ?? ""}
                onPress={() => setShowToPicker(true)}
              />
            </View>

            <Text style={styles.convertBalance}>
              Balance: {toDisplayBalance.toFixed(2)} {toWallet?.currencyCode || ""}
            </Text>
          </View>

          {/* Fee Breakdown */}
          {fromWallet && toWallet && rate && parseFloat(fromAmount) > 0 && (
            <FeeBreakdown
              fee={feeInfo}
              sellAmount={parseFloat(fromAmount)}
              sellCurrency={fromWallet.currencyCode}
              buyAmount={parseFloat(toAmount) || 0}
              buyCurrency={toWallet.currencyCode}
              rate={rate}
            />
          )}

          {/* Convert Button */}
          <Pressable style={!canConvert ? styles.disabledBigBtn : styles.primaryBtn} onPress={handleConvert} disabled={!canConvert || converting}>
            {converting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: canConvert ? "#fff" : "#B3B3B3", fontWeight: "900", fontSize: 18 }}>Convert</Text>
            )}
          </Pressable>

          {/* Pickers */}
          <CurrencyPickerModal
            visible={showFromPicker}
            onClose={() => setShowFromPicker(false)}
            wallets={wallets.filter((w) => w.currencyCode !== toWallet?.currencyCode)}
            selected={fromWallet}
            onSelect={(w) => {
              handleSelectFrom(w);
              setShowFromPicker(false);
            }}
            title="Convert From"
          />

          <CurrencyPickerModal
            visible={showToPicker}
            onClose={() => setShowToPicker(false)}
            wallets={wallets.filter((w) => w.currencyCode !== fromWallet?.currencyCode)}
            selected={toWallet}
            onSelect={(w) => {
              handleSelectTo(w);
              setShowToPicker(false);
            }}
            title="Convert To"
          />
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </ScreenShell>
  );
}
