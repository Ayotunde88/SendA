import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { otherstyles } from "../../../theme/otherstyles";
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

// ✅ Email validation for Interac
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** ---------------- Bank Picker Modal (OLD STYLING) ---------------- **/
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
  const filteredBanks = useMemo(() => {
    if (banksLoading) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return banks;
    return banks.filter((b) => (b.name || "").toLowerCase().includes(q));
  }, [banks, banksLoading, searchQuery]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={otherstyles.bankModalOverlay}>
        <Pressable style={otherstyles.bankModalBackdrop} onPress={onClose} />

        <View style={otherstyles.bankModalSheet}>
          <View style={otherstyles.bankModalHeader}>
            <View>
              <Text style={otherstyles.bankModalTitle}>Select {countryName} bank</Text>
              <Text style={otherstyles.bankModalSub}>Choose the recipient’s bank to continue</Text>
            </View>

            <Pressable onPress={onClose} style={otherstyles.bankModalCloseBtn}>
              <Text style={otherstyles.bankModalCloseText}>Close</Text>
            </Pressable>
          </View>

          <View style={otherstyles.bankModalSearchWrap}>
            <Text style={otherstyles.bankModalSearchIcon}>⌕</Text>
            <TextInput
              style={otherstyles.bankModalSearchInput}
              placeholder={banksLoading ? "Loading banks..." : "Search bank name"}
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              editable={!banksLoading}
            />
          </View>

          <ScrollView
            style={otherstyles.bankModalList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {banksLoading ? (
              <View style={otherstyles.bankModalLoading}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={otherstyles.bankModalLoadingText}>Loading {countryName} banks…</Text>
              </View>
            ) : filteredBanks.length > 0 ? (
              filteredBanks.map((bank) => (
                <Pressable
                  key={bank.code}
                  style={otherstyles.bankModalRow}
                  onPress={() => {
                    onSelect(bank);
                    onClose();
                  }}
                >
                  <Text style={otherstyles.bankModalRowText}>{bank.name}</Text>
                  <Text style={otherstyles.bankModalChevron}>›</Text>
                </Pressable>
              ))
            ) : (
              <View style={otherstyles.bankModalEmpty}>
                <Text style={otherstyles.bankModalEmptyTitle}>No results</Text>
                <Text style={otherstyles.bankModalEmptySub}>
                  {banks.length === 0 ? "No banks loaded yet." : "Try a different search term."}
                </Text>
              </View>
            )}

            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** ---------------- Screen (OLD LAYOUT + INTERAC UPDATE) ---------------- **/
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
    // optional
    isInterac?: string;
  }>();

  const destCurrency = (params.destCurrency || "NGN").toUpperCase();

  // ✅ Interac (CAD) detection
  const isCanada = destCurrency === "CAD";

  const countryCode = (isCanada ? "CA" : params.countryCode || CURRENCY_TO_COUNTRY[destCurrency] || "NG").toUpperCase();
  const countryName = isCanada ? "Canada" : params.countryName || COUNTRY_NAMES[countryCode] || countryCode;

  const symbol = getCurrencySymbol(destCurrency);
  const toAmountRaw = Number.parseFloat(params.toAmount || "0") || 0;

  const [userPhone, setUserPhone] = useState("");

  // Bank data (dynamic by country) — ✅ skip banks for CAD
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(!isCanada);

  // Form state (Bank transfer / Flutterwave)
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [saveRecipient, setSaveRecipient] = useState(true);
  const [verifying, setVerifying] = useState(false);

  // ✅ Interac form state (CAD)
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");

  // Modal states
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [bankSearchQuery, setBankSearchQuery] = useState("");

  const isNigeria = countryCode === "NG";

  // Load user phone
  useEffect(() => {
    AsyncStorage.getItem("user_phone").then((phone) => {
      if (phone) setUserPhone(phone);
    });
  }, []);

  // Load banks for destination country (NEW FEATURE, OLD UI) — ✅ skip for Interac
  useEffect(() => {
    if (isCanada) {
      setBanks([]);
      setBanksLoading(false);
      return;
    }

    const loadBanks = async () => {
      setBanksLoading(true);
      try {
        const bankList = await getBanksByCountry(countryCode);
        setBanks(Array.isArray(bankList) ? bankList : []);
      } catch (e) {
        console.error(`Failed to load ${countryName} banks:`, e);
        Alert.alert("Error", `Failed to load ${countryName} banks. Please try again.`);
        setBanks([]);
      } finally {
        setBanksLoading(false);
      }
    };

    loadBanks();
  }, [countryCode, countryName, isCanada]);

  // Reset verification when bank/account changes (keep old behavior + fix) — ✅ skip for Interac
  useEffect(() => {
    if (isCanada) return;
    setIsVerified(false);
    if (isNigeria) setAccountName("");
  }, [selectedBank?.code, accountNumber, isNigeria, isCanada]);

  // Verify account (NG auto-verifies, others manual confirm) — ✅ skip for Interac
  const handleVerifyAccount = useCallback(async () => {
    if (!selectedBank || accountNumber.length < 6) {
      Alert.alert("Invalid input", "Please select a bank and enter a valid account number.");
      return;
    }

    // Non-NG countries: manual confirm (no API verify)
    if (!isNigeria) {
      if (!accountName.trim()) {
        Alert.alert("Recipient name required", "Please enter the recipient's name.");
        return;
      }
      setIsVerified(true);
      return;
    }

    // NG: only verify when at least 10 digits
    if (accountNumber.length < 10) {
      Alert.alert("Incomplete", "Nigerian account numbers require 10 digits.");
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
          "Verification failed",
          result.message || "Could not verify account. Please check the details and try again."
        );
      }
    } catch (e) {
      console.error("Verification error:", e);
      Alert.alert("Error", "Failed to verify account. Please try again.");
    } finally {
      setVerifying(false);
    }
  }, [selectedBank, accountNumber, accountName, isNigeria]);

  // Auto-verify for NG when 10 digits (NEW FEATURE) — ✅ skip for Interac
  useEffect(() => {
    if (isCanada) return;
    if (isNigeria && accountNumber.length === 10 && selectedBank && !isVerified && !verifying) {
      handleVerifyAccount();
    }
  }, [accountNumber, selectedBank, isVerified, verifying, handleVerifyAccount, isNigeria, isCanada]);

  const handleContinue = async () => {
    // ✅ CAD / Interac flow (email-based)
    if (isCanada) {
      const email = recipientEmail.trim().toLowerCase();
      const name = recipientName.trim();

      if (!EMAIL_REGEX.test(email)) {
        Alert.alert("Invalid email", "Please enter a valid recipient email address.");
        return;
      }
      if (!name) {
        Alert.alert("Recipient name required", "Please enter the recipient's name.");
        return;
      }

      // Save recipient if checked (same as old local AsyncStorage, but Interac fields)
      if (saveRecipient) {
        try {
          const existingData = await AsyncStorage.getItem(SAVED_RECIPIENTS_KEY);
          const existing: SavedRecipient[] = existingData ? JSON.parse(existingData) : [];

          const newRecipient: SavedRecipient = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            accountName: name,
            accountNumber: email, // ✅ Interac uses email here
            bankCode: "INTERAC",
            bankName: "Interac e-Transfer",
            currency: destCurrency,
            countryCode: "CA",
            createdAt: Date.now(),
          };

          const isDuplicate = existing.some(
            (r) =>
              String(r.accountNumber || "").toLowerCase() === email &&
              r.bankCode === "INTERAC" &&
              r.currency === destCurrency
          );

          if (!isDuplicate) {
            await AsyncStorage.setItem(SAVED_RECIPIENTS_KEY, JSON.stringify([newRecipient, ...existing]));
          }
        } catch (e) {
          console.error("Failed to save Interac recipient:", e);
        }
      }

      router.push({
        pathname: "/recipientconfirm" as any,
        params: {
          ...params,
          recipient: JSON.stringify({
            accountName: name,
            accountNumber: email, // ✅ email in accountNumber field for Interac
            bankCode: "INTERAC",
            bankName: "Interac e-Transfer",
            currency: destCurrency,
            countryCode: "CA",
            isInterac: "true",
          }),
          mode: "new",
        },
      });
      return;
    }

    // ---- Original bank transfer flow (unchanged) ----
    if (!selectedBank || !accountNumber) {
      Alert.alert("Incomplete", "Please select a bank and enter the account number.");
      return;
    }

    if (!accountName.trim()) {
      Alert.alert("Recipient name required", "Please enter the recipient's name.");
      return;
    }

    // Non-NG: allow manual confirm state
    if (!isNigeria && !isVerified) {
      setIsVerified(true);
    }

    // NG: block continue if not verified and not verifying
    if (isNigeria && !isVerified) {
      Alert.alert("Not verified", "Please wait for verification to complete.");
      return;
    }

    // Save recipient if checked (same as old)
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

        const isDuplicate = existing.some(
          (r) => r.accountNumber === accountNumber && r.bankCode === selectedBank.code && r.currency === destCurrency
        );

        if (!isDuplicate) {
          await AsyncStorage.setItem(SAVED_RECIPIENTS_KEY, JSON.stringify([newRecipient, ...existing]));
        }
      } catch (e) {
        console.error("Failed to save recipient:", e);
      }
    }

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

  // Can continue rules (old + correct for NG) — ✅ add Interac rules
  const canContinue = isCanada
    ? EMAIL_REGEX.test(recipientEmail.trim()) && recipientName.trim().length > 0
    : !!selectedBank &&
      accountNumber.trim().length >= 6 &&
      accountName.trim().length > 0 &&
      (!isNigeria ? isVerified || true : isVerified || verifying);

  const formattedSendAmount = `${symbol}${toAmountRaw.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${destCurrency}`;

  return (
    <ScreenShell padded={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={otherstyles.recipientNewContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header (OLD) */}
          <View style={otherstyles.confirmHeader}>
            <Pressable onPress={() => router.back()} style={otherstyles.backBtn}>
              <Text style={otherstyles.backIcon}>←</Text>
            </Pressable>

            <View style={otherstyles.confirmHeaderCenter}>
              <Text style={otherstyles.confirmTitle}>New recipient</Text>
              <Text style={otherstyles.confirmSubtitle}>{countryName} transfer details</Text>
            </View>

            <View style={otherstyles.confirmHeaderRight} />
          </View>

          {/* Summary Card (OLD) */}
          <View style={otherstyles.recipientNewSummaryCard}>
            <Text style={otherstyles.recipientNewSummaryLabel}>Sending</Text>
            <Text style={otherstyles.recipientNewSummaryAmount} numberOfLines={1}>
              {formattedSendAmount}
            </Text>

            <View style={otherstyles.recipientNewSummaryPills}>
              <View style={otherstyles.recipientNewPill}>
                <Text style={otherstyles.recipientNewPillText}>{countryName}</Text>
              </View>
              <View style={otherstyles.recipientNewPillSoft}>
                <Text style={otherstyles.recipientNewPillSoftText}>
                  {isCanada ? "Interac e-Transfer" : "Bank transfer"}
                </Text>
              </View>
            </View>
          </View>

          {/* ✅ CAD/Interac form (keeps OLD layout vibe) */}
          {isCanada ? (
            <>
              <View
                style={{
                  marginTop: 14,
                  backgroundColor: "#DBEAFE",
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <Text style={{ color: "#1E40AF", fontWeight: "900" }}>Interac e-Transfer</Text>
                <Text style={{ color: "#1E40AF", marginTop: 6, fontSize: 12, fontWeight: "700" }}>
                  Enter the recipient’s email and name. They will receive an email to deposit the funds.
                </Text>
              </View>

              {/* Recipient Email */}
              <Text style={[otherstyles.recipientNewLabel, { marginTop: 16 }]}>Recipient email</Text>
              <View style={otherstyles.recipientNewInputBox}>
                <TextInput
                  style={otherstyles.recipientNewInput}
                  placeholder="recipient@email.com"
                  placeholderTextColor="#9CA3AF"
                  value={recipientEmail}
                  onChangeText={setRecipientEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={255}
                />
              </View>

              {/* Recipient Name */}
              <Text style={otherstyles.recipientNewLabel}>Recipient name</Text>
              <View style={otherstyles.recipientNewInputBox}>
                <TextInput
                  style={otherstyles.recipientNewInput}
                  placeholder="Enter recipient's full name"
                  placeholderTextColor="#9CA3AF"
                  value={recipientName}
                  onChangeText={setRecipientName}
                  autoCapitalize="words"
                  maxLength={100}
                />
              </View>
            </>
          ) : (
            <>
              {/* Bank (OLD UI, dynamic banks) */}
              <Text style={otherstyles.recipientNewLabel}>Select bank</Text>
              <Pressable
                style={otherstyles.recipientNewSelect}
                onPress={() => setShowBankPicker(true)}
                disabled={banksLoading}
              >
                <Text
                  style={[
                    otherstyles.recipientNewSelectText,
                    !selectedBank && otherstyles.recipientNewSelectPlaceholder,
                  ]}
                >
                  {selectedBank?.name || (banksLoading ? "Loading banks…" : "Tap to select bank")}
                </Text>
                <Text style={otherstyles.recipientNewSelectChevron}>›</Text>
              </Pressable>

              {/* Account Number (OLD UI + keeps verification pill/spinner) */}
              <Text style={otherstyles.recipientNewLabel}>Account number</Text>
              <View style={otherstyles.recipientNewInputBox}>
                <TextInput
                  style={otherstyles.recipientNewInput}
                  placeholder="Enter account number"
                  placeholderTextColor="#9CA3AF"
                  value={accountNumber}
                  onChangeText={(text) => {
                    setAccountNumber(text.replace(/\D/g, ""));
                  }}
                  keyboardType="number-pad"
                  maxLength={20}
                />

                {verifying ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : isNigeria && isVerified ? (
                  <View style={otherstyles.recipientNewVerifiedPill}>
                    <Text style={otherstyles.recipientNewVerifiedText}>Verified</Text>
                  </View>
                ) : null}
              </View>

              {/* Helper row (OLD but updated message) */}
              {isNigeria ? (
                <Text style={otherstyles.recipientNewHelpText}>
                  We’ll auto-verify Nigerian accounts once you enter 10 digits.
                </Text>
              ) : (
                <Text style={otherstyles.recipientNewHelpText}>
                  For {countryName}, enter the recipient name manually and confirm the details.
                </Text>
              )}

              {/* Recipient Name (OLD UI) */}
              <Text style={otherstyles.recipientNewLabel}>Recipient name</Text>
              <View
                style={[
                  otherstyles.recipientNewInputBox,
                  isNigeria && isVerified ? otherstyles.recipientNewInputBoxVerified : null,
                ]}
              >
                <TextInput
                  style={otherstyles.recipientNewInput}
                  placeholder={isNigeria ? "Auto-filled after verification" : "Enter recipient name"}
                  placeholderTextColor="#9CA3AF"
                  value={accountName}
                  onChangeText={(t) => {
                    setAccountName(t);
                    if (!isNigeria) setIsVerified(false); // non-NG: changing name means re-confirm
                  }}
                  editable={!isNigeria || !isVerified}
                  autoCapitalize="words"
                />
              </View>

              {/* Manual confirm (Non-NG) (NEW FEATURE, OLD BUTTON STYLE) */}
              {!isNigeria && accountNumber.length >= 6 && accountName.trim() && !isVerified ? (
                <Pressable style={otherstyles.recipientNewSoftBtn} onPress={() => setIsVerified(true)}>
                  <Text style={otherstyles.recipientNewSoftBtnText}>✓ Confirm recipient details</Text>
                </Pressable>
              ) : null}
            </>
          )}

          {/* Save recipient toggle (OLD) */}
          <Pressable style={otherstyles.recipientNewSaveRow} onPress={() => setSaveRecipient((v) => !v)}>
            <View style={[otherstyles.recipientNewCheckbox, saveRecipient && otherstyles.recipientNewCheckboxOn]}>
              {saveRecipient ? <Text style={otherstyles.recipientNewCheckboxTick}>✓</Text> : null}
            </View>
            <Text style={otherstyles.recipientNewSaveText}>Save this recipient for future transfers</Text>
          </Pressable>

          {/* Continue (OLD) */}
          <Pressable
            style={[otherstyles.primaryBtn, !canContinue && styles.disabledBigBtn, otherstyles.recipientNewContinueBtn]}
            onPress={handleContinue}
            disabled={!canContinue}
          >
            <Text style={canContinue ? otherstyles.primaryBtnText : styles.disabledBigBtnText}>Continue</Text>
          </Pressable>

          <View style={{ height: 18 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bank Picker (OLD MODAL UI) — ✅ only relevant for non-CAD */}
      {!isCanada && (
        <BankPickerModal
          visible={showBankPicker}
          banks={banks}
          banksLoading={banksLoading}
          onSelect={(b) => {
            setSelectedBank(b);
            setBankSearchQuery("");
          }}
          onClose={() => setShowBankPicker(false)}
          searchQuery={bankSearchQuery}
          setSearchQuery={setBankSearchQuery}
          countryName={countryName}
        />
      )}
    </ScreenShell>
  );
}
