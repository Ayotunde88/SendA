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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, router } from "expo-router";
import ScreenShell from "../../../components/ScreenShell";
import CurrencyPill from "../../../components/CurrencyPill";
import CurrencyPickerModal, { Wallet } from "../../../components/CurrencyPickerModal";
import { styles } from "../../../theme/styles";
import { getUserWallets, getConversionQuote } from "../../../api/config";

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
  const [destCurrency, setDestCurrency] = useState<"NGN" | "CAD">("NGN");

  useEffect(() => {
    AsyncStorage.getItem("user_phone").then((phone) => {
      if (phone) setUserPhone(phone);
      else setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (userPhone) loadWallets();
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

  const fetchQuote = useCallback(async () => {
    if (!fromWallet || !fromAmount || parseFloat(fromAmount) <= 0) {
      setToAmount("");
      setRate(null);
      return;
    }

    if (fromWallet.currencyCode === destCurrency) {
      setToAmount(fromAmount);
      setRate(1);
      return;
    }

    setQuoteLoading(true);
    try {
      const response = await getConversionQuote(
        userPhone,
        fromWallet.currencyCode,
        destCurrency,
        parseFloat(fromAmount)
      );

      if (response.success) {
        setToAmount(response.quote.buyAmount.toFixed(2));
        setRate(response.quote.rate);
      } else {
        setToAmount("");
        setRate(null);
      }
    } catch (e) {
      setToAmount("");
      setRate(null);
    } finally {
      setQuoteLoading(false);
    }
  }, [fromWallet, fromAmount, userPhone, destCurrency]);

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
    if (!fromWallet || !fromAmount) return;

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

    // ✅ Route to recipient selection screen (like screenshot 1)
    router.push({
      pathname: "/recipientselect" as any,
      params: {
        destCurrency,
        fromWalletId: String(fromWallet.id),
        fromCurrency: fromWallet.currencyCode,
        fromAmount,
        toAmount,
        rate: rate ? String(rate) : "",
      },
    });
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

  if (wallets.length === 0) {
    return (
      <ScreenShell>
        <View style={{ flex: 1, padding: 20 }}>
          <Text style={{ fontSize: 22, fontWeight: "bold", color: "#333", marginBottom: 8 }}>
            Send Money
          </Text>
          <Text style={{ fontSize: 14, color: "#666", marginBottom: 24 }}>
            You need at least 1 currency wallet to send money.
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
    (rate || fromWallet.currencyCode === destCurrency) &&
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
                flag={fromWallet?.flag || "🏳️"}
                code={fromWallet?.currencyCode || "Select"}
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
            {rate ? (
              <Text style={styles.muted}>
                1 {fromWallet?.currencyCode} = {rate.toFixed(4)} {destCurrency}
              </Text>
            ) : quoteLoading ? (
              <Text style={styles.muted}>Fetching rate...</Text>
            ) : fromWallet?.currencyCode === destCurrency ? (
              <Text style={styles.muted}>No conversion needed</Text>
            ) : (
              <Text style={styles.muted}>Enter amount to see rate</Text>
            )}
            <Text style={styles.muted}>⏱️ Same-day delivery</Text>
          </View>

          {/* TO */}
          <View style={styles.convertBox}>
            <Text style={{ color: "#2E9E6A", fontWeight: "900" }}>Recipient gets ({destCurrency})</Text>
            <View style={styles.convertRow}>
              <TextInput
                value={quoteLoading ? "..." : toAmount}
                editable={false}
                placeholder="0.00"
                placeholderTextColor="#BDBDBD"
                style={[styles.amountInput, { fontSize: 28, color: "#333" }]}
              />
              <CurrencyPill
                flag={destCurrency === "NGN" ? "🇳🇬" : "🇨🇦"}
                code={destCurrency}
                onPress={() => setShowToPicker(true)}
              />
            </View>

            <Text style={styles.convertBalance}>
              {destCurrency === "NGN" ? "Sending to Nigerian Bank Account" : "Sending via EFT Bank Transfer"}
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

          {/* Destination Picker */}
          <Modal visible={showToPicker} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
              <Pressable style={{ flex: 1 }} onPress={() => setShowToPicker(false)} />
              <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 }}>
                <View style={{ padding: 20 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: "#1F2937" }}>Send To</Text>
                    <Pressable onPress={() => setShowToPicker(false)}>
                      <Text style={{ fontSize: 16, color: "#6B7280" }}>Cancel</Text>
                    </Pressable>
                  </View>

                  <Pressable
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 16,
                      backgroundColor: destCurrency === "NGN" ? "#F0FDF4" : "#F9FAFB",
                      borderRadius: 12,
                      marginBottom: 12,
                      borderWidth: destCurrency === "NGN" ? 2 : 1,
                      borderColor: destCurrency === "NGN" ? "#16A34A" : "#E5E7EB",
                    }}
                    onPress={() => {
                      setDestCurrency("NGN");
                      setShowToPicker(false);
                    }}
                  >
                    <Text style={{ fontSize: 28, marginRight: 12 }}>🇳🇬</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937" }}>NGN - Nigerian Naira</Text>
                      <Text style={{ fontSize: 13, color: "#6B7280" }}>Send to Nigerian bank account</Text>
                    </View>
                    {destCurrency === "NGN" && <Text style={{ fontSize: 18, color: "#16A34A", fontWeight: "700" }}>✓</Text>}
                  </Pressable>

                  <Pressable
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 16,
                      backgroundColor: destCurrency === "CAD" ? "#F0FDF4" : "#F9FAFB",
                      borderRadius: 12,
                      borderWidth: destCurrency === "CAD" ? 2 : 1,
                      borderColor: destCurrency === "CAD" ? "#16A34A" : "#E5E7EB",
                    }}
                    onPress={() => {
                      setDestCurrency("CAD");
                      setShowToPicker(false);
                    }}
                  >
                    <Text style={{ fontSize: 28, marginRight: 12 }}>🇨🇦</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937" }}>CAD - Canadian Dollar</Text>
                      <Text style={{ fontSize: 13, color: "#6B7280" }}>Send via EFT Bank Transfer</Text>
                    </View>
                    {destCurrency === "CAD" && <Text style={{ fontSize: 18, color: "#16A34A", fontWeight: "700" }}>✓</Text>}
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </ScreenShell>
  );
}
