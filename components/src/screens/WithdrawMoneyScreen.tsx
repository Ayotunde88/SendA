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
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, router } from "expo-router";
import ScreenShell from "../../../components/ScreenShell";
import CurrencyPill from "../../../components/CurrencyPill";
import CurrencyPickerModal, { Wallet } from "../../../components/CurrencyPickerModal";
import { styles } from "../../../theme/styles";
import { COLORS } from "../../../theme/colors";
import {
  getUserWallets,
  getConversionQuote,
} from "../../../api/config";
import {
  getNigerianBanks,
  verifyBankAccount,
  sendNGN,
  Bank,
} from "../../../api/flutterwave";


// ============================================================
// Bank Picker Modal Component
// ============================================================
function BankPickerModal({
  visible,
  banks,
  banksLoading,
  onSelect,
  onClose,
  searchQuery,
  setSearchQuery,
}: {
  visible: boolean;
  banks: Bank[];
  banksLoading: boolean;
  onSelect: (bank: Bank) => void;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}) {
  if (!visible) return null;

  const filteredBanks = banksLoading
    ? []
    : banks.filter((b) => b.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "70%", paddingBottom: 40 }}>
          <View style={{ padding: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1F2937" }}>Select Bank</Text>
              <Pressable onPress={onClose}>
                <Text style={{ fontSize: 16, color: "#6B7280" }}>Cancel</Text>
              </Pressable>
            </View>

            <TextInput
              style={styles.inputBox}
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
                  Loading banks…
                </Text>
              </View>
            ) : (
              <>
                {filteredBanks.map((bank) => (
                  <Pressable
                    key={bank.code}
                    style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}
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

// ============================================================
// Saved Recipient Type
// ============================================================
export interface SavedRecipient {
  id: string;
  accountName: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  createdAt: number;
}

const SAVED_RECIPIENTS_KEY = "saved_ngn_recipients";

// Helper functions for saved recipients
async function getSavedRecipients(): Promise<SavedRecipient[]> {
  try {
    const data = await AsyncStorage.getItem(SAVED_RECIPIENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function saveRecipient(recipient: Omit<SavedRecipient, "id" | "createdAt">): Promise<void> {
  try {
    const existing = await getSavedRecipients();
    // Check for duplicates
    const duplicate = existing.find(
      (r) => r.accountNumber === recipient.accountNumber && r.bankCode === recipient.bankCode
    );
    if (duplicate) return; // Already saved

    const newRecipient: SavedRecipient = {
      ...recipient,
      id: Date.now().toString(),
      createdAt: Date.now(),
    };
    await AsyncStorage.setItem(SAVED_RECIPIENTS_KEY, JSON.stringify([newRecipient, ...existing].slice(0, 20)));
  } catch (e) {
    console.error("Failed to save recipient:", e);
  }
}

// ============================================================
// Recipient Details Modal Component (for entering bank details)
// ============================================================
function RecipientDetailsModal({
  visible,
  onClose,
  onConfirm,
  banks,
  banksLoading,
  amount,
  toCurrency,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (bank: Bank, accountNumber: string, accountName: string) => void;
  banks: Bank[];
  banksLoading: boolean;
  amount: string;
  toCurrency: string;
}) {
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [bankSearchQuery, setBankSearchQuery] = useState("");
  const [savedRecipients, setSavedRecipients] = useState<SavedRecipient[]>([]);
  const [showNewRecipient, setShowNewRecipient] = useState(false);
  const [saveThisRecipient, setSaveThisRecipient] = useState(true);

  // Load saved recipients when modal opens
  useEffect(() => {
    if (visible) {
      getSavedRecipients().then(setSavedRecipients);
      setSelectedBank(null);
      setAccountNumber("");
      setAccountName("");
      setIsVerified(false);
      setShowNewRecipient(false);
      setSaveThisRecipient(true);
    }
  }, [visible]);

  // Auto-verify when account number is 10 digits
  useEffect(() => {
    const verifyAccount = async () => {
      if (accountNumber.length === 10 && selectedBank && !isVerified && !verifying) {
        setVerifying(true);
        setAccountName("");
        try {
          const result = await verifyBankAccount(accountNumber, selectedBank.code);
          if (result.success && result.accountName) {
            setAccountName(result.accountName);
            setIsVerified(true);
          } else {
            Alert.alert("Verification Failed", result.message || "Could not verify account.");
          }
        } catch (e) {
          Alert.alert("Error", "Failed to verify account.");
        } finally {
          setVerifying(false);
        }
      }
    };
    verifyAccount();
  }, [accountNumber, selectedBank, isVerified, verifying]);

  // Reset verification when bank changes
  useEffect(() => {
    setIsVerified(false);
    setAccountName("");
  }, [selectedBank?.code]);

  const handleSelectSavedRecipient = (recipient: SavedRecipient) => {
    const bank = banks.find((b) => b.code === recipient.bankCode);
    if (bank) {
      onConfirm(bank, recipient.accountNumber, recipient.accountName);
    } else {
      // Bank not found in list, use a fallback
      onConfirm(
        { code: recipient.bankCode, name: recipient.bankName },
        recipient.accountNumber,
        recipient.accountName
      );
    }
  };

  const handleConfirmNew = async () => {
    if (!selectedBank || !accountNumber || !accountName) return;

    // Save recipient if checkbox is checked
    if (saveThisRecipient) {
      await saveRecipient({
        accountName,
        accountNumber,
        bankCode: selectedBank.code,
        bankName: selectedBank.name,
      });
    }

    onConfirm(selectedBank, accountNumber, accountName);
  };

  const canConfirm = isVerified && selectedBank && accountNumber.length === 10 && accountName;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, maxHeight: "85%" }}>
            <View style={{ padding: 20 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Text style={{ fontSize: 20, fontWeight: "700", color: "#1F2937" }}>
                  {showNewRecipient ? "New Recipient" : "Send To"}
                </Text>
                <Pressable onPress={showNewRecipient ? () => setShowNewRecipient(false) : onClose}>
                  <Text style={{ fontSize: 16, color: "#6B7280" }}>{showNewRecipient ? "Back" : "Cancel"}</Text>
                </Pressable>
              </View>

              {/* Amount Summary */}
              <View style={{ backgroundColor: "#F0FDF4", borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <Text style={{ color: "#065F46", fontSize: 14 }}>Recipient gets</Text>
                <Text style={{ color: "#065F46", fontSize: 24, fontWeight: "800" }}>
                  {toCurrency === "NGN" ? "₦" : ""}{parseFloat(amount || "0").toLocaleString()} {toCurrency}
                </Text>
              </View>

              {!showNewRecipient ? (
                <ScrollView style={{ maxHeight: 350 }}>
                  {/* New Recipient Button */}
                  <Pressable
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 16,
                      backgroundColor: "#F9FAFB",
                      borderRadius: 12,
                      marginBottom: 12,
                    }}
                    onPress={() => setShowNewRecipient(true)}
                  >
                    <View style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: "#16A34A",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12,
                    }}>
                      <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>+</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937" }}>New Recipient</Text>
                      <Text style={{ fontSize: 13, color: "#6B7280" }}>Enter bank details manually</Text>
                    </View>
                    <Text style={{ color: "#9CA3AF", fontSize: 18 }}>›</Text>
                  </Pressable>

                  {/* Saved Recipients */}
                  {savedRecipients.length > 0 && (
                    <>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#6B7280", marginBottom: 12, marginTop: 8 }}>
                        SAVED RECIPIENTS
                      </Text>
                      {savedRecipients.map((recipient) => (
                        <Pressable
                          key={recipient.id}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            padding: 14,
                            backgroundColor: "#fff",
                            borderRadius: 12,
                            marginBottom: 8,
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                          }}
                          onPress={() => handleSelectSavedRecipient(recipient)}
                        >
                          <View style={{
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            backgroundColor: "#E0E7FF",
                            justifyContent: "center",
                            alignItems: "center",
                            marginRight: 12,
                          }}>
                            <Text style={{ color: "#4F46E5", fontSize: 14, fontWeight: "700" }}>
                              {getInitials(recipient.accountName)}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: "600", color: "#1F2937" }}>
                              {recipient.accountName}
                            </Text>
                            <Text style={{ fontSize: 13, color: "#6B7280" }}>
                              {recipient.bankName} • {recipient.accountNumber}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 18 }}>🇳🇬</Text>
                        </Pressable>
                      ))}
                    </>
                  )}

                  {savedRecipients.length === 0 && (
                    <View style={{ alignItems: "center", paddingVertical: 24 }}>
                      <Text style={{ fontSize: 40, marginBottom: 12 }}>👥</Text>
                      <Text style={{ fontSize: 16, fontWeight: "600", color: "#374151" }}>No saved recipients</Text>
                      <Text style={{ fontSize: 14, color: "#6B7280", textAlign: "center", marginTop: 4 }}>
                        Add a new recipient to get started
                      </Text>
                    </View>
                  )}
                </ScrollView>
              ) : (
                <>
                  {/* Bank Selection */}
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                    Select Bank
                  </Text>
                  <Pressable
                    style={[styles.inputBox, { marginBottom: 16 }]}
                    onPress={() => setShowBankPicker(true)}
                  >
                    <Text style={{ fontSize: 16, color: selectedBank ? "#1F2937" : "#9CA3AF" }}>
                      {selectedBank?.name || "Choose a bank"}
                    </Text>
                    <Text style={{ fontSize: 16, color: "#9CA3AF" }}>▼</Text>
                  </Pressable>

                  {/* Account Number */}
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                    Account Number
                  </Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={{ flex: 1, fontSize: 18, fontWeight: "600", color: "#1F2937", paddingVertical: 12 }}
                      placeholder="Enter 10-digit account number"
                      placeholderTextColor="#D1D5DB"
                      value={accountNumber}
                      onChangeText={(text) => {
                        const cleaned = text.replace(/[^0-9]/g, "").slice(0, 10);
                        setAccountNumber(cleaned);
                        if (cleaned.length < 10) {
                          setIsVerified(false);
                          setAccountName("");
                        }
                      }}
                      keyboardType="number-pad"
                      maxLength={10}
                    />
                    {verifying && <ActivityIndicator size="small" color="#16A34A" />}
                    {isVerified && <Text style={{ fontSize: 18, color: "#16A34A" }}>✓</Text>}
                  </View>

                  {/* Verified Account Name */}
                  {isVerified && accountName && (
                    <View style={{ backgroundColor: "#ECFDF5", borderRadius: 12, padding: 16, marginTop: 8, marginBottom: 12 }}>
                      <Text style={{ color: "#065F46", fontSize: 12, fontWeight: "600" }}>VERIFIED ACCOUNT</Text>
                      <Text style={{ color: "#065F46", fontSize: 18, fontWeight: "800", marginTop: 4 }}>{accountName}</Text>
                    </View>
                  )}

                  {/* Save Recipient Checkbox */}
                  {isVerified && (
                    <Pressable
                      style={[{ flexDirection: "row", alignItems: "center", marginBottom: 16 }, styles.primaryBtn]}
                      onPress={() => setSaveThisRecipient(!saveThisRecipient)}
                    >
                      <View style={{
                        width: 22,
                        height: 22,
                        borderRadius: 4,
                        borderWidth: 2,
                        borderColor: saveThisRecipient ? "#16A34A" : "#D1D5DB",
                        backgroundColor: saveThisRecipient ? "#16A34A" : "transparent",
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 10,
                      }}>
                        {saveThisRecipient && <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>✓</Text>}
                      </View>
                      <Text style={{ fontSize: 14, color: "#4B5563" }}>Save this recipient for future transfers</Text>
                    </Pressable>
                  )}

                  {/* Confirm Button */}
                  <Pressable
                    style={{
                      backgroundColor: canConfirm ? styles.primaryBtn.backgroundColor : "#E5E7EB",
                      height: 58,
                      paddingVertical: 15,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 20,
                    }}
                    onPress={handleConfirmNew}
                    disabled={!canConfirm}
                  >
                    <Text style={{ color: canConfirm ? "#fff" : "#9CA3AF", fontSize: 16, fontWeight: "700" }}>
                      Continue
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>

        <BankPickerModal
          visible={showBankPicker}
          banks={banks}
          banksLoading={banksLoading}
          onSelect={setSelectedBank}
          onClose={() => setShowBankPicker(false)}
          searchQuery={bankSearchQuery}
          setSearchQuery={setBankSearchQuery}
        />
      </View>
    </Modal>
  );
}

