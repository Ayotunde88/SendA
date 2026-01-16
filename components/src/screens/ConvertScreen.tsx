import React, { useState, useEffect, useCallback } from "react";
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
import {
  getUserWallets,
  getConversionQuote,
  executeConversion,
} from "../../../api/config";
import { addPendingSettlement, usePendingSettlements } from "../../UsePendingSettlements";


async function applyOptimisticCacheUpdate(params: {
  sellCurrency: string;
  buyCurrency: string;
  sellAmount: number;
  buyAmount: number;
}) {
  const raw = await AsyncStorage.getItem("cached_accounts_v1");
  const list = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(list)) return;

  const sell = params.sellCurrency.toUpperCase().trim();
  const buy = params.buyCurrency.toUpperCase().trim();

  const updated = list.map((a: any) => {
    const ccy = String(a.currencyCode || "").toUpperCase().trim();
    const bal = typeof a.balance === "number" ? a.balance : null;

    if (bal === null) return a;

    if (ccy === sell) return { ...a, balance: bal - params.sellAmount };
    if (ccy === buy) return { ...a, balance: bal + params.buyAmount };
    return a;
  });

  await AsyncStorage.setItem("cached_accounts_v1", JSON.stringify(updated));
}


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
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [fromWallet, setFromWallet] = useState<Wallet | null>(null);
  const [toWallet, setToWallet] = useState<Wallet | null>(null);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [balanceExceeded, setBalanceExceeded] = useState(false);

  // Modal states
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // Pending settlements for optimistic balance display
  const {
    hasPendingForCurrency,
    getOptimisticBalance,
  } = usePendingSettlements();

  // Get optimistic balances for display (accounting for pending settlements)
  const getDisplayBalance = useCallback((wallet: Wallet | null) => {
    if (!wallet) return 0;
        return getOptimisticBalance(wallet.balance, wallet.currencyCode);
  }, [getOptimisticBalance]);

  const fromDisplayBalance = getDisplayBalance(fromWallet);
  const toDisplayBalance = getDisplayBalance(toWallet);
  const fromHasPending = fromWallet ? hasPendingForCurrency(fromWallet.currencyCode) : false;

  // Load user phone from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem("user_phone").then((phone) => {
      if (phone) {
        setUserPhone(phone);
      } else {
        setLoading(false);
      }
    });
  }, []);

  // Load wallets when phone is available
  useEffect(() => {
    if (userPhone) {
      loadWallets();
    }
  }, [userPhone]);

  // Check balance exceeded (use optimistic display balance)
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
      const response = await getUserWallets(userPhone);
      if (response.success) {
        const activeWallets = response.wallets.filter(
          (w: Wallet) => w.status === "active"
        );
        setWallets(response.wallets);

        // Pre-select wallets based on URL params
        let selectedFrom: Wallet | null = null;
        let selectedTo: Wallet | null = null;

        if (initialFromCurrency) {
          selectedFrom = activeWallets.find(
            (w: Wallet) => w.currencyCode.toUpperCase() === initialFromCurrency.toUpperCase()
          ) || null;
        }

        if (initialToCurrency) {
          selectedTo = activeWallets.find(
            (w: Wallet) => w.currencyCode.toUpperCase() === initialToCurrency.toUpperCase()
          ) || null;
        }

        // Set from wallet
        if (selectedFrom) {
          setFromWallet(selectedFrom);
        } else if (activeWallets.length >= 1) {
          setFromWallet(activeWallets[0]);
        }

        // Set to wallet
        if (selectedTo && selectedTo.currencyCode !== selectedFrom?.currencyCode) {
          setToWallet(selectedTo);
        } else if (activeWallets.length >= 2) {
          const fromCode = selectedFrom?.currencyCode || activeWallets[0]?.currencyCode;
          const otherWallet = activeWallets.find((w: Wallet) => w.currencyCode !== fromCode);
          if (otherWallet) setToWallet(otherWallet);
        }
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

  // Fetch quote when amount or currencies change
  const fetchQuote = useCallback(async () => {
    if (
      !fromWallet ||
      !toWallet ||
      !fromAmount ||
      parseFloat(fromAmount) <= 0
    ) {
      setToAmount("");
      setRate(null);
      return;
    }

    setQuoteLoading(true);
    try {
      const response = await getConversionQuote(
        userPhone,
        fromWallet.currencyCode,
        toWallet.currencyCode,
        parseFloat(fromAmount)
      );

      if (response.success) {
        setToAmount(response.quote.buyAmount.toFixed(2));
        setRate(response.quote.rate);
      } else {
        setToAmount("");
        setRate(null);
        if (response.message) {
          console.log("Quote error:", response.message);
        }
      }
    } catch (error) {
      console.error("Quote failed:", error);
      setToAmount("");
      setRate(null);
    } finally {
      setQuoteLoading(false);
    }
  }, [fromWallet, toWallet, fromAmount, userPhone]);

  // Debounce quote fetching
  useEffect(() => {
    const debounce = setTimeout(fetchQuote, 500);
    return () => clearTimeout(debounce);
  }, [fetchQuote]);

  const handleQuickAmount = (percentage: number) => {
    if (fromWallet && fromDisplayBalance > 0) {
      const amount = (fromDisplayBalance * percentage).toFixed(2);
      setFromAmount(amount);
    }
  };

  const handleConvert = async () => {
    if (!fromWallet || !toWallet || !fromAmount) return;

    const amount = parseFloat(fromAmount);

    if (amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }

    // Block if source wallet has pending settlement
    if (fromHasPending) {
      Alert.alert(
        "Settlement in Progress",
        `Your ${fromWallet.currencyCode} wallet has a pending conversion that is still settling. Please wait for settlement to complete before converting.`,
        [{ text: "OK" }]
      );
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

    // Show confirmation before executing
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

  const sellBalanceBefore = fromDisplayBalance; // ✅ capture before
  const buyBalanceBefore = toDisplayBalance;   // ✅ capture before

  setConverting(true);
  try {
    const sellAmountInput = parseFloat(fromAmount);

    const response = await executeConversion(
      userPhone,
      fromWallet.currencyCode,
      toWallet.currencyCode,
      sellAmountInput
    );

    if (response.success) {
      const conversionData = response.conversion;

      const sellAmount = Number(conversionData?.sellAmount ?? sellAmountInput);
      const buyAmount = Number(conversionData?.buyAmount ?? parseFloat(toAmount) ?? 0);

      const sellCurrency = String(conversionData?.sellCurrency ?? fromWallet.currencyCode).toUpperCase();
      const buyCurrency = String(conversionData?.buyCurrency ?? toWallet.currencyCode).toUpperCase();

      const conversionId = conversionData?.id || response.conversionId || response.id;

      // ✅ Always add pending if settlement is not instant
      if (response.balanceUpdatePending) {
        await addPendingSettlement({
          sellCurrency,
          buyCurrency,
          sellAmount,
          buyAmount,
          conversionId,
          sellBalanceBefore,
          buyBalanceBefore,
        } as any);
      }

      // ✅ Update persistent cache immediately (Home & Wallet will reflect instantly)
      await applyOptimisticCacheUpdate({
        sellCurrency,
        buyCurrency,
        sellAmount,
        buyAmount,
      });

      // ✅ Update current screen wallets immediately too
      setWallets((prev) =>
        prev.map((w) => {
          const ccy = w.currencyCode.toUpperCase();
          if (ccy === sellCurrency) {
            return { ...w, balance: (typeof w.balance === "number" ? w.balance : 0) - sellAmount };
          }
          if (ccy === buyCurrency) {
            return { ...w, balance: (typeof w.balance === "number" ? w.balance : 0) + buyAmount };
          }
          return w;
        })
      );

      // also update the selected wallets objects
      setFromWallet((prev) =>
        prev ? { ...prev, balance: (typeof prev.balance === "number" ? prev.balance : 0) - sellAmount } : prev
      );
      setToWallet((prev) =>
        prev ? { ...prev, balance: (typeof prev.balance === "number" ? prev.balance : 0) + buyAmount } : prev
      );

      const pendingNote = response.balanceUpdatePending
        ? "\n\nBalance will update shortly once settlement completes."
        : "";

      router.push({
        pathname: "/result",
        params: {
          type: "success",
          title: response.balanceUpdatePending ? "Conversion Processing" : "Conversion Complete",
          message: `You converted ${sellAmount.toFixed(2)} ${sellCurrency} to ${buyAmount.toFixed(2)} ${buyCurrency}${pendingNote}`,
          subtitle: `Rate: 1 ${sellCurrency} = ${(conversionData?.rate ?? rate ?? 0).toFixed(4)} ${buyCurrency}`,
          primaryText: "Done",
          primaryRoute: "/(tabs)",
          secondaryText: "View wallet",
          secondaryRoute: "/wallet",
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

  // Show existing wallets with prompt to add more when < 2 wallets
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
          <Text style={{ fontSize: 22, fontWeight: "bold", color: "#333", marginBottom: 8 }}>
            Convert Currency
          </Text>
          <Text style={{ fontSize: 14, color: "#666", marginBottom: 24 }}>
            You need at least 2 currency wallets to convert between currencies.
          </Text>

          {/* Show existing wallets */}
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
                  <Text style={{ fontSize: 28, marginRight: 12 }}>{wallet.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "600", color: "#333" }}>
                      {wallet.currencyName}
                    </Text>
                    <Text style={{ fontSize: 14, color: "#666" }}>
                      {wallet.formattedBalance} {wallet.currencyCode}
                    </Text>
                  </View>
                  {wallet.status !== "active" && (
                    <View
                      style={{
                        backgroundColor: "#9E9E9E",
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 4,
                      }}
                    >
                      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "600" }}>
                        INACTIVE
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* No wallets message */}
          {wallets.length === 0 && (
            <View
              style={{
                backgroundColor: "#FFF3E0",
                borderRadius: 12,
                padding: 16,
                marginBottom: 24,
              }}
            >
              <Text style={{ color: "#E65100", fontSize: 14 }}>
                You don't have any currency wallets yet. Add your first currency to get started.
              </Text>
            </View>
          )}

          {/* Add more currencies button */}
          <Pressable
            style={{
              backgroundColor: "#2E9E6A",
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
            }}
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
    fromWallet &&
    toWallet &&
    fromAmount &&
    parseFloat(fromAmount) > 0 &&
    !balanceExceeded &&
    !fromHasPending &&
    rate &&
    !quoteLoading;

  return (
    <ScreenShell>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Convert Currency</Text>
              <Text style={styles.subtitle}>Convert money from one currency to another</Text>
            </View>
          </View>
          {/* FROM Section */}
          <View style={styles.convertBox}>
            <Text style={{ color: "#2E9E6A", fontWeight: "900" }}>
              You are converting
            </Text>
            <View style={styles.convertRow}>
              <TextInput
                value={fromAmount}
                onChangeText={setFromAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor="#BDBDBD"
                style={[
                  styles.amountInput,
                  { fontSize: 28 },
                  balanceExceeded && { color: "#EF4444" },
                ]}
              />
              <CurrencyPill
                flag={fromWallet?.flag || "🏳️"}
                code={fromWallet?.currencyCode || "Select"}
                onPress={() => setShowFromPicker(true)}
              />
            </View>
            <Text
              style={[
                styles.convertBalance,
                balanceExceeded && { color: "#EF4444" },
              ]}
            >
              Balance: {fromDisplayBalance.toFixed(2)}{" "}
              {fromWallet?.currencyCode || ""}
            </Text>
            {balanceExceeded && (
              <Text style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}>
                ⚠️ Insufficient balance
              </Text>
            )}
            {fromHasPending && (
              <Text style={{ color: "#F59E0B", fontSize: 12, marginTop: 4 }}>
                ⏳ Settlement pending - conversion blocked
              </Text>
            )}

            {/* Quick Amount Buttons */}
            <View style={{ flexDirection: "row", marginTop: 12 }}>
              <QuickAmountButton
                label="25%"
                onPress={() => handleQuickAmount(0.25)}
                disabled={!fromWallet || fromDisplayBalance <= 0 || fromHasPending}
              />
              <QuickAmountButton
                label="50%"
                onPress={() => handleQuickAmount(0.5)}
                disabled={!fromWallet || fromDisplayBalance <= 0 || fromHasPending}
              />
              <QuickAmountButton
                label="75%"
                onPress={() => handleQuickAmount(0.75)}
                disabled={!fromWallet || fromDisplayBalance <= 0 || fromHasPending}
              />
              <QuickAmountButton
                label="MAX"
                onPress={() => handleQuickAmount(1.0)}
                disabled={!fromWallet || fromDisplayBalance <= 0 || fromHasPending}
              />
            </View>
          </View>

          {/* Rate Display */}
          <View style={styles.convertMid}>
            <Pressable onPress={swapCurrencies}>
              <Text style={{ fontSize: 24 }}>⇅</Text>
            </Pressable>
            {rate ? (
              <Text style={styles.muted}>
                1 {fromWallet?.currencyCode} = {rate.toFixed(4)}{" "}
                {toWallet?.currencyCode}
              </Text>
            ) : quoteLoading ? (
              <Text style={styles.muted}>Fetching rate...</Text>
            ) : (
              <Text style={styles.muted}>Enter amount to see rate</Text>
            )}
            <Text style={styles.muted}>⚡ Instant conversion</Text>
          </View>

          {/* TO Section */}
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
                onPress={() => setShowToPicker(true)}
              />
            </View>
            <Text style={styles.convertBalance}>
              Balance: {toDisplayBalance.toFixed(2)}{" "}
              {toWallet?.currencyCode || ""}
            </Text>
          </View>

          {/* Convert Button */}
          <Pressable
            style={canConvert ? styles.primaryBtn : styles.disabledBigBtn}
            onPress={handleConvert}
            disabled={!canConvert || converting}
          >
            {converting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={{
                  color: canConvert ? "#fff" : "#B3B3B3",
                  fontWeight: "900",
                  fontSize: 18,
                }}
              >
                Convert
              </Text>
            )}
          </Pressable>

          {/* Currency Picker Modals */}
          <CurrencyPickerModal
            visible={showFromPicker}
            onClose={() => setShowFromPicker(false)}
            wallets={wallets.filter(
              (w) => w.currencyCode !== toWallet?.currencyCode
            )}
            selected={fromWallet}
            onSelect={setFromWallet}
            title="Convert From"
          />

          <CurrencyPickerModal
            visible={showToPicker}
            onClose={() => setShowToPicker(false)}
            wallets={wallets.filter(
              (w) => w.currencyCode !== fromWallet?.currencyCode
            )}
            selected={toWallet}
            onSelect={setToWallet}
            title="Convert To"
          />
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </ScreenShell>
  );
}