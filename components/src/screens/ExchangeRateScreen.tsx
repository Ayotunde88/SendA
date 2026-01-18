import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import ScreenShell from "../../ScreenShell";
import { styles } from "../../../theme/styles";
import { COLORS } from "../../../theme/colors";
import { getCountries, getExchangeRates, getUserAccounts, getPublicCurrencies } from "@/api/config";
import CreateRateAlertSheet from "../../../components/CreateRateAlertSheet";

const CACHED_FLAGS_KEY = "cached_flags_v1";

type Country = {
  code: string;
  name: string;
  flag?: string;
  currencyCode?: string;
  currencyEnabled?: boolean;
};

type UserAccount = {
  id: string;
  currencyCode: string;
  accountName: string;
  balance?: number | null;
  status?: string;
};

type DisplayRate = {
  from: string;
  to: string;
  fromFlag: string;
  toFlag: string;
  rate: string;
  numericRate: number;
  change?: string;
};

function buildPairs(codes: string[]) {
  const uniq = Array.from(new Set(codes.map((c) => c.toUpperCase().trim()).filter(Boolean)));
  const pairs: string[] = [];
  for (const from of uniq) {
    for (const to of uniq) {
      if (from !== to) pairs.push(`${from}_${to}`);
    }
  }
  return pairs;
}