// ============================================================
// Confirmation Modal Component
// ============================================================
function ConfirmationModal({
  visible,
  onClose,
  onConfirm,
  fromAmount,
  fromCurrency,
  toAmount,
  toCurrency,
  rate,
  accountName,
  accountNumber,
  bankName,
  sending,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fromAmount: string;
  fromCurrency: string;
  toAmount: string;
  toCurrency: string;
  rate: number | null;
  accountName: string;
  accountNumber: string;
  bankName: string;
  sending: boolean;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 }}>
        <View style={{ backgroundColor: "#fff", borderRadius: 24, padding: 24, width: "100%", maxWidth: 360 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#1F2937", textAlign: "center" }}>
            Confirm Transfer
          </Text>

          <View style={{ marginTop: 24 }}>
            {/* Amount Summary */}
            <View style={{ backgroundColor: "#F9FAFB", borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <Text style={{ fontSize: 14, color: "#6B7280", marginBottom: 4 }}>You send</Text>
              <Text style={{ fontSize: 20, fontWeight: "800", color: "#1F2937" }}>
                {parseFloat(fromAmount || "0").toLocaleString()} {fromCurrency}
              </Text>
              {rate && (
                <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 8 }}>
                  Rate: 1 {fromCurrency} = {rate.toFixed(4)} {toCurrency}
                </Text>
              )}
            </View>

            <View style={{ backgroundColor: "#ECFDF5", borderRadius: 16, padding: 16 }}>
              <Text style={{ fontSize: 14, color: "#065F46", marginBottom: 4 }}>Recipient gets</Text>
              <Text style={{ fontSize: 24, fontWeight: "800", color: "#065F46" }}>
                {toCurrency === "NGN" ? "₦" : ""}{parseFloat(toAmount || "0").toLocaleString()} {toCurrency}
              </Text>
            </View>

            {/* Recipient Details */}
            <View style={{ marginTop: 16 }}>
              <DetailRow label="Recipient Name" value={accountName} />
              <DetailRow label="Account Number" value={accountNumber} />
              <DetailRow label="Bank" value={bankName} />
            </View>
          </View>

          <View style={{ marginTop: 24, flexDirection: "row", gap: 12 }}>
            <Pressable
              style={{ 
                flex: 1, backgroundColor: "#F3F4F6",  alignItems: "center",
                height: 58,
                paddingVertical: 15,
                borderRadius: 999,
                justifyContent: "center",
                marginTop: 20,
               }}
              onPress={onClose}
              disabled={sending}
            >
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#4B5563" }}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[{ flex: 1 , borderRadius: 12, paddingVertical: 14, alignItems: "center" }, styles.primaryBtn]}
              onPress={onConfirm}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>Send</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
      <Text style={{ fontSize: 14, color: "#6B7280" }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: "600", color: "#1F2937", textAlign: "right", flex: 1, marginLeft: 16 }}>{value}</Text>
    </View>
  );
}

