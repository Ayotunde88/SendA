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
  Modal,
  FlatList,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, router } from "expo-router";
import ScreenShell from "../../../components/ScreenShell";
import CurrencyPill from "../../../components/CurrencyPill";
import { Wallet } from "../../../components/CurrencyPickerModal"; // keep the type
import { styles } from "../../../theme/styles";
import {
  getUserWallets,
  getConversionQuote,
  getPayoutDestinations,
  PayoutDestination,
  calculateSendFee,
} from "../../../api/config";
import FeeBreakdown, { FeeInfo } from "../../../components/FeeBreakdown";
import CountryFlag from "../../../components/CountryFlag";

// ------------------------------------------------------------
// Country code normalization (fixes your countryCode errors)
// ------------------------------------------------------------
const COUNTRY_CODE_BY_CURRENCY: Record<string, string> = {
  CAD: "CA",
  NGN: "NG",
  USD: "US",
  EUR: "EU",
  GBP: "GB",
  KES: "KE",
  GHS: "GH",
  RWF: "RW",
};

function normalizeCountryCode(input?: unknown): string {
  if (typeof input !== "string") return "";
  const trimmed = input.trim();
  if (!trimmed) return "";
  const up = trimmed.toUpperCase();
  if (up.length === 2) return up;
  return COUNTRY_CODE_BY_CURRENCY[up] || "";
}

function getWalletCountryCode(w?: Wallet | null): string {
  const anyW = w as any;
  return normalizeCountryCode(anyW?.countryCode ?? anyW?.country_code ?? w?.currencyCode);
}

function getDestinationCountryCode(d?: PayoutDestination | null): string {
  const anyD = d as any;
  return normalizeCountryCode(anyD?.countryCode ?? anyD?.country_code ?? d?.code);
}

// ------------------------------------------------------------
// Quick Amount Button
// ------------------------------------------------------------
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

