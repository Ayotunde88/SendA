import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import ScreenShell from "../../../components/ScreenShell";
import { styles } from "../../../theme/styles";
import { COLORS } from "../../../theme/colors";
import {
  getBanksByCountry,
  verifyBankAccount,
  Bank,
  CURRENCY_TO_COUNTRY,
  COUNTRY_NAMES,
  getCurrencySymbol,
} from "../../../api/flutterwave";
import { SavedRecipient } from "./RecipientSelectScreen";

const SAVED_RECIPIENTS_KEY = "saved_recipients";

// Bank picker modal component
function BankPickerModal({
  visible,
  banks,
  banksLoading,
  onSelect,
  onClose,
  searchQuery,
  setSearchQuery,
  countryName,
}: {
  visible: boolean;
  banks: Bank[];
  banksLoading: boolean;
  onSelect: (bank: Bank) => void;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  countryName: string;
}) {
  if (!visible) return null;

  const filteredBanks = banksLoading
    ? []
    : banks.filter((b) => b.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: "70%",
            paddingBottom: 40,
          }}
        >
          <View style={{ padding: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1F2937" }}>
                Select {countryName} Bank
              </Text>
              <Pressable onPress={onClose}>
                <Text style={{ fontSize: 16, color: "#6B7280" }}>Cancel</Text>
              </Pressable>
            </View>

            <TextInput
              style={{
                marginTop: 16,
                backgroundColor: "#F3F4F6",
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                color: "#1F2937",
              }}
              placeholder={banksLoading ? "Loading banks..." : "Search banks..."}
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              editable={!banksLoading}
            />
          </View>

          <ScrollView style={{ paddingHorizontal: 20 }}>
            {banksLoading ? (
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <ActivityIndicator size="small" color="#6B7280" />
                <Text style={{ marginTop: 10, textAlign: "center", color: "#9CA3AF" }}>
                  Loading {countryName} banks…
                </Text>
              </View>
            ) : (
              <>
                {filteredBanks.map((bank) => (
                  <Pressable
                    key={bank.code}
                    style={{
                      paddingVertical: 16,
                      borderBottomWidth: 1,
                      borderBottomColor: "#F3F4F6",
                    }}
                    onPress={() => {
                      onSelect(bank);
                      onClose();
                    }}
                  >
                    <Text style={{ fontSize: 16, color: "#1F2937" }}>{bank.name}</Text>
                  </Pressable>
                ))}

                {filteredBanks.length === 0 && (
                  <Text style={{ textAlign: "center", color: "#9CA3AF", marginTop: 20 }}>
                    {banks.length === 0 ? "No banks loaded" : "No banks found"}
                  </Text>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function RecipientNewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    destCurrency: string;
    fromWalletId: string;
    fromCurrency: string;
    fromAmount: string;
    toAmount: string;
    rate?: string;
    countryCode?: string;
    countryName?: string;
  }>();

  const destCurrency = params.destCurrency || "NGN";
  const countryCode = params.countryCode || CURRENCY_TO_COUNTRY[destCurrency] || "NG";
  const countryName = params.countryName || COUNTRY_NAMES[countryCode] || countryCode;
  const symbol = getCurrencySymbol(destCurrency);
  const toAmount = params.toAmount || "0";

  const [userPhone, setUserPhone] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Bank data
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);

  // Form state
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [saveRecipient, setSaveRecipient] = useState(true);

  // Modal states
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [bankSearchQuery, setBankSearchQuery] = useState("");

  // Load user phone
  useEffect(() => {
    AsyncStorage.getItem("user_phone").then((phone) => {
      if (phone) setUserPhone(phone);
    });
  }, []);

  // Load banks for the destination country
  useEffect(() => {
    const loadBanks = async () => {
      setBanksLoading(true);
      try {
        const bankList = await getBanksByCountry(countryCode);
        setBanks(bankList);
      } catch (e) {
        console.error(`Failed to load ${countryName} banks:`, e);
        Alert.alert("Error", `Failed to load ${countryName} banks. Please try again.`);
      } finally {
        setBanksLoading(false);
      }
    };

    loadBanks();
  }, [countryCode, countryName]);

  // Verify account (only Nigeria supports auto-verification)
  const handleVerifyAccount = useCallback(async () => {
    if (!selectedBank || accountNumber.length < 10) {
      Alert.alert("Invalid Input", "Please select a bank and enter a valid account number.");
      return;
    }

    // Only Nigeria supports account verification via Flutterwave
    if (countryCode !== "NG") {
      if (!accountName.trim()) {
        Alert.alert("Recipient Name Required", "Please enter the recipient's name.");
        return;
      }
      setIsVerified(true);
      return;
    }

    setVerifying(true);
    setIsVerified(false);

    try {
      const result = await verifyBankAccount(accountNumber, selectedBank.code);

      if (result.success && result.accountName) {
        setAccountName(result.accountName);
        setIsVerified(true);
      } else {
        Alert.alert(
          "Verification Failed",
          result.message || "Could not verify account. Please check the details and try again."
        );
      }
    } catch (e) {
      console.error("Verification error:", e);
      Alert.alert("Error", "Failed to verify account. Please try again.");
    } finally {
      setVerifying(false);
    }
  }, [selectedBank, accountNumber, accountName, countryCode]);

  // Auto-verify for Nigerian accounts when account number reaches 10 digits
  useEffect(() => {
    if (countryCode === "NG" && accountNumber.length === 10 && selectedBank && !isVerified && !verifying) {
      handleVerifyAccount();
    }
  }, [accountNumber, selectedBank, isVerified, verifying, handleVerifyAccount, countryCode]);

  // Reset verification when bank or account changes
  useEffect(() => {
    setIsVerified(false);
    if (countryCode === "NG") {
      setAccountName("");
    }
  }, [selectedBank?.code, countryCode]);

  const handleContinue = async () => {
    if (!selectedBank || !accountNumber) {
      Alert.alert("Incomplete", "Please select a bank and enter the account number.");
      return;
    }

    if (!accountName.trim()) {
      Alert.alert("Recipient Name Required", "Please enter the recipient's name.");
      return;
    }

    // For non-NG countries, manually mark as verified
    if (countryCode !== "NG" && !isVerified) {
      setIsVerified(true);
    }

    // Save recipient if checkbox is checked
    if (saveRecipient) {
      try {
        const existingData = await AsyncStorage.getItem(SAVED_RECIPIENTS_KEY);
        const existing: SavedRecipient[] = existingData ? JSON.parse(existingData) : [];
        
        const newRecipient: SavedRecipient = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          accountName: accountName.trim(),
          accountNumber,
          bankCode: selectedBank.code,
          bankName: selectedBank.name,
          currency: destCurrency,
          countryCode,
          createdAt: Date.now(),
        };

        // Don't add duplicates
        const isDuplicate = existing.some(
          r => r.accountNumber === accountNumber && r.bankCode === selectedBank.code && r.currency === destCurrency
        );

        if (!isDuplicate) {
          await AsyncStorage.setItem(SAVED_RECIPIENTS_KEY, JSON.stringify([newRecipient, ...existing]));
        }
      } catch (e) {
        console.error("Failed to save recipient:", e);
      }
    }

    // Navigate to confirmation screen
    router.push({
      pathname: "/recipientconfirm" as any,
      params: {
        ...params,
        recipient: JSON.stringify({
          accountName: accountName.trim(),
          accountNumber,
          bankCode: selectedBank.code,
          bankName: selectedBank.name,
          currency: destCurrency,
          countryCode,
        }),
        mode: "new",
      },
    });
  };

  const canContinue = selectedBank && accountNumber.length >= 6 && accountName.trim().length > 0;

  return (
    <ScreenShell>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.simpleHeader}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1F2937" }}>
              New {countryName} Recipient
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Transfer Summary */}
          <View
            style={{
              backgroundColor: "#ECFDF5",
              borderRadius: 16,
              padding: 16,
              marginTop: 16,
            }}
          >
            <Text style={{ fontSize: 14, color: "#065F46", marginBottom: 4 }}>
              Sending
            </Text>
            <Text style={{ fontSize: 24, fontWeight: "800", color: "#065F46" }}>
              {symbol}{parseFloat(toAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {destCurrency}
            </Text>
          </View>

          {/* Bank Selection */}
          <View style={{ marginTop: 24 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
              Select {countryName} Bank
            </Text>
            <Pressable
              style={{
                backgroundColor: "#F9FAFB",
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 16,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              onPress={() => setShowBankPicker(true)}
            >
              <Text style={{ fontSize: 16, color: selectedBank ? "#1F2937" : "#9CA3AF" }}>
                {selectedBank?.name || "Tap to select bank"}
              </Text>
              <Text style={{ fontSize: 18, color: "#9CA3AF" }}>▼</Text>
            </Pressable>
          </View>

          {/* Account Number */}
          <View style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
              Account Number
            </Text>
            <View
              style={{
                backgroundColor: "#F9FAFB",
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 4,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 18,
                  fontWeight: "600",
                  color: "#1F2937",
                  paddingVertical: 12,
                }}
                placeholder="Enter account number"
                placeholderTextColor="#9CA3AF"
                value={accountNumber}
                onChangeText={(text) => {
                  setAccountNumber(text.replace(/\D/g, ""));
                  setIsVerified(false);
                }}
                keyboardType="number-pad"
                maxLength={20}
              />
              {verifying && <ActivityIndicator size="small" color="#16A34A" />}
              {isVerified && <Text style={{ fontSize: 18, color: "#16A34A" }}>✓</Text>}
            </View>
          </View>

          {/* Account Name */}
          <View style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
              Recipient Name {countryCode !== "NG" && <Text style={{ color: "#9CA3AF" }}>(Enter manually)</Text>}
            </Text>
            <View
              style={{
                backgroundColor: countryCode === "NG" && isVerified ? "#F0FDF4" : "#F9FAFB",
                borderWidth: 1,
                borderColor: countryCode === "NG" && isVerified ? "#86EFAC" : "#E5E7EB",
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 4,
              }}
            >
              <TextInput
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#1F2937",
                  paddingVertical: 12,
                }}
                placeholder={countryCode === "NG" ? "Auto-filled after verification" : "Enter recipient name"}
                placeholderTextColor="#9CA3AF"
                value={accountName}
                onChangeText={setAccountName}
                editable={countryCode !== "NG" || !isVerified}
              />
            </View>
          </View>

          {/* Verify Button (for non-NG countries) */}
          {countryCode !== "NG" && accountNumber.length >= 6 && accountName.trim() && !isVerified && (
            <Pressable
              style={{
                marginTop: 16,
                backgroundColor: "#E0F2FE",
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: "center",
              }}
              onPress={() => setIsVerified(true)}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#0369A1" }}>
                ✓ Confirm recipient details
              </Text>
            </Pressable>
          )}

          {/* Save Recipient Checkbox */}
          <Pressable
            style={{
              marginTop: 24,
              flexDirection: "row",
              alignItems: "center",
            }}
            onPress={() => setSaveRecipient(!saveRecipient)}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: saveRecipient ? "#16A34A" : "#D1D5DB",
                backgroundColor: saveRecipient ? "#16A34A" : "transparent",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}
            >
              {saveRecipient && <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>✓</Text>}
            </View>
            <Text style={{ fontSize: 14, color: "#374151" }}>
              Save this recipient for future transfers
            </Text>
          </Pressable>

          {/* Continue Button */}
          <Pressable
            style={{
              marginTop: 32,
              backgroundColor: canContinue ? "#16A34A" : "#E5E7EB",
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
            }}
            onPress={handleContinue}
            disabled={!canContinue}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", color: canContinue ? "#fff" : "#9CA3AF" }}>
              Continue
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bank Picker Modal */}
      <BankPickerModal
        visible={showBankPicker}
        banks={banks}
        banksLoading={banksLoading}
        onSelect={setSelectedBank}
        onClose={() => setShowBankPicker(false)}
        searchQuery={bankSearchQuery}
        setSearchQuery={setBankSearchQuery}
        countryName={countryName}
      />
    </ScreenShell>
  );
}