// ============================================================
// Quick Amount Button Component
// ============================================================
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

// ============================================================
// Main SendMoneyScreen Component
// ============================================================
export default function SendMoneyScreen() {
  const params = useLocalSearchParams();
  const initialFromCurrency = params.from as string | undefined;

  const [userPhone, setUserPhone] = useState<string>("");
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [fromWallet, setFromWallet] = useState<Wallet | null>(null);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState(""); // Always in NGN
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [balanceExceeded, setBalanceExceeded] = useState(false);

  // Modal states
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showRecipientDetails, setShowRecipientDetails] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Bank data
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);

  // Recipient details (for NGN transfers)
  const [recipientBank, setRecipientBank] = useState<Bank | null>(null);
  const [recipientAccountNumber, setRecipientAccountNumber] = useState("");
  const [recipientAccountName, setRecipientAccountName] = useState("");

  // Load user phone
  useEffect(() => {
    AsyncStorage.getItem("user_phone").then((phone) => {
      if (phone) {
        setUserPhone(phone);
      } else {
        setLoading(false);
      }
    });
  }, []);

  // Load wallets
  useEffect(() => {
    if (userPhone) {
      loadWallets();
    }
  }, [userPhone]);

  // Load Nigerian banks
  useEffect(() => {
    const loadBanks = async () => {
      setBanksLoading(true);
      try {
        const bankList = await getNigerianBanks();
        setBanks(bankList);
      } catch (e) {
        console.error("Failed to load banks:", e);
      } finally {
        setBanksLoading(false);
      }
    };
    loadBanks();
  }, []);

  // Check balance exceeded
  useEffect(() => {
    if (fromWallet && fromAmount) {
      const amount = parseFloat(fromAmount) || 0;
      setBalanceExceeded(amount > fromWallet.balance);
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

        // Pre-select from wallet based on URL param
        let selectedFrom: Wallet | null = null;
        if (initialFromCurrency) {
          selectedFrom = activeWallets.find(
            (w: Wallet) => w.currencyCode.toUpperCase() === initialFromCurrency.toUpperCase()
          ) || null;
        }

        if (selectedFrom) {
          setFromWallet(selectedFrom);
        } else if (activeWallets.length >= 1) {
          setFromWallet(activeWallets[0]);
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

  // Fetch quote when amount or currencies change - always convert to NGN
  const fetchQuote = useCallback(async () => {
    if (!fromWallet || !fromAmount || parseFloat(fromAmount) <= 0) {
      setToAmount("");
      setRate(null);
      return;
    }

    // If source is already NGN, no conversion needed
    if (fromWallet.currencyCode === "NGN") {
      setToAmount(fromAmount);
      setRate(1);
      return;
    }

    setQuoteLoading(true);
    try {
      const response = await getConversionQuote(
        userPhone,
        fromWallet.currencyCode,
        "NGN", // Always convert to NGN for Nigerian bank transfers
        parseFloat(fromAmount)
      );

      if (response.success) {
        setToAmount(response.quote.buyAmount.toFixed(2));
        setRate(response.quote.rate);
      } else {
        setToAmount("");
        setRate(null);
      }
    } catch (error) {
      console.error("Quote failed:", error);
      setToAmount("");
      setRate(null);
    } finally {
      setQuoteLoading(false);
    }
  }, [fromWallet, fromAmount, userPhone]);

  // Debounce quote fetching
  useEffect(() => {
    const debounce = setTimeout(fetchQuote, 500);
    return () => clearTimeout(debounce);
  }, [fetchQuote]);

  const handleQuickAmount = (percentage: number) => {
    if (fromWallet && fromWallet.balance > 0) {
      const amount = (fromWallet.balance * percentage).toFixed(2);
      setFromAmount(amount);
    }
  };

  const handleContinue = () => {
    if (!fromWallet || !fromAmount) return;

    const amount = parseFloat(fromAmount);
    if (amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }

    if (amount > fromWallet.balance) {
      Alert.alert("Insufficient Balance", `You only have ${fromWallet.formattedBalance} ${fromWallet.currencyCode}`);
      return;
    }

    // Always show bank details modal - destination is always Nigerian bank account
    // If source is not NGN, conversion happens behind the scenes
    setShowRecipientDetails(true);
  };

  const handleRecipientConfirmed = (bank: Bank, accountNumber: string, accountName: string) => {
    setRecipientBank(bank);
    setRecipientAccountNumber(accountNumber);
    setRecipientAccountName(accountName);
    setShowRecipientDetails(false);
    setShowConfirmation(true);
  };

  const handleConfirmSend = async () => {
    if (!recipientBank || !recipientAccountNumber || !recipientAccountName) return;

    setSending(true);
    try {
      const result = await sendNGN({
        phone: userPhone,
        amount: parseFloat(toAmount), // Send the converted NGN amount
        accountNumber: recipientAccountNumber,
        bankCode: recipientBank.code,
        bankName: recipientBank.name,
        accountName: recipientAccountName,
        narration: `Transfer from ${fromWallet?.currencyCode} to ${recipientAccountName}`,
      });

      if (result.success) {
        setShowConfirmation(false);
        router.push({
          pathname: "/result",
          params: {
            type: "success",
            title: "Transfer Successful! 🎉",
            message: `Sent ${fromAmount} ${fromWallet?.currencyCode} (₦${parseFloat(toAmount).toLocaleString()}) to ${recipientAccountName}`,
            subtitle: `${recipientBank.name} • ${recipientAccountNumber}`,
            primaryText: "Done",
            primaryRoute: "/(tabs)",
            secondaryText: "Send more",
            secondaryRoute: "/sendmoney",
          },
        });
      } else {
        Alert.alert("Transfer Failed", result.message || "Failed to send money. Please try again.");
      }
    } catch (e) {
      console.error("Send error:", e);
      Alert.alert("Error", "Failed to send money. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // Removed swap function - destination is always NGN/Nigerian bank

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
        <View style={styles.simpleHeader}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
        </View>

        <View style={{ flex: 1, padding: 20 }}>
          <Text style={{ fontSize: 22, fontWeight: "bold", color: "#333", marginBottom: 8 }}>
            Send Money
          </Text>
          <Text style={{ fontSize: 14, color: "#666", marginBottom: 24 }}>
            You need at least 1 currency wallet to send money to Nigeria.
          </Text>

          <Pressable
            style={{ backgroundColor: "#2E9E6A", borderRadius: 12, padding: 16, alignItems: "center" }}
            onPress={() => router.push("/addaccount")}
          >
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
              + Add Currency
            </Text>
          </Pressable>
        </View>
      </ScreenShell>
    );
  }

  const canContinue = fromWallet && fromAmount && parseFloat(fromAmount) > 0 && !balanceExceeded && (rate || fromWallet.currencyCode === "NGN") && !quoteLoading;

  return (
    <ScreenShell>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.simpleHeader}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>
            <View style={{ flex: 1 }} />
          </View>

          <Text style={[styles.bigTitle, { marginTop: 8 }]}>Send Money</Text>
          <Text style={styles.convertHint}>Convert and send money to recipients</Text>

          {/* FROM Section */}
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
                countryCode={fromWallet?.countryCode ?? ""}
                onPress={() => setShowFromPicker(true)}
              />
            </View>
            <Text style={[styles.convertBalance, balanceExceeded && { color: "#EF4444" }]}>
              Balance: {fromWallet?.formattedBalance || "0.00"} {fromWallet?.currencyCode || ""}
            </Text>
            {balanceExceeded && (
              <Text style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}>
                ⚠️ Insufficient balance
              </Text>
            )}

            {/* Quick Amount Buttons */}
            <View style={{ flexDirection: "row", marginTop: 12 }}>
              <QuickAmountButton label="25%" onPress={() => handleQuickAmount(0.25)} disabled={!fromWallet || fromWallet.balance <= 0} />
              <QuickAmountButton label="50%" onPress={() => handleQuickAmount(0.5)} disabled={!fromWallet || fromWallet.balance <= 0} />
              <QuickAmountButton label="75%" onPress={() => handleQuickAmount(0.75)} disabled={!fromWallet || fromWallet.balance <= 0} />
              <QuickAmountButton label="MAX" onPress={() => handleQuickAmount(1.0)} disabled={!fromWallet || fromWallet.balance <= 0} />
            </View>
          </View>

          {/* Rate Display */}
          <View style={styles.convertMid}>
            <Text style={{ fontSize: 24 }}>↓</Text>
            {rate ? (
              <Text style={styles.muted}>
                1 {fromWallet?.currencyCode} = {rate.toFixed(4)} NGN
              </Text>
            ) : quoteLoading ? (
              <Text style={styles.muted}>Fetching rate...</Text>
            ) : fromWallet?.currencyCode === "NGN" ? (
              <Text style={styles.muted}>No conversion needed</Text>
            ) : (
              <Text style={styles.muted}>Enter amount to see rate</Text>
            )}
            <Text style={styles.muted}>⏱️ Same-day delivery</Text>
          </View>

          {/* TO Section - Always shows NGN since destination is Nigerian bank */}
          <View style={styles.convertBox}>
            <Text style={{ color: "#2E9E6A", fontWeight: "900" }}>Recipient gets (NGN)</Text>
            <View style={styles.convertRow}>
              <TextInput
                value={quoteLoading ? "..." : toAmount}
                editable={false}
                placeholder="0.00"
                placeholderTextColor="#BDBDBD"
                style={[styles.amountInput, { fontSize: 28, color: "#333" }]}
              />
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F0FDF4", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 }}>
                <Text style={{ fontSize: 18, marginRight: 6 }}>🇳🇬</Text>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#065F46" }}>NGN</Text>
              </View>
            </View>
            <Text style={styles.convertBalance}>
              Sending to Nigerian Bank Account
            </Text>
          </View>

          {/* Continue Button */}
          <Pressable
            style={canContinue ? styles.primaryBtn : styles.disabledBigBtn}
            onPress={handleContinue}
            disabled={!canContinue || sending}
          >
            <Text style={{ color: canContinue ? "#fff" : "#B3B3B3", fontWeight: "900", fontSize: 18 }}>
              Continue
            </Text>
          </Pressable>

          {/* Currency Picker Modal - Source wallet only */}
          <CurrencyPickerModal
            visible={showFromPicker}
            onClose={() => setShowFromPicker(false)}
            wallets={wallets}
            selected={fromWallet}
            onSelect={setFromWallet}
            title="Send From"
          />

          {/* Recipient Details Modal - Always NGN destination */}
          <RecipientDetailsModal
            visible={showRecipientDetails}
            onClose={() => setShowRecipientDetails(false)}
            onConfirm={handleRecipientConfirmed}
            banks={banks}
            banksLoading={banksLoading}
            amount={toAmount}
            toCurrency="NGN"
          />

          {/* Confirmation Modal */}
          <ConfirmationModal
            visible={showConfirmation}
            onClose={() => setShowConfirmation(false)}
            onConfirm={handleConfirmSend}
            fromAmount={fromAmount}
            fromCurrency={fromWallet?.currencyCode || ""}
            toAmount={toAmount}
            toCurrency="NGN"
            rate={rate}
            accountName={recipientAccountName}
            accountNumber={recipientAccountNumber}
            bankName={recipientBank?.name || ""}
            sending={sending}
          />
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </ScreenShell>
  );
}
