import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import ScreenShell from "../../../components/ScreenShell";
import { styles } from "../../../theme/styles";
import { otherstyles } from "../../../theme/otherstyles";
import { COLORS } from "../../../theme/colors";
import { isFlutterwaveCurrency, COUNTRY_NAMES, CURRENCY_TO_COUNTRY } from "../../../api/flutterwave";
import { getRecentRecipientsFromDB, RecentRecipientFromDB } from "@/api/sync";

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

// normalize expo-router param: string | string[] | undefined -> string
function asString(v: string | string[] | undefined) {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
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

// ✅ Normalize DB/API responses into an array safely (handles null too)
function normalizeRecipients(input: unknown): RecentRecipientFromDB[] {
  if (Array.isArray(input)) return input as RecentRecipientFromDB[];

  if (input && typeof input === "object") {
    const obj = input as any;
    if (Array.isArray(obj.recipients)) return obj.recipients as RecentRecipientFromDB[];
    if (Array.isArray(obj.data)) return obj.data as RecentRecipientFromDB[];
    if (Array.isArray(obj.items)) return obj.items as RecentRecipientFromDB[];
  }

  return [];
}

// ✅ Safe currency getter (in case backend uses different field names)
function getRecipientCurrency(r: any): string {
  const cur = r?.destCurrency ?? r?.currency ?? r?.toCurrency;
  return typeof cur === "string" ? cur.toUpperCase().trim() : "";
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
  const countryCode = (CURRENCY_TO_COUNTRY[destCurrency] || "NG").toUpperCase();
  const countryName = COUNTRY_NAMES[countryCode] || countryCode;
  const isFlutterwave = isFlutterwaveCurrency(destCurrency);

  const [search, setSearch] = useState("");

  // ✅ Use ONE loading flag for this screen (you had loadingSaved but never updated it)
  const [loadingSaved, setLoadingSaved] = useState(true);

  const [saved, setSaved] = useState<RecentRecipientFromDB[]>([]);

  useEffect(() => {
    let mounted = true;
    setLoadingSaved(true);

    (async () => {
      try {
        const phone = await AsyncStorage.getItem("user_phone");
        if (!phone || !mounted) {
          if (mounted) setSaved([]);
          return;
        }

        const rawRecipients = await getRecentRecipientsFromDB(phone);
        if (!mounted) return;

        // ✅ normalize (handles null / object / array)
        const recipientsArr = normalizeRecipients(rawRecipients);

        // ✅ filter safely by destination currency
        const filtered = recipientsArr.filter((r: any) => {
          const rCur = getRecipientCurrency(r);
          return rCur && rCur === destCurrency;
        });

        setSaved(filtered);
      } catch (err) {
        console.error("Failed to load recipients from DB:", err);
        if (mounted) setSaved([]);
      } finally {
        if (mounted) setLoadingSaved(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [destCurrency]);

  // Redirect CAD to EFT screen
  // useEffect(() => {
  //   if (destCurrency === "CAD") {
  //     router.replace({
  //       pathname: "/eft-bank-details" as any,
  //       params: navParams as any,
  //     });
  //   }
  // }, [destCurrency, navParams]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return saved;

    return saved.filter((r: any) => {
      const name = String(r?.accountName || "").toLowerCase();
      const bank = String(r?.bankName || "").toLowerCase();
      const acct = String(r?.accountNumber || "");
      return name.includes(q) || bank.includes(q) || acct.includes(q);
    });
  }, [search, saved]);

  if (!isFlutterwave) {
    return (
      <ScreenShell>
        <View style={otherstyles.centerState}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={otherstyles.centerStateText}>Loading…</Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell padded={false}>
      <View style={otherstyles.recipientSelectContainer}>
        {/* Header */}
        <View style={otherstyles.confirmHeader}>
          <Pressable onPress={() => router.back()} style={otherstyles.backBtn}>
            <Text style={otherstyles.backIcon}>←</Text>
          </Pressable>

          <View style={otherstyles.confirmHeaderCenter}>
            <Text style={otherstyles.confirmTitle}>Recipients</Text>
            <Text style={otherstyles.confirmSubtitle}>Send to {countryName}</Text>
          </View>

          <Pressable style={styles.helpCircle}>
            <Text style={styles.helpCircleText}>?</Text>
          </Pressable>
        </View>

        {/* Search */}
        <View style={[styles.inputBox, otherstyles.recipientSelectSearchWrap]}>
          <Text style={styles.inputIcon}>⌕</Text>
          <TextInput
            placeholder="Search name, bank, or account number"
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            style={styles.textFieldInput}
            autoCapitalize="none"
          />
        </View>

        {/* Primary action */}
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
          style={otherstyles.recipientSelectNewCard}
        >
          <View style={otherstyles.recipientSelectNewIconCircle}>
            <Text style={otherstyles.recipientSelectNewIconPlus}>+</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={otherstyles.recipientSelectNewTitle}>New recipient</Text>
            <Text style={otherstyles.recipientSelectNewSub}>Add a {countryName} bank recipient</Text>
          </View>

          <Text style={otherstyles.recipientSelectChevron}>›</Text>
        </Pressable>

        {/* Section title */}
        <View style={otherstyles.recipientSelectSectionRow}>
          <Text style={otherstyles.recipientSelectSectionTitle}>Saved recipients</Text>
          <Text style={otherstyles.recipientSelectSectionCount}>
            {loadingSaved ? "" : `${filtered.length}`}
          </Text>
        </View>

        {/* List */}
        <ScrollView contentContainerStyle={otherstyles.recipientSelectListContent} showsVerticalScrollIndicator={false}>
          {loadingSaved ? (
            <View style={otherstyles.centerState}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={otherstyles.centerStateText}>Loading recipients…</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={otherstyles.recipientSelectEmpty}>
              <Text style={otherstyles.recipientSelectEmptyIcon}>👥</Text>
              <Text style={otherstyles.recipientSelectEmptyTitle}>No saved recipients</Text>
              <Text style={otherstyles.recipientSelectEmptySub}>
                Add a recipient to send money faster next time.
              </Text>

              <Pressable
                style={otherstyles.recipientSelectEmptyBtn}
                onPress={() =>
                  router.push({
                    pathname: "/recipientnew" as any,
                    params: { ...navParams, countryCode, countryName } as any,
                  })
                }
              >
                <Text style={otherstyles.recipientSelectEmptyBtnText}>Add recipient</Text>
              </Pressable>
            </View>
          ) : (
            <View style={otherstyles.recipientSelectCard}>
              {filtered.map((r: any, idx: number) => (
                <View key={`${r?.id || ""}-${r?.bankCode || ""}-${r?.accountNumber || ""}-${idx}`}>
                  <Pressable
                    onPress={() => {
                      // ensure recipient payload always includes currency + countryCode
                      const rCurrency = getRecipientCurrency(r) || destCurrency;
                      const cc = (CURRENCY_TO_COUNTRY[rCurrency] || countryCode || "NG").toUpperCase();

                      router.push({
                        pathname: "/recipientconfirm" as any,
                        params: {
                          ...navParams,
                          recipient: JSON.stringify({
                            ...r,
                            destCurrency: rCurrency,
                            countryCode: cc,
                          }),
                          mode: "saved",
                        } as any,
                      });
                    }}
                    style={otherstyles.recipientSelectRow}
                  >
                    <View style={otherstyles.recipientSelectAvatarCircle}>
                      <Text style={otherstyles.recipientSelectAvatarText}>{getInitials(r?.accountName)}</Text>
                    </View>

                    <View style={otherstyles.recipientSelectRowInfo}>
                      <Text style={otherstyles.recipientSelectRowName} numberOfLines={1}>
                        {r?.accountName || "Unknown"}
                      </Text>
                      <Text style={otherstyles.recipientSelectRowSub} numberOfLines={1}>
                        {r?.bankName || "—"} • {String(r?.accountNumber || "—")}
                      </Text>
                    </View>

                    <Text style={otherstyles.recipientSelectChevron}>›</Text>
                  </Pressable>

                  {idx !== filtered.length - 1 && <View style={otherstyles.recipientSelectDivider} />}
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 18 }} />
        </ScrollView>
      </View>
    </ScreenShell>
  );
}
