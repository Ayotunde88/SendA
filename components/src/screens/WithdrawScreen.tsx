import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  getConversionQuote,
  getPayoutDestinations,
  getUserWallets,
  PayoutDestination,
} from "../../../api/config";
import CurrencyPickerModal, { Wallet } from "../../../components/CurrencyPickerModal";
import CurrencyPill from "../../../components/CurrencyPill";
import ScreenShell from "../../../components/ScreenShell";
import { styles } from "../../../theme/styles";
import CountryFlag from "../../../components/CountryFlag";

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

/**
 * ✅ Safe countryCode readers (no TS redlines)
 */
const getWalletCountryCode = (w: Wallet | null | undefined): string => {
  const cc = (w as unknown as { countryCode?: string })?.countryCode;
  return typeof cc === "string" ? cc : "";
};

const getDestinationCountryCode = (d: PayoutDestination | null | undefined): string => {
  const cc = (d as unknown as { countryCode?: string })?.countryCode;
  return typeof cc === "string" ? cc : "";
};

/**
 * ✅ Typed wrapper so we can pass countryCode to CountryFlag with no TS errors
 * (even if CountryFlag’s props don’t declare it yet).
 */
const CountryFlagSafe = CountryFlag as unknown as React.ComponentType<{
  currencyCode?: string;
  countryCode?: string;
  fallbackEmoji?: string;
  size?: "sm" | "md" | "lg" | string;
  style?: any;
}>;

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

  const [payoutDestinations, setPayoutDestinations] = useState<PayoutDestination[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<PayoutDestination | null>(null);
  const [destinationSearch, setDestinationSearch] = useState("");

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
      setBalanceExceeded(amt > (fromWallet.balance ?? 0));
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
              (w: Wallet) => w.currencyCode?.toUpperCase() === initialFromCurrency.toUpperCase()
            ) || null;
        }

        setFromWallet(selectedFrom || activeWallets[0] || null);
      } else {
        Alert.alert("Error", response.message || "Failed to load wallets");
      }
    } catch {
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
      return;
    }

    if (fromWallet.currencyCode === selectedDestination.code) {
      setToAmount(fromAmount);
      setRate(1);
      return;
    }

    setQuoteLoading(true);
    try {
      const response = await getConversionQuote(
        userPhone,
        fromWallet.currencyCode,
        selectedDestination.code,
        parseFloat(fromAmount)
      );

      if (response.success) {
        setToAmount(response.quote.buyAmount.toFixed(2));
        setRate(response.quote.rate);
      } else {
        setToAmount("");
        setRate(null);
      }
    } catch {
      setToAmount("");
      setRate(null);
    } finally {
      setQuoteLoading(false);
    }
  }, [fromWallet, fromAmount, userPhone, selectedDestination]);

  useEffect(() => {
    const t = setTimeout(fetchQuote, 500);
    return () => clearTimeout(t);
  }, [fetchQuote]);

  const handleQuickAmount = (percentage: number) => {
    if (fromWallet && (fromWallet.balance ?? 0) > 0) {
      setFromAmount(((fromWallet.balance ?? 0) * percentage).toFixed(2));
    }
  };

  const handleContinue = () => {
    if (!fromWallet || !fromAmount || !selectedDestination) return;

    const amount = parseFloat(fromAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }

    if (amount > (fromWallet.balance ?? 0)) {
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
      pathname: "/recipientselect" as any,
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
    if (dest.code === "CAD") return "Send via EFT Bank Transfer";
    return `Send to ${dest.countryName} bank account`;
  };

  const filteredDestinations = useMemo(() => {
    const q = destinationSearch.toLowerCase().trim();
    if (!q) return payoutDestinations;
    return payoutDestinations.filter(
      (d) =>
        d.code.toLowerCase().includes(q) ||
        d.countryName.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q)
    );
  }, [payoutDestinations, destinationSearch]);

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
          <Text style={{ fontSize: 22, fontWeight: "bold", color: "#333", marginBottom: 8 }}>
            Withdraw
          </Text>
          <Text style={{ fontSize: 14, color: "#666", marginBottom: 24 }}>
            You need at least 1 currency wallet to Withdraw.
          </Text>

          <Pressable
            style={{ backgroundColor: "#2E9E6A", borderRadius: 12, padding: 16, alignItems: "center" }}
            onPress={() => router.push("/addaccount")}
          >
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
              <Text style={styles.title}>Withdraw</Text>
              <Text style={styles.subtitle}>Withdraw to {selectedDestination?.name || "Select"}</Text>
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
                flag={fromWallet?.flag || "🏳️"}
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
                1 {fromWallet?.currencyCode} = {rate.toFixed(4)} {selectedDestination.code}
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
                flag={selectedDestination?.flag || "🏳️"}
                code={selectedDestination?.code || "Select"}
                countryCode={getDestinationCountryCode(selectedDestination)}
                onPress={() => setShowToPicker(true)}
              />
            </View>

            <Text style={styles.convertBalance}>
              {selectedDestination ? getPayoutMethodLabel(selectedDestination) : "Select destination"}
            </Text>
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

          <CurrencyPickerModal
            visible={showFromPicker}
            onClose={() => setShowFromPicker(false)}
            wallets={wallets}
            selected={fromWallet}
            onSelect={setFromWallet}
            title="Send From"
          />

          {/* ✅ Dynamic Destination Picker Modal (NOW uses rounded flags via countryCode) */}
          <Modal visible={showToPicker} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
              <Pressable style={{ flex: 1 }} onPress={() => setShowToPicker(false)} />
              <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "70%", paddingBottom: 40 }}>
                <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Pressable onPress={() => setShowToPicker(false)} style={{ width: 30, height: 30, justifyContent: "center", alignItems: "center" }}>
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
                      {/* ✅ Rounded flag (uses countryCode, falls back to emoji if missing) */}
                      <CountryFlagSafe
                        currencyCode={item.code}
                        countryCode={getDestinationCountryCode(item)}
                        fallbackEmoji={item.flag}
                        size="md"
                        style={{ marginRight: 12 }}
                      />

                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937" }}>
                          {item.code} - {item.countryName}
                        </Text>
                        <Text style={{ fontSize: 13, color: "#6B7280" }}>
                          {getPayoutMethodLabel(item)}
                        </Text>
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
