import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import ScreenShell from "../../../components/ScreenShell";
import { styles } from "../../../theme/styles";
import { isFlutterwaveCurrency, COUNTRY_NAMES, CURRENCY_TO_COUNTRY } from "../../../api/flutterwave";

export interface SavedRecipient {
  id: string;
  accountName: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  currency: string; // Added to support multi-currency recipients
  countryCode: string; // Added to support multi-country recipients
  createdAt: number;
}

const SAVED_RECIPIENTS_KEY = "saved_recipients"; // Changed to support all currencies

async function getSavedRecipients(currency?: string): Promise<SavedRecipient[]> {
  try {
    const data = await AsyncStorage.getItem(SAVED_RECIPIENTS_KEY);
    const recipients: SavedRecipient[] = data ? JSON.parse(data) : [];
    
    // Filter by currency if provided
    if (currency) {
      return recipients.filter(r => r.currency === currency);
    }
    return recipients;
  } catch {
    return [];
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function RecipientSelectScreen() {
  const params = useLocalSearchParams<{
    destCurrency: string;
    fromWalletId: string;
    fromCurrency: string;
    fromAmount: string;
    toAmount: string;
    rate?: string;
  }>();

  const destCurrency = params.destCurrency || "NGN";
  const countryCode = CURRENCY_TO_COUNTRY[destCurrency] || "NG";
  const countryName = COUNTRY_NAMES[countryCode] || countryCode;
  const isFlutterwave = isFlutterwaveCurrency(destCurrency);

  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState<SavedRecipient[]>([]);

  useEffect(() => {
    // Load saved recipients for this currency
    getSavedRecipients(destCurrency).then(setSaved);
  }, [destCurrency]);

  // Redirect CAD to EFT screen
  useEffect(() => {
    if (destCurrency === "CAD") {
      router.replace({
        pathname: "/eft-bank-details" as any,
        params,
      });
    }
  }, [destCurrency]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return saved;
    return saved.filter(
      (r) =>
        r.accountName.toLowerCase().includes(q) ||
        r.accountNumber.includes(q) ||
        r.bankName.toLowerCase().includes(q)
    );
  }, [search, saved]);

  // If not a Flutterwave currency (e.g., CAD), show loading while redirecting
  if (!isFlutterwave) {
    return (
      <ScreenShell>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "#666" }}>Loading...</Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <View style={styles.recipientListContainer}>
        <View style={styles.recipientListHeaderRow}>
          <Pressable onPress={() => router.back()} style={styles.recipientListBackBtn}>
            <Text style={styles.recipientListBackIcon}>←</Text>
          </Pressable>

          <Text style={styles.recipientListTitle}>
            Send to {countryName}
          </Text>

          <View style={{ flex: 1 }} />

          <View style={styles.recipientListHelpCircle}>
            <Text style={styles.recipientListHelpText}>?</Text>
          </View>
        </View>

        <View style={styles.recipientListSearchWrap}>
          <Text style={styles.recipientListSearchIcon}>⌕</Text>
          <TextInput
            placeholder="Search for a name or account"
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            style={styles.recipientListSearchInput}
          />
        </View>

        <Pressable
          onPress={() =>
            router.push({
              pathname: "/recipientnew" as any,
              params: {
                ...params,
                countryCode,
                countryName,
              },
            })
          }
          style={styles.recipientListNewRow}
        >
          <View style={styles.recipientListNewIconCircle}>
            <Text style={styles.recipientListNewIconPlus}>+</Text>
          </View>

          <Text style={styles.recipientListNewText}>Send to a new {countryName} recipient</Text>

          <View style={{ flex: 1 }} />
          <Text style={styles.recipientListChevron}>›</Text>
        </Pressable>

        <Text style={styles.recipientListSectionTitle}>
          Saved {countryName} Recipients
        </Text>

        <ScrollView>
          {filtered.map((r) => (
            <Pressable
              key={r.id}
              onPress={() =>
                router.push({
                  pathname: "/recipientconfirm" as any,
                  params: {
                    ...params,
                    recipient: JSON.stringify(r),
                    mode: "saved",
                  },
                })
              }
              style={styles.recipientListRow}
            >
              <View style={styles.recipientListAvatarCircle}>
                <Text style={styles.recipientListAvatarText}>{getInitials(r.accountName)}</Text>
              </View>

              <View style={styles.recipientListRowInfo}>
                <Text style={styles.recipientListRowName}>{r.accountName}</Text>
                <Text style={styles.recipientListRowSub}>
                  {r.bankName}, {r.accountNumber}
                </Text>
              </View>

              <Text style={styles.recipientListChevron}>›</Text>
            </Pressable>
          ))}

          {filtered.length === 0 && (
            <Text style={styles.recipientListEmpty}>
              No saved {countryName} recipients
            </Text>
          )}

          <View style={styles.recipientListBottomSpacer} />
        </ScrollView>
      </View>
    </ScreenShell>
  );
}