export default function ExchangeRatesScreen() {
  const router = useRouter();
  const isInitialMount = useRef(true);

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [query, setQuery] = useState("");

  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [flagsByKey, setFlagsByKey] = useState<Record<string, string>>({});
  const [disabledCurrencies, setDisabledCurrencies] = useState<Record<string, true>>({});

  const [rates, setRates] = useState<DisplayRate[]>([]);
  const [baseCurrency, setBaseCurrency] = useState<string>("");

  // Rate alert state
  const [alertSheetOpen, setAlertSheetOpen] = useState(false);
  const [selectedRate, setSelectedRate] = useState<DisplayRate | null>(null);

  const openAlertSheet = useCallback((rate: DisplayRate) => {
    setSelectedRate(rate);
    setAlertSheetOpen(true);
  }, []);

  const getFlagForCurrency = useCallback(
    (currencyCode?: string) => {
      const key = (currencyCode || "").toUpperCase().trim();

      const currencyToCountry: Record<string, string> = {
        USD: "US",
        AUD: "AU",
        GBP: "GB",
        EUR: "EU",
        CAD: "CA",
        NGN: "NG",
      };

      const fallbackEmoji: Record<string, string> = {
        USD: "🇺🇸",
        AUD: "🇦🇺",
        GBP: "🇬🇧",
        EUR: "🇪🇺",
        CAD: "🇨🇦",
        NGN: "🇳🇬",
      };

      const byCurrency = flagsByKey[key];
      if (byCurrency) return byCurrency;

      const countryKey = currencyToCountry[key];
      const byCountry = countryKey ? flagsByKey[countryKey] : "";
      if (byCountry) return byCountry;

      return fallbackEmoji[key] || "";
    },
    [flagsByKey]
  );

  // Load cached flags on mount
  useEffect(() => {
    const loadCachedFlags = async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHED_FLAGS_KEY);
        if (cached) {
          setFlagsByKey(JSON.parse(cached));
        }
      } catch (e) {
        console.log("Failed to load cached flags:", e);
      }
    };
    loadCachedFlags();
  }, []);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      // Load flags using 3-tier strategy: currencies API → countries fallback → cache
      let currentFlagsByKey = flagsByKey;
      let currentDisabledCurrencies = disabledCurrencies;

      if (!isRefresh || Object.keys(flagsByKey).length === 0) {
        try {
          // Parallel fetch - currencies (primary) and countries (fallback)
          const [currenciesResult, countriesResult] = await Promise.allSettled([
            getPublicCurrencies(true), // All currencies for complete flag mapping
            getCountries(),
          ]);

          const flagsMap: Record<string, string> = {};
          const disabledMap: Record<string, true> = {};

          // First, populate from currencies endpoint (most accurate for currency codes)
          if (currenciesResult.status === 'fulfilled') {
            for (const c of currenciesResult.value || []) {
              const flag = ((c as any).flag || "").trim();
              const currencyKey = ((c as any).code || "").toUpperCase().trim();
              if (currencyKey && flag) flagsMap[currencyKey] = flag;
              if (currencyKey && !(c as any).enabled) disabledMap[currencyKey] = true;
            }
          }

          // Then, fill gaps from countries endpoint
          if (countriesResult.status === 'fulfilled') {
            const countriesData = countriesResult.value as Country[];
            for (const c of countriesData || []) {
              const flag = (c.flag || "").trim();
              const cur = (c.currencyCode || "").toUpperCase().trim();
              const code = (c.code || "").toUpperCase().trim();

              // Only add if not already present from currencies
              if (cur && flag && !flagsMap[cur]) flagsMap[cur] = flag;
              if (code && flag && !flagsMap[code]) flagsMap[code] = flag;

              if (cur && c.currencyEnabled === false && !disabledMap[cur]) disabledMap[cur] = true;
              if (code && c.currencyEnabled === false && !disabledMap[code]) disabledMap[code] = true;
            }
          }

          if (Object.keys(flagsMap).length > 0) {
            setFlagsByKey(flagsMap);
            setDisabledCurrencies(disabledMap);
            currentFlagsByKey = flagsMap;
            currentDisabledCurrencies = disabledMap;
            // Cache flags for instant restore
            AsyncStorage.setItem(CACHED_FLAGS_KEY, JSON.stringify(flagsMap)).catch(() => {});
          }
        } catch (e) {
          console.log("Failed to load flags:", e);
        }
      }

      // Load accounts
      const phone = await AsyncStorage.getItem("user_phone");
      let userAccounts: UserAccount[] = [];

      if (phone) {
        try {
          const res = await getUserAccounts(phone, true);
          if (res?.success && Array.isArray(res.accounts)) {
            userAccounts = res.accounts;
            setAccounts(userAccounts);
          }
        } catch (e) {
          console.log("Failed to load accounts:", e);
        }
      }

      // Load rates
      const enabled = userAccounts
        .map((a) => (a.currencyCode || "").toUpperCase().trim())
        .filter(Boolean)
        .filter((c) => !currentDisabledCurrencies[c]);

      const pairs = buildPairs(enabled);

      if (pairs.length === 0) {
        setRates([]);
        return;
      }

      const res = await getExchangeRates(pairs.join(","));
      if (res?.success && Array.isArray(res.rates)) {
        const formatted: DisplayRate[] = res.rates
          .map((r: any) => {
            const from = (r.fromCurrency || r.buy_currency || "").toUpperCase().trim();
            const to = (r.toCurrency || r.sell_currency || "").toUpperCase().trim();
            const numericRate = parseFloat(r.rate || r.core_rate || 0);

            if (!from || !to || !Number.isFinite(numericRate)) return null;

            // Use local flag lookup
            const getFlag = (code: string) => {
              const key = code.toUpperCase().trim();
              const currencyToCountry: Record<string, string> = { USD: "US", AUD: "AU", GBP: "GB", EUR: "EU", CAD: "CA", NGN: "NG" };
              const fallbackEmoji: Record<string, string> = { USD: "🇺🇸", AUD: "🇦🇺", GBP: "🇬🇧", EUR: "🇪🇺", CAD: "🇨🇦", NGN: "🇳🇬" };
              return currentFlagsByKey[key] || currentFlagsByKey[currencyToCountry[key]] || fallbackEmoji[key] || "";
            };

            return {
              from,
              to,
              fromFlag: getFlag(from),
              toFlag: getFlag(to),
              numericRate,
              rate: numericRate.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              }),
              change: r.change || "+0.0%",
            } as DisplayRate;
          })
          .filter(Boolean) as DisplayRate[];

        const defaultBase = enabled[0] || "";
        if (!baseCurrency && defaultBase) setBaseCurrency(defaultBase);

        setRates(formatted);
      } else {
        setRates([]);
      }
    } catch (e) {
      console.log("Failed to load exchange rates:", e);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [baseCurrency, flagsByKey, disabledCurrencies]);

  // Initial load only
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadData(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [loadData]);

  const baseCurrencies = useMemo(() => {
    const list = accounts
      .map((a) => (a.currencyCode || "").toUpperCase().trim())
      .filter(Boolean);
    return Array.from(new Set(list));
  }, [accounts]);

  const visibleRates = useMemo(() => {
    const q = query.trim().toUpperCase();
    let list = rates;

    if (baseCurrency) {
      const top = list.filter((r) => r.from === baseCurrency);
      const rest = list.filter((r) => r.from !== baseCurrency);
      list = [...top, ...rest];
    }

    if (!q) return list;

    return list.filter((r) => {
      const pair = `${r.from} ${r.to}`.toUpperCase();
      return pair.includes(q);
    });
  }, [rates, query, baseCurrency]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScreenShell padded={false}>
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>

            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Exchange Rates</Text>
              <Text style={styles.subtitle}>Mid-market • updates frequently</Text>
            </View>

            <View style={styles.helpCircle}>
              <Text style={styles.helpCircleText}>?</Text>
            </View>
          </View>

          {/* Search */}
          <View style={styles.searchWrap}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search currency pair (e.g. USD, CAD, USD→NGN)"
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              autoCapitalize="characters"
            />
          </View>

          {/* Base currency pills */}
          {baseCurrencies.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10 }}
            >
              {baseCurrencies.map((c) => {
                const active = c === baseCurrency;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setBaseCurrency(c)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 999,
                      marginRight: 10,
                      backgroundColor: active ? "rgba(25,149,95,0.12)" : "#ffffff",
                      borderWidth: 1,
                      borderColor: active ? "rgba(25,149,95,0.25)" : "#E5E7EB",
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ marginRight: 6 }}>{getFlagForCurrency(c)}</Text>
                    <Text style={{ fontWeight: "900", color: active ? "#19955f" : "#111827", fontSize: 12 }}>
                      {c}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* Rates Card */}
          <View style={[styles.fxCard, { marginTop: 14 }]}>
            <View style={styles.fxHeader}>
              <View>
                <Text style={styles.fxTitle}>All rates</Text>
                <Text style={styles.fxSubtitle}>
                  Showing {visibleRates.length} pair{visibleRates.length === 1 ? "" : "s"}
                </Text>
              </View>

              <Pressable onPress={onRefresh} disabled={refreshing}>
                <Text style={styles.fxSeeAll}>{refreshing ? "Refreshing..." : "Refresh"}</Text>
              </Pressable>
            </View>

            <View style={styles.fxDivider} />

            {initialLoading ? (
              <View style={{ padding: 20, alignItems: "center" }}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={{ marginTop: 10, color: "#9CA3AF", fontWeight: "700" }}>Loading rates…</Text>
              </View>
            ) : accounts.length < 2 ? (
              <View style={{ padding: 20, alignItems: "center" }}>
                <Text style={{ color: "#888", fontSize: 14, textAlign: "center" }}>
                  Add at least two currency accounts to see exchange rates between them.
                </Text>
              </View>
            ) : visibleRates.length === 0 ? (
              <View style={{ padding: 20, alignItems: "center" }}>
                <Text style={{ color: "#9CA3AF", fontWeight: "700" }}>No matching rates</Text>
              </View>
            ) : (
              visibleRates.map((x, idx) => {
                const isPositive = String(x.change || "").trim().startsWith("+");
                return (
                  <View
                    key={`${x.from}-${x.to}-${idx}`}
                    style={[styles.fxRow, idx === visibleRates.length - 1 ? { paddingBottom: 14 } : null]}
                  >
                    <Pressable
                      style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
                      onPress={() => router.push(`/convert?from=${x.from}&to=${x.to}`)}
                    >
                      <View style={styles.fxLeft}>
                        <View style={styles.fxFlags}>
                          <Text style={styles.fxFlag}>{x.fromFlag}</Text>
                          <Text style={styles.fxFlag}>{x.toFlag}</Text>
                        </View>

                        <View>
                          <Text style={styles.fxPair}>
                            {x.from} → {x.to}
                          </Text>
                          <Text style={styles.fxPairSub}>
                            1 {x.from} = {x.rate} {x.to}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.fxRight}>
                        <View style={[styles.fxChangePill, isPositive ? styles.fxUp : styles.fxDown]}>
                          <Text style={[styles.fxChangeText, isPositive ? styles.fxUpText : styles.fxDownText]}>
                            {x.change || "+0.0%"}
                          </Text>
                        </View>
                      </View>
                    </Pressable>

                    {/* Alert Bell Button */}
                    <Pressable
                      onPress={() => openAlertSheet(x)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: "rgba(25,149,95,0.1)",
                        alignItems: "center",
                        justifyContent: "center",
                        marginLeft: 8,
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>🔔</Text>
                    </Pressable>

                    <Text style={styles.fxChevron}>›</Text>
                  </View>
                );
              })
            )}

            {!initialLoading && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
                <Text style={styles.fxFooterText}>Last updated: just now</Text>
              </View>
            )}
          </View>

          {/* Quick action */}
          <View style={{ paddingHorizontal: 16, marginTop: 14, gap: 10 }}>
            <Pressable onPress={() => router.push("/convert")} style={styles.primaryBtn}>
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>Convert currency</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/ratealerts")}
              style={{
                backgroundColor: "#fff",
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: "center",
                borderWidth: 1.5,
                borderColor: COLORS.primary,
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 16 }}>🔔</Text>
              <Text style={{ color: COLORS.primary, fontWeight: "900", fontSize: 16 }}>
                Manage Rate Alerts
              </Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* Rate Alert Sheet */}
        {selectedRate && (
          <CreateRateAlertSheet
            open={alertSheetOpen}
            onClose={() => {
              setAlertSheetOpen(false);
              setSelectedRate(null);
            }}
            fromCurrency={selectedRate.from}
            toCurrency={selectedRate.to}
            currentRate={selectedRate.numericRate}
            fromFlag={selectedRate.fromFlag}
            toFlag={selectedRate.toFlag}
            onSuccess={() => {
              // Optionally refresh or show toast
            }}
          />
        )}
      </ScreenShell>
    </SafeAreaView>
  );
}