import React, { useMemo, useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, TextInput, FlatList, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BottomSheet from "../../BottomSheet";
import { COLORS } from "../../../theme/colors";
import { styles } from "../../../theme/styles";
import {
  getBanksByCountry,
  verifyBankAccount,
  Bank,
  CURRENCY_TO_COUNTRY,
  COUNTRY_NAMES,
  getCurrencySymbol,
} from "../../../api/flutterwave";
import { saveRecipientToDB } from "../../../api/sync";

// ✅ Email validation regex (Interac)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface HeaderProps {
  title: string;
}
function Header({ title }: HeaderProps) {
  return (
    <View style={styles.flowHeader}>
      <Pressable style={styles.iconBtn}>
        <Text style={styles.iconBtnText}>←</Text>
      </Pressable>

      <Text style={styles.flowHeaderTitle}>{title}</Text>

      <Pressable style={styles.iconBtn}>
        <Text style={styles.iconBtnText}>?</Text>
      </Pressable>
    </View>
  );
}

export default function RecipientDetailsScreen() {
  const router = useRouter();

  // ✅ read params (optional) so screen supports CAD Interac + bank transfer
  const params = useLocalSearchParams<{
    destCurrency?: string;
    fromWalletId?: string;
    fromCurrency?: string;
    fromAmount?: string;
    toAmount?: string;
    rate?: string;
    countryCode?: string;
    countryName?: string;
  }>();

  const destCurrency = (params.destCurrency || "NGN").toUpperCase();
  const isInterac = destCurrency === "CAD";
  const countryCode = isInterac
    ? "CA"
    : (params.countryCode || CURRENCY_TO_COUNTRY[destCurrency] || "NG").toUpperCase();
  const countryName = isInterac ? "Canada" : params.countryName || COUNTRY_NAMES[countryCode] || countryCode;
  const isNigeria = countryCode === "NG";
  const symbol = getCurrencySymbol(destCurrency);
  const toAmount = params.toAmount || "0";

  // ✅ user phone (for saving to DB)
  const [userPhone, setUserPhone] = useState("");

  // Bank picker / bank transfer state
  const [bankOpen, setBankOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [account, setAccount] = useState("");
  const [accountName, setAccountName] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // ✅ Interac state (CAD)
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");

  // Common
  const [save, setSave] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ✅ Banks data (dynamic; not used for Interac)
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(!isInterac);
  const [bankSearchQuery, setBankSearchQuery] = useState("");

  // ✅ Load user phone
  useEffect(() => {
    AsyncStorage.getItem("user_phone").then((phone) => {
      if (phone) setUserPhone(phone);
    });
  }, []);

  // ✅ Load banks for destination country (skip for Interac)
  useEffect(() => {
    if (isInterac) {
      setBanks([]);
      setBanksLoading(false);
      return;
    }

    const loadBanks = async () => {
      setBanksLoading(true);
      try {
        const list = await getBanksByCountry(countryCode);
        setBanks(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error(`Failed to load ${countryName} banks:`, e);
        setBanks([]);
      } finally {
        setBanksLoading(false);
      }
    };

    loadBanks();
  }, [countryCode, countryName, isInterac]);

  // ✅ Filter banks (search)
  const filteredBanks = useMemo(() => {
    if (banksLoading) return [];
    const q = bankSearchQuery.trim().toLowerCase();
    if (!q) return banks;
    return banks.filter((b) => (b.name || "").toLowerCase().includes(q));
  }, [banks, banksLoading, bankSearchQuery]);

  // ✅ Reset verification when bank/account changes (bank flow only)
  useEffect(() => {
    if (isInterac) return;
    setIsVerified(false);
    if (isNigeria) setAccountName("");
  }, [selectedBank?.code, account, isNigeria, isInterac]);

  // ✅ Verify bank account (Nigeria via API; others manual confirm)
  const handleVerifyAccount = useCallback(async () => {
    if (!selectedBank) return;

    // Non-NG: no API verification — just confirm name exists
    if (!isNigeria) {
      if (accountName.trim()) setIsVerified(true);
      return;
    }

    // NG requires 10 digits
    if (account.length < 10) return;

    setVerifying(true);
    setIsVerified(false);

    try {
      const result = await verifyBankAccount(account, selectedBank.code);
      if (result?.success && result?.accountName) {
        setAccountName(result.accountName);
        setIsVerified(true);
      }
    } catch (e) {
      console.error("Verification error:", e);
    } finally {
      setVerifying(false);
    }
  }, [selectedBank, account, isNigeria, accountName]);

  // ✅ Auto-verify NG at 10 digits
  useEffect(() => {
    if (isInterac) return;
    if (isNigeria && account.length === 10 && selectedBank && !isVerified && !verifying) {
      handleVerifyAccount();
    }
  }, [account, selectedBank, isVerified, verifying, isNigeria, isInterac, handleVerifyAccount]);

  // ✅ Ready rules
  const isReady = isInterac
    ? EMAIL_REGEX.test(recipientEmail.trim()) && recipientName.trim().length > 0
    : !!selectedBank && account.length >= 10 && (isNigeria ? isVerified : accountName.trim().length > 0);

  // ✅ Confirmation display values
  const displayName = isInterac ? recipientName.trim() : accountName.trim();
  const displayAccount = isInterac ? recipientEmail.trim() : account;
  const displayBank = isInterac ? "Interac e-Transfer" : selectedBank?.name || "";
  const initials = displayName
    ? displayName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0]?.toUpperCase())
        .join("")
    : "??";

  const handleContinue = () => {
    if (!isReady) return;
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    // ✅ Build recipient payload
    const recipientData = isInterac
      ? {
          accountName: recipientName.trim(),
          accountNumber: recipientEmail.trim().toLowerCase(), // email in accountNumber field
          bankCode: "INTERAC",
          bankName: "Interac e-Transfer",
          currency: destCurrency,
          countryCode: "CA",
          isInterac: true,
        }
      : {
          accountName: accountName.trim(),
          accountNumber: account,
          bankCode: selectedBank!.code,
          bankName: selectedBank!.name,
          currency: destCurrency,
          countryCode,
          isInterac: false,
        };

    // ✅ Save recipient to DB if toggle is on
    if (save && userPhone) {
      try {
        await saveRecipientToDB({ phone: userPhone, ...recipientData });
      } catch (e) {
        console.error("Failed to save recipient:", e);
      }
    }

    setConfirmOpen(false);

    router.push({
      pathname: "/reviewdetails" as any,
      params: {
        ...params,
        name: recipientData.accountName,
        bank: recipientData.bankName,
        account: recipientData.accountNumber,
        recipient: JSON.stringify(recipientData),
        mode: "new",
      } as any,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <Header title={isInterac ? "Interac recipient details" : "Enter recipient details"} />

      <View style={{ paddingHorizontal: 16, paddingTop: 12, flex: 1 }}>
        {/* ✅ Transfer summary (keeps your screen styling vibe) */}
        <View
          style={{
            backgroundColor: "#ECFDF5",
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 13, color: "#065F46" }}>Sending</Text>
          <Text style={{ fontSize: 20, fontWeight: "800", color: "#065F46" }}>
            {symbol}
            {parseFloat(toAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
            {destCurrency}
          </Text>
        </View>

        {/* ✅ Interac vs Bank transfer form */}
        {isInterac ? (
          <>
            {/* Interac info banner */}
            <View
              style={{
                backgroundColor: "#DBEAFE",
                borderRadius: 10,
                padding: 12,
                marginBottom: 18,
                flexDirection: "row",
                alignItems: "flex-start",
              }}
            >
              <Text style={{ fontSize: 16, marginRight: 10 }}>📧</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#1E40AF" }}>
                  Interac e-Transfer
                </Text>
                <Text style={{ fontSize: 12, color: "#1E40AF", marginTop: 2 }}>
                  The recipient will receive an email to deposit funds into their Canadian bank.
                </Text>
              </View>
            </View>

            {/* Recipient email */}
            <Text style={styles.inputLabel}>Recipient email</Text>
            <View style={styles.textField}>
              <TextInput
                value={recipientEmail}
                onChangeText={setRecipientEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="recipient@email.com"
                placeholderTextColor="#9B9B9B"
                style={styles.textFieldInput}
              />
              {EMAIL_REGEX.test(recipientEmail.trim()) && (
                <Text style={{ color: "#16A34A", fontSize: 16, marginLeft: 8 }}>✓</Text>
              )}
            </View>

            {/* Recipient name */}
            <Text style={[styles.inputLabel, { marginTop: 18 }]}>Recipient name</Text>
            <View style={styles.textField}>
              <TextInput
                value={recipientName}
                onChangeText={setRecipientName}
                autoCapitalize="words"
                placeholder="Enter recipient's full name"
                placeholderTextColor="#9B9B9B"
                style={styles.textFieldInput}
              />
            </View>
          </>
        ) : (
          <>
            {/* Bank name */}
            <Text style={styles.inputLabel}>Bank name</Text>
            <Pressable style={styles.dropdown} onPress={() => setBankOpen(true)} disabled={banksLoading}>
              <Text style={[styles.dropdownText, !selectedBank && { color: "#9B9B9B" }]}>
                {banksLoading ? "Loading banks..." : selectedBank?.name || `Select ${countryName} bank`}
              </Text>
              <Text style={styles.dropdownArrow}>⌄</Text>
            </Pressable>

            {/* Account number */}
            <Text style={[styles.inputLabel, { marginTop: 18 }]}>Account number</Text>
            <View style={styles.textField}>
              <TextInput
                value={account}
                onChangeText={(text) => setAccount(text.replace(/\D/g, ""))}
                keyboardType="number-pad"
                placeholder="Enter account number"
                placeholderTextColor="#9B9B9B"
                style={[styles.textFieldInput, { flex: 1 }]}
                maxLength={20}
              />
              {verifying && <ActivityIndicator size="small" color="#16A34A" />}
              {isNigeria && isVerified && <Text style={{ color: "#16A34A", fontSize: 16 }}>✓</Text>}
            </View>

            {/* Recipient name */}
            <Text style={[styles.inputLabel, { marginTop: 18 }]}>Recipient name</Text>
            <View style={styles.textField}>
              <TextInput
                value={accountName}
                onChangeText={(t) => {
                  setAccountName(t);
                  if (!isNigeria) setIsVerified(false);
                }}
                autoCapitalize="words"
                placeholder={isNigeria ? "Auto-filled after verification" : "Enter recipient name"}
                placeholderTextColor="#9B9B9B"
                style={styles.textFieldInput}
                editable={!isNigeria || !isVerified}
              />
            </View>

            {/* Manual confirm for non-NG */}
            {!isNigeria && account.length >= 6 && accountName.trim() && !isVerified ? (
              <Pressable
                style={[styles.outlineBtn, { marginTop: 12, width: "100%" }]}
                onPress={() => setIsVerified(true)}
              >
                <Text style={styles.outlineBtnText}>✓ Confirm recipient details</Text>
              </Pressable>
            ) : null}
          </>
        )}

        {/* Save beneficiary toggle (unchanged) */}
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setSave(!save)}
            style={[styles.toggle, save ? styles.toggleOn : styles.toggleOff]}
          >
            <View style={[styles.toggleDot, save ? { marginLeft: 18 } : { marginLeft: 2 }]} />
          </Pressable>
          <Text style={styles.toggleText}>Save beneficiary</Text>
        </View>
      </View>

      {/* Continue button (unchanged) */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 18 }}>
        <Pressable
          onPress={handleContinue}
          style={[styles.bigBottomBtn, !isReady && { backgroundColor: "#DCDCDC" }]}
          disabled={!isReady}
        >
          <Text style={[styles.bigBottomBtnText, !isReady && { color: "#B3B3B3" }]}>Continue</Text>
        </Pressable>
      </View>

      {/* Bank picker sheet (unchanged UI, but now uses API banks + search) */}
      {!isInterac && (
        <BottomSheet open={bankOpen} onClose={() => setBankOpen(false)}>
          <Text style={styles.sheetTitle}>Select bank</Text>

          {/* Search */}
          <View style={[styles.textField, { marginHorizontal: 16, marginBottom: 12 }]}>
            <TextInput
              value={bankSearchQuery}
              onChangeText={setBankSearchQuery}
              placeholder="Search banks..."
              placeholderTextColor="#9B9B9B"
              style={styles.textFieldInput}
              autoCapitalize="none"
            />
          </View>

          {banksLoading ? (
            <View style={{ alignItems: "center", paddingVertical: 24 }}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={{ marginTop: 10, color: "#9B9B9B" }}>Loading banks...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredBanks}
              keyExtractor={(x) => x.code}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.sheetRow}
                  onPress={() => {
                    setSelectedBank(item);
                    setBankOpen(false);
                    setBankSearchQuery("");
                  }}
                >
                  <Text style={{ fontWeight: "900" }}>{item.name}</Text>
                  <Text style={{ color: "#9B9B9B" }}>›</Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={{ textAlign: "center", color: "#9B9B9B", marginTop: 20 }}>
                  {banks.length === 0 ? "No banks available" : "No banks found"}
                </Text>
              }
            />
          )}
        </BottomSheet>
      )}

      {/* Confirm recipient bottom sheet (unchanged UI; now works for Interac too) */}
      <BottomSheet open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <View style={{ alignItems: "center", paddingTop: 18 }}>
          <View style={styles.confirmAvatar}>
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 18 }}>{initials}</Text>
          </View>
          <View style={styles.verifyBadge}>
            <Text style={{ color: "#fff", fontWeight: "900" }}>✓</Text>
          </View>

          <Text style={styles.confirmTitle}>Confirm recipient details</Text>

          <View style={styles.confirmCard}>
            <Text style={styles.confirmName}>{displayName || "—"}</Text>
            <Text style={styles.confirmMeta}>
              {isInterac ? `Interac • ${displayAccount || "—"}` : `${displayBank || "—"} • ${displayAccount || "—"}`}
            </Text>
          </View>

          <Text style={styles.confirmHint}>Please confirm the recipient’s details before you continue</Text>

          <Pressable style={[styles.primaryBtn, { width: "100%", marginTop: 16 }]} onPress={handleConfirm}>
            <Text style={styles.primaryBtnText}>Continue</Text>
          </Pressable>

          <Pressable
            style={[styles.outlineBtn, { width: "100%", marginTop: 12 }]}
            onPress={() => setConfirmOpen(false)}
          >
            <Text style={styles.outlineBtnText}>Edit details</Text>
          </Pressable>
        </View>
      </BottomSheet>
    </View>
  );
}
