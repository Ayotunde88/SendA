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
  currency: string;
  countryCode: string;
  createdAt: number;
}

const SAVED_RECIPIENTS_KEY = "saved_recipients";

async function getSavedRecipients(currency?: string): Promise<SavedRecipient[]> {
  try {
    const data = await AsyncStorage.getItem(SAVED_RECIPIENTS_KEY);
    const parsed = data ? JSON.parse(data) : [];
    const recipients: SavedRecipient[] = Array.isArray(parsed) ? parsed : [];

    if (currency) {
      const c = String(currency).toUpperCase().trim();
      return recipients.filter((r) => String(r.currency || "").toUpperCase().trim() === c);
    }
    return recipients;
  } catch {
    return [];
  }
}

function getInitials(name: string) {
  const safe = String(name || "").trim();
  if (!safe) return "U";
  return safe
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

// normalize expo-router param: string | string[] | undefined -> string
function asString(v: string | string[] | undefined) {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

export default function RecipientSelectScreen() {
  const raw = useLocalSearchParams<{
    destCurrency?: string | string[];
    fromWalletId?: string | string[];
    fromCurrency?: string | string[];
    fromAmount?: string | string[];
    toAmount?: string | string[];
    rate?: string | string[];
  }>();

  // ✅ build a SAFE plain object for navigation
  const navParams = useMemo(() => {
    return {
      destCurrency: asString(raw.destCurrency),
      fromWalletId: asString(raw.fromWalletId),
      fromCurrency: asString(raw.fromCurrency),
      fromAmount: asString(raw.fromAmount),
      toAmount: asString(raw.toAmount),
      rate: asString(raw.rate),
    };
  }, [raw.destCurrency, raw.fromWalletId, raw.fromCurrency, raw.fromAmount, raw.toAmount, raw.rate]);

  const destCurrency = (navParams.destCurrency || "NGN").toUpperCase().trim();
  const countryCode = CURRENCY_TO_COUNTRY[destCurrency] || "NG";
  const countryName = COUNTRY_NAMES[countryCode] || countryCode;
  const isFlutterwave = isFlutterwaveCurrency(destCurrency);

  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState<SavedRecipient[]>([]);

  useEffect(() => {
    getSavedRecipients(destCurrency).then(setSaved);
  }, [destCurrency]);

  // Redirect CAD to EFT screen
  useEffect(() => {
    if (destCurrency === "CAD") {
      router.replace({
        pathname: "/eft-bank-details" as any,
        params: navParams as any,
      });
    }
  }, [destCurrency, navParams]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return saved;

    return saved.filter((r) => {
      const name = String(r.accountName || "").toLowerCase();
      const bank = String(r.bankName || "").toLowerCase();
      const acct = String(r.accountNumber || "");
      return name.includes(q) || bank.includes(q) || acct.includes(q);
    });
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

          <Text style={styles.recipientListTitle}>Send to {countryName}</Text>

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
                ...navParams,
                countryCode,
                countryName,
              } as any,
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

        <Text style={styles.recipientListSectionTitle}>Saved {countryName} Recipients</Text>

        <ScrollView>
          {filtered.map((r) => (
            <Pressable
              key={r.id}
              onPress={() =>
                router.push({
                  pathname: "/recipientconfirm" as any,
                  params: {
                    ...navParams,
                    recipient: JSON.stringify(r),
                    mode: "saved",
                  } as any,
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
            <Text style={styles.recipientListEmpty}>No saved {countryName} recipients</Text>
          )}

          <View style={styles.recipientListBottomSpacer} />
        </ScrollView>
      </View>
    </ScreenShell>
  );
}
