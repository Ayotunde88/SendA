import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import ScreenShell from "../../../components/ScreenShell";
import { getNigerianBanks, verifyBankAccount, Bank } from "../../../api/flutterwave";
import { styles } from "../../../theme/styles";



export interface SavedRecipient {
  id: string;
  accountName: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  createdAt: number;
}

const SAVED_RECIPIENTS_KEY = "saved_ngn_recipients";

async function getSavedRecipients(): Promise<SavedRecipient[]> {
  try {
    const data = await AsyncStorage.getItem(SAVED_RECIPIENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function saveRecipient(recipient: Omit<SavedRecipient, "id" | "createdAt">) {
  try {
    const existing = await getSavedRecipients();
    const duplicate = existing.find(
      (r) => r.accountNumber === recipient.accountNumber && r.bankCode === recipient.bankCode
    );
    if (duplicate) return;

    const newRecipient: SavedRecipient = {
      ...recipient,
      id: Date.now().toString(),
      createdAt: Date.now(),
    };

    await AsyncStorage.setItem(
      SAVED_RECIPIENTS_KEY,
      JSON.stringify([newRecipient, ...existing].slice(0, 20))
    );
  } catch {}
}

export default function RecipientNewScreen() {
  const params = useLocalSearchParams<{
    destCurrency: "NGN" | "CAD";
    fromWalletId: string;
    fromCurrency: string;
    fromAmount: string;
    toAmount: string;
    rate?: string;
  }>();

  const [banksLoading, setBanksLoading] = useState(true);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankSearch, setBankSearch] = useState("");

  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const [saveBeneficiary, setSaveBeneficiary] = useState(true);

  useEffect(() => {
    const load = async () => {
      setBanksLoading(true);
      try {
        const list = await getNigerianBanks();
        setBanks(list);
      } finally {
        setBanksLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    setVerified(false);
    setAccountName("");
  }, [selectedBank?.code]);

  useEffect(() => {
    const run = async () => {
      if (!selectedBank) return;
      if (accountNumber.length !== 10) return;
      if (verified || verifying) return;

      setVerifying(true);
      setAccountName("");

      try {
        const result = await verifyBankAccount(accountNumber, selectedBank.code);
        if (result.success && result.accountName) {
          setAccountName(result.accountName);
          setVerified(true);
        } else {
          setVerified(false);
          setAccountName("");
        }
      } finally {
        setVerifying(false);
      }
    };
    run();
  }, [accountNumber, selectedBank, verified, verifying]);

  const filteredBanks = useMemo(() => {
    const q = bankSearch.trim().toLowerCase();
    if (!q) return banks;
    return banks.filter((b) => b.name.toLowerCase().includes(q));
  }, [bankSearch, banks]);

  const canContinue = !!selectedBank && verified && accountNumber.length === 10 && !!accountName;

  const handleContinue = async () => {
    if (!selectedBank || !accountName) return;

    if (saveBeneficiary) {
      await saveRecipient({
        accountName,
        accountNumber,
        bankCode: selectedBank.code,
        bankName: selectedBank.name,
      });
    }

    const recipient: SavedRecipient = {
      id: "new",
      accountName,
      accountNumber,
      bankCode: selectedBank.code,
      bankName: selectedBank.name,
      createdAt: Date.now(),
    };

    router.push({
      pathname: "/recipientconfirm",
      params: {
        ...params,
        recipient: JSON.stringify(recipient),
        mode: "new",
      },
    } as any);
  };

  return (
    <ScreenShell>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.recipientScreen}>
          {/* Header: reuse your app header styles */}
          <View style={styles.simpleHeader}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>

            <Text style={styles.recipientHeaderTitle}>Enter recipient details</Text>

            <View style={styles.helpCircle}>
              <Text style={styles.helpCircleText}>?</Text>
            </View>
          </View>

          <View style={styles.recipientCard}>
            {/* Bank */}
            <Text style={styles.formLabel}>Bank name</Text>
            <Pressable onPress={() => setShowBankModal(true)} style={styles.inputWrap}>
              <Text style={[styles.inputText, !selectedBank && styles.inputPlaceholderText]}>
                {selectedBank?.name || "Select bank"}
              </Text>
              <Text style={{ fontSize: 18, color: "#111827" }}>⌄</Text>
            </Pressable>

            {/* Account Number */}
            <Text style={[styles.formLabel, { marginTop: 16 }]}>Account number</Text>
            <View style={[styles.inputWrap, verified && styles.inputWrapVerified]}>
              <TextInput
                value={accountNumber}
                onChangeText={(t) => {
                  const cleaned = t.replace(/[^0-9]/g, "").slice(0, 10);
                  setAccountNumber(cleaned);
                  if (cleaned.length < 10) {
                    setVerified(false);
                    setAccountName("");
                  }
                }}
                placeholder="Enter 10-digit account number"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                style={styles.textInput}
                maxLength={10}
              />
              {verifying && <ActivityIndicator size="small" color="#16A34A" />}
              {!verifying && verified && <Text style={styles.verifiedTick}>✓</Text>}
            </View>

            {verified && !!accountName && (
              <View style={styles.verifiedCard}>
                <Text style={styles.verifiedCardSmall}>VERIFIED ACCOUNT</Text>
                <Text style={styles.verifiedCardName}>{accountName}</Text>
              </View>
            )}

            {/* Save beneficiary */}
            <Pressable onPress={() => setSaveBeneficiary((v) => !v)} style={styles.toggleRow}>
              <View
                style={[
                  styles.toggleTrack,
                  saveBeneficiary ? styles.toggleTrackOn : styles.toggleTrackOff,
                ]}
              >
                <View style={[styles.toggleKnob, { marginLeft: saveBeneficiary ? 18 : 2 }]} />
              </View>
              <Text style={styles.toggleLabel}>Save beneficiary</Text>
            </Pressable>

            <Text style={styles.helperHint}>
              We’ll auto-verify the account name once the account number is complete.
            </Text>
          </View>

          {/* Continue: reuse your app buttons */}
          <View style={styles.bottomArea}>
            <Pressable
              onPress={handleContinue}
              disabled={!canContinue}
              style={canContinue ? styles.primaryBtn : styles.disabledBigBtn}
            >
              <Text style={{ color: canContinue ? "#fff" : "#9CA3AF", fontWeight: "900", fontSize: 16 }}>
                Continue
              </Text>
            </Pressable>
          </View>

          {/* Bank picker sheet */}
          <Modal visible={showBankModal} transparent animationType="slide" onRequestClose={() => setShowBankModal(false)}>
            <View style={styles.sheetOverlay}>
              <Pressable style={{ flex: 1 }} onPress={() => setShowBankModal(false)} />

              <View style={styles.sheet}>
                <View style={styles.sheetHandle} />

                <View style={styles.sheetHeader}>
                  <Pressable onPress={() => setShowBankModal(false)} style={styles.sheetCloseBtn}>
                    <Text style={styles.sheetCloseText}>✕</Text>
                  </Pressable>
                  <Text style={styles.sheetTitle}>Bank name</Text>
                  <View style={{ width: 34 }} />
                </View>

                <View style={styles.searchWrap}>
                  <Text style={styles.searchIcon}>⌕</Text>
                  <TextInput
                    placeholder={banksLoading ? "Loading banks..." : "Search"}
                    placeholderTextColor="#9CA3AF"
                    value={bankSearch}
                    onChangeText={setBankSearch}
                    editable={!banksLoading}
                    style={styles.searchInput}
                  />
                </View>

                <ScrollView style={{ maxHeight: 560, marginTop: 8 }} contentContainerStyle={{ paddingBottom: 24 }}>
                  {banksLoading ? (
                    <View style={styles.loadingWrap}>
                      <ActivityIndicator size="small" color="#6B7280" />
                      <Text style={styles.loadingText}>Loading banks…</Text>
                    </View>
                  ) : filteredBanks.length === 0 ? (
                    <View style={styles.loadingWrap}>
                      <Text style={styles.loadingText}>No banks found</Text>
                    </View>
                  ) : (
                    filteredBanks.map((b) => {
                      const isSelected = selectedBank?.code === b.code;
                      return (
                        <Pressable
                          key={b.code}
                          onPress={() => {
                            setSelectedBank(b);
                            setShowBankModal(false);
                            setBankSearch("");
                          }}
                          style={[styles.bankRow, isSelected && styles.bankRowSelected]}
                        >
                          <Text style={styles.bankRowText}>{b.name}</Text>
                          <Text style={styles.bankRowArrow}>›</Text>
                        </Pressable>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}