export default function SendMoneyScreen() {
  const params = useLocalSearchParams();
  const initialFromCurrency = params.from as string | undefined;

  const [userPhone, setUserPhone] = useState<string>("");
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [fromWallet, setFromWallet] = useState<Wallet | null>(null);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [balanceExceeded, setBalanceExceeded] = useState(false);

  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const [feeInfo, setFeeInfo] = useState<FeeInfo | null>(null);

  // Dynamic payout destinations
  const [payoutDestinations, setPayoutDestinations] = useState<PayoutDestination[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<PayoutDestination | null>(null);
  const [destinationSearch, setDestinationSearch] = useState("");

  // ✅ From wallet picker search (so you have the same UX as destination picker)
  const [fromSearch, setFromSearch] = useState("");

  useEffect(() => {
    AsyncStorage.getItem("user_phone").then((phone) => {
      if (phone) setUserPhone(phone);
      else setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (userPhone) {
      loadWallets();
      loadPayoutDestinations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPhone]);

  useEffect(() => {
    if (fromWallet && fromAmount) {
      const amt = parseFloat(fromAmount) || 0;
      setBalanceExceeded(amt > fromWallet.balance);
    } else {
      setBalanceExceeded(false);
    }
  }, [fromAmount, fromWallet]);

  const loadWallets = async () => {
    try {
      const response = await getUserWallets(userPhone);
      if (response.success) {
        const activeWallets = response.wallets.filter((w: Wallet) => w.status === "active");
        setWallets(activeWallets);

        let selectedFrom: Wallet | null = null;
        if (initialFromCurrency) {
          selectedFrom =
            activeWallets.find(
              (w: Wallet) => w.currencyCode.toUpperCase() === initialFromCurrency.toUpperCase()
            ) || null;
        }

        setFromWallet(selectedFrom || activeWallets[0] || null);
      } else {
        Alert.alert("Error", response.message || "Failed to load wallets");
      }
    } catch (e) {
      Alert.alert("Error", "Failed to load your wallets");
    } finally {
      setLoading(false);
    }
  };

  const loadPayoutDestinations = async () => {
    try {
      const response = await getPayoutDestinations();
      if (response.success && response.destinations.length > 0) {
        setPayoutDestinations(response.destinations);
        const defaultDest =
          response.destinations.find((d: { code: string }) => d.code === "NGN") ||
          response.destinations[0];
        setSelectedDestination(defaultDest);
      }
    } catch (e) {
      console.log("Failed to load payout destinations:", e);
    }
  };

  const fetchQuote = useCallback(async () => {
    if (!fromWallet || !fromAmount || parseFloat(fromAmount) <= 0 || !selectedDestination) {
      setToAmount("");
      setRate(null);
      setFeeInfo(null);
      return;
    }

    const amount = parseFloat(fromAmount);
    const fromCurrency = fromWallet.currencyCode;
    const toCurrency = selectedDestination.code;

    setQuoteLoading(true);

    try {
      // Same-currency transfer
      if (fromCurrency === toCurrency) {
        setToAmount(fromAmount);
        setRate(1);

        const feeResponse = await calculateSendFee({
          phone: userPhone,
          transactionType: "send",
          amount,
          currency: fromCurrency,
        });

        if (feeResponse.success && feeResponse.feeAmount != null) {
          setFeeInfo({
            feeAmount: feeResponse.feeAmount,
            feeCurrency: feeResponse.feeCurrency || fromCurrency,
            feeType: feeResponse.feeConfig?.fee_type,
            feePercentage: feeResponse.feeConfig?.percentage_fee,
            flatFee: feeResponse.feeConfig?.flat_fee,
            totalDebit: feeResponse.totalAmount,
            feeAmountInBaseCurrency: feeResponse.feeAmountInBaseCurrency,
            baseCurrency: feeResponse.baseCurrency,
            baseCurrencySymbol: feeResponse.baseCurrencySymbol,
          });
        } else {
          setFeeInfo(null);
        }

        return;
      }

      // Different currencies
      const response = await getConversionQuote(userPhone, fromCurrency, toCurrency, amount);

      if (response.success) {
        setToAmount(response.quote.buyAmount.toFixed(2));
        setRate(response.quote.rate);

        if (response.quote.feeAmount != null) {
          setFeeInfo({
            feeAmount: response.quote.feeAmount,
            feeCurrency: response.quote.feeCurrency,
            feeType: response.quote.feeType,
            feePercentage: response.quote.feePercentage,
            flatFee: response.quote.flatFee,
            totalDebit: response.quote.totalDebit,
            feeAmountInBaseCurrency: response.quote.feeAmountInBaseCurrency,
            baseCurrency: response.quote.baseCurrency,
            baseCurrencySymbol: response.quote.baseCurrencySymbol,
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
  }, [fromWallet, fromAmount, userPhone, selectedDestination]);

  useEffect(() => {
    const t = setTimeout(fetchQuote, 500);
    return () => clearTimeout(t);
  }, [fetchQuote]);

  const handleQuickAmount = (percentage: number) => {
    if (fromWallet && fromWallet.balance > 0) {
      setFromAmount((fromWallet.balance * percentage).toFixed(2));
    }
  };

  const handleContinue = () => {
    if (!fromWallet || !fromAmount || !selectedDestination) return;

    const amount = parseFloat(fromAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }

    if (amount > fromWallet.balance) {
      Alert.alert(
        "Insufficient Balance",
        `You only have ${fromWallet.formattedBalance} ${fromWallet.currencyCode}`
      );
      return;
    }

    if (!toAmount || parseFloat(toAmount) <= 0) {
      Alert.alert("Quote not ready", "Please wait for the conversion rate.");
      return;
    }

    router.push({
      pathname: "/recipientselect" ,
      params: {
        destCurrency: selectedDestination.code,
        fromWalletId: String(fromWallet.id),
        fromCurrency: fromWallet.currencyCode,
        fromAmount,
        toAmount,
        rate: rate ? String(rate) : "",
      },
    });
  };

  const getPayoutMethodLabel = (dest: PayoutDestination) => {
    if (dest.code === "CAD") return "Send via Interac";
    return `Send to ${dest.countryName} bank account`;
  };

  const filteredDestinations = payoutDestinations.filter(
    (d) =>
      d.code.toLowerCase().includes(destinationSearch.toLowerCase()) ||
      d.countryName.toLowerCase().includes(destinationSearch.toLowerCase()) ||
      d.name.toLowerCase().includes(destinationSearch.toLowerCase())
  );

  // ✅ Wallet filter for the From picker modal
  const filteredWallets = wallets.filter((w) => {
    const q = fromSearch.toLowerCase().trim();
    if (!q) return true;
    const code = String(w.currencyCode || "").toLowerCase();
    const name = String((w as any)?.currencyName || (w as any)?.accountName || "").toLowerCase();
    return code.includes(q) || name.includes(q);
  });

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

  if (wallets.length === 0) {
    return (
      <ScreenShell>
        <View style={{ flex: 1, padding: 20 }}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Send Money</Text>
              <Text style={styles.subtitle}>Send Money To Other Wallet</Text>
            </View>
          </View>

          <Pressable style={styles.primaryBtn} onPress={() => router.push("/addaccount")}>
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>+ Add Currency</Text>
          </Pressable>
        </View>
      </ScreenShell>
    );
  }

  const canContinue =
    !!fromWallet &&
    !!fromAmount &&
    parseFloat(fromAmount) > 0 &&
    !balanceExceeded &&
    !!selectedDestination &&
    (rate || fromWallet.currencyCode === selectedDestination.code) &&
    !quoteLoading &&
    !!toAmount;

  return (
    <ScreenShell>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Send Money</Text>
              <Text style={styles.subtitle}>Send Money To Other Wallet</Text>
            </View>
          </View>

          {/* FROM */}
          <View style={styles.convertBox}>
            <Text style={{ color: "#2E9E6A", fontWeight: "900" }}>You send</Text>
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
                // We keep this for the pill, but the MODAL is now fixed to use rounded flags.
                flag={(fromWallet as any)?.flag || "🏳️"}
                code={fromWallet?.currencyCode || "Select"}
                countryCode={getWalletCountryCode(fromWallet)}
                onPress={() => setShowFromPicker(true)}
              />
            </View>

            <Text style={[styles.convertBalance, balanceExceeded && { color: "#EF4444" }]}>
              Balance: {fromWallet?.formattedBalance || "0.00"} {fromWallet?.currencyCode || ""}
            </Text>

            <View style={{ flexDirection: "row", marginTop: 12 }}>
              <QuickAmountButton label="25%" onPress={() => handleQuickAmount(0.25)} disabled={!fromWallet} />
              <QuickAmountButton label="50%" onPress={() => handleQuickAmount(0.5)} disabled={!fromWallet} />
              <QuickAmountButton label="75%" onPress={() => handleQuickAmount(0.75)} disabled={!fromWallet} />
              <QuickAmountButton label="MAX" onPress={() => handleQuickAmount(1)} disabled={!fromWallet} />
            </View>
          </View>

          {/* MID */}
          <View style={styles.convertMid}>
            <Text style={{ fontSize: 24 }}>↓</Text>
            {rate && selectedDestination ? (
              <Text style={styles.muted}>
                1 {fromWallet?.currencyCode} ={" "}
                {selectedDestination.code === "NGN" ? rate.toFixed(0) : rate.toFixed(4)}{" "}
                {selectedDestination.code}
              </Text>
            ) : quoteLoading ? (
              <Text style={styles.muted}>Fetching rate...</Text>
            ) : fromWallet?.currencyCode === selectedDestination?.code ? (
              <Text style={styles.muted}>No conversion needed</Text>
            ) : (
              <Text style={styles.muted}>Enter amount to see rate</Text>
            )}
            <Text style={styles.muted}>⏱️ Same-day delivery</Text>
          </View>

          {/* TO */}
          <View style={styles.convertBox}>
            <Text style={{ color: "#2E9E6A", fontWeight: "900" }}>
              Recipient gets ({selectedDestination?.code || "Select"})
            </Text>
            <View style={styles.convertRow}>
              <TextInput
                value={quoteLoading ? "..." : toAmount}
                editable={false}
                placeholder="0.00"
                placeholderTextColor="#BDBDBD"
                style={[styles.amountInput, { fontSize: 28, color: "#333" }]}
              />
              <CurrencyPill
                flag={(selectedDestination as any)?.flag || "🏳️"}
                code={selectedDestination?.code || "Select"}
                countryCode={getDestinationCountryCode(selectedDestination)}
                onPress={() => setShowToPicker(true)}
              />
            </View>

            <Text style={styles.convertBalance}>
              {selectedDestination ? getPayoutMethodLabel(selectedDestination) : "Select destination"}
            </Text>

            {/* Fee breakdown */}
            {feeInfo ? (
              <FeeBreakdown
                fee={feeInfo}
                sellAmount={Number(fromAmount) || 0}      // <-- source amount (you pay)
                sellCurrency={fromWallet?.currencyCode || ""}              // <-- your source currency
                buyAmount={Number(toAmount) || 0}        // <-- your destination amount
                buyCurrency={selectedDestination?.code || ""}               // <-- your destination currency
                rate={rate ? Number(rate) : null}        // <-- your quote rate
              />
            ) : null}

          </View>

          <Pressable
            style={canContinue ? styles.primaryBtn : styles.disabledBigBtn}
            onPress={handleContinue}
            disabled={!canContinue}
          >
            <Text style={{ color: canContinue ? "#fff" : "#B3B3B3", fontWeight: "900", fontSize: 18 }}>
              Continue
            </Text>
          </Pressable>

          {/* ✅ FIXED: From Wallet Picker Modal now uses CountryFlag (rounded), not emoji */}
          <Modal visible={showFromPicker} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
              <Pressable
                style={{ flex: 1 }}
                onPress={() => {
                  setShowFromPicker(false);
                  setFromSearch("");
                }}
              />
              <View
                style={{
                  backgroundColor: "#fff",
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  maxHeight: "70%",
                  paddingBottom: 40,
                }}
              >
                <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Pressable
                      onPress={() => {
                        setShowFromPicker(false);
                        setFromSearch("");
                      }}
                      style={{ width: 30, height: 30, justifyContent: "center", alignItems: "center" }}
                    >
                      <Text style={{ fontSize: 18, color: "#6B7280" }}>✕</Text>
                    </Pressable>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: "#1F2937" }}>Send From</Text>
                    <View style={{ width: 30 }} />
                  </View>
                </View>

                <TextInput
                  style={{
                    marginHorizontal: 16,
                    marginVertical: 12,
                    backgroundColor: "#F3F4F6",
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 16,
                    color: "#1F2937",
                  }}
                  placeholder="Search currency..."
                  placeholderTextColor="#999"
                  value={fromSearch}
                  onChangeText={setFromSearch}
                />

                <FlatList
                  data={filteredWallets}
                  keyExtractor={(item) => String((item as any)?.id ?? item.currencyCode)}
                  renderItem={({ item }) => {
                    const selected = (fromWallet?.currencyCode || "").toUpperCase() === (item.currencyCode || "").toUpperCase();
                    return (
                      <Pressable
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          padding: 16,
                          marginHorizontal: 16,
                          marginBottom: 8,
                          backgroundColor: selected ? "#F0FDF4" : "#F9FAFB",
                          borderRadius: 12,
                          borderWidth: selected ? 2 : 1,
                          borderColor: selected ? "#16A34A" : "#E5E7EB",
                        }}
                        onPress={() => {
                          setFromWallet(item);
                          setShowFromPicker(false);
                          setFromSearch("");
                        }}
                      >
                        <CountryFlag
                          currencyCode={item.currencyCode}
                          fallbackEmoji={(item as any)?.flag}
                          size="lg"
                          style={{ marginRight: 12 }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937" }}>
                            {item.currencyCode}
                          </Text>
                          <Text style={{ fontSize: 13, color: "#6B7280" }}>
                            Balance: {item.formattedBalance || "0.00"} {item.currencyCode}
                          </Text>
                        </View>
                        {selected && <Text style={{ fontSize: 18, color: "#16A34A", fontWeight: "700" }}>✓</Text>}
                      </Pressable>
                    );
                  }}
                  ListEmptyComponent={
                    <Text style={{ textAlign: "center", color: "#9CA3AF", marginTop: 40, fontSize: 16 }}>
                      No wallets found
                    </Text>
                  }
                />
              </View>
            </View>
          </Modal>

          {/* Destination Picker */}
          <Modal visible={showToPicker} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
              <Pressable style={{ flex: 1 }} onPress={() => setShowToPicker(false)} />
              <View
                style={{
                  backgroundColor: "#fff",
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  maxHeight: "70%",
                  paddingBottom: 40,
                }}
              >
                <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Pressable
                      onPress={() => setShowToPicker(false)}
                      style={{ width: 30, height: 30, justifyContent: "center", alignItems: "center" }}
                    >
                      <Text style={{ fontSize: 18, color: "#6B7280" }}>✕</Text>
                    </Pressable>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: "#1F2937" }}>Send To</Text>
                    <View style={{ width: 30 }} />
                  </View>
                </View>

                <TextInput
                  style={{
                    marginHorizontal: 16,
                    marginVertical: 12,
                    backgroundColor: "#F3F4F6",
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 16,
                    color: "#1F2937",
                  }}
                  placeholder="Search country or currency..."
                  placeholderTextColor="#999"
                  value={destinationSearch}
                  onChangeText={setDestinationSearch}
                />

                <FlatList
                  data={filteredDestinations}
                  keyExtractor={(item) => item.code}
                  renderItem={({ item }) => (
                    <Pressable
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        padding: 16,
                        marginHorizontal: 16,
                        marginBottom: 8,
                        backgroundColor: selectedDestination?.code === item.code ? "#F0FDF4" : "#F9FAFB",
                        borderRadius: 12,
                        borderWidth: selectedDestination?.code === item.code ? 2 : 1,
                        borderColor: selectedDestination?.code === item.code ? "#16A34A" : "#E5E7EB",
                      }}
                      onPress={() => {
                        setSelectedDestination(item);
                        setShowToPicker(false);
                        setDestinationSearch("");
                      }}
                    >
                      <CountryFlag
                        currencyCode={item.code}
                        fallbackEmoji={(item as any)?.flag}
                        size="lg"
                        style={{ marginRight: 12 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937" }}>
                          {item.code} - {item.countryName}
                        </Text>
                        <Text style={{ fontSize: 13, color: "#6B7280" }}>{getPayoutMethodLabel(item)}</Text>
                      </View>
                      {selectedDestination?.code === item.code && (
                        <Text style={{ fontSize: 18, color: "#16A34A", fontWeight: "700" }}>✓</Text>
                      )}
                    </Pressable>
                  )}
                  ListEmptyComponent={
                    <Text style={{ textAlign: "center", color: "#9CA3AF", marginTop: 40, fontSize: 16 }}>
                      No destinations found
                    </Text>
                  }
                />
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </ScreenShell>
  );
}
