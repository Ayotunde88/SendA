// components/src/screens/HomeScreen.tsx

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  RefreshControl,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";

import ScreenShell from "./../../ScreenShell";
import PrimaryButton from "./../../PrimaryButton";
import OutlineButton from "./../../OutlineButton";
import BottomSheet from "./../../BottomSheet";
import VerifyEmailCard from "../../../components/src/screens/VerifyEmailCardScreen";
import { styles } from "../../../theme/styles";
import { COLORS } from "../../../theme/colors";
import { recents } from "../data/MockData";

import {
  sendEmailOtp,
  getUserProfile,
  getUserAccounts,
  getCountries,
  getExchangeRates,
  getTotalBalance,
  getHistoricalRates,
} from "@/api/config";

type Country = {
  code: string;
  name: string;
  flag?: string;
  dialCode?: string;
  symbol?: string;
};

type UserAccount = {
  id: string;
  currencyCode: string;
  accountName: string;
  balance?: number | null;
  iban?: string;
  bicSwift?: string;
  status?: string;
  currency?: {
    code: string;
    name: string;
    countryName?: string;
    flag?: string;
    symbol?: string;
    enabled?: boolean;
  } | null;
};

type DisplayRate = {
  from: string;
  to: string;
  fromFlag: string;
  toFlag: string;
  rate: string;
  change: string;
  numericRate: number;
};

type HistoricalPoint = {
  date: string;
  timestamp: number;
  rate: number;
};

const HIDE_BALANCE_KEY = "hide_balance_preference";

type RangeKey = "1D" | "5D" | "1M" | "1Y" | "5Y" | "MAX";

/** ---------- Mini chart helpers ---------- **/
function buildSmoothPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const mid = (a: number, b: number) => (a + b) / 2;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const mx = mid(p0.x, p1.x);
    const my = mid(p0.y, p1.y);
    d += ` Q ${p0.x} ${p0.y} ${mx} ${my}`;
    if (i === points.length - 1) {
      d += ` T ${p1.x} ${p1.y}`;
    }
  }
  return d;
}

function LiveRateMiniChart({
  pairLabel,
  baseRate,
  changePercent,
  range,
  onRangeChange,
  containerWidth,
  historicalPoints,
  isLoading,
}: {
  pairLabel: string;
  baseRate: number;
  changePercent: number;
  range: RangeKey;
  onRangeChange: (r: RangeKey) => void;
  containerWidth: number;
  historicalPoints: HistoricalPoint[];
  isLoading: boolean;
}) {
  const chartH = 160;
  const chartW = Math.max(0, containerWidth);

  const { linePath, fillPath, lastPoint } = useMemo(() => {
    if (chartW <= 0 || historicalPoints.length < 2) {
      return { linePath: "", fillPath: "", lastPoint: { x: 0, y: 0 } };
    }

    const padX = 10;
    const padTop = 12;
    const padBottom = 18;

    const rates = historicalPoints.map((p) => p.rate);
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const span = Math.max(1e-9, max - min);

    const usableW = Math.max(1, chartW - padX * 2);
    const usableH = Math.max(1, chartH - padTop - padBottom);

    const pts = historicalPoints.map((p, i) => {
      const x = padX + (i / (historicalPoints.length - 1)) * usableW;
      const y = padTop + (1 - (p.rate - min) / span) * usableH;
      return { x, y };
    });

    const dLine = buildSmoothPath(pts);

    const last = pts[pts.length - 1];
    const first = pts[0];
    const baselineY = padTop + usableH;

    const dFill = `${dLine} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;

    return { linePath: dLine, fillPath: dFill, lastPoint: last };
  }, [chartW, chartH, historicalPoints]);

  const ranges: RangeKey[] = ["1D", "5D", "1M", "1Y", "5Y", "MAX"];
  const isPositive = changePercent >= 0;

  return (
    <View style={{ marginTop: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
        <View>
          <Text style={{ fontWeight: "800", fontSize: 14, color: "#1F2937" }}>{pairLabel}</Text>
          <Text style={{ marginTop: 2, color: "#6B7280", fontSize: 12 }}>
            Live tracking • Open Exchange Rates
          </Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontWeight: "900", fontSize: 14, color: "#111827" }}>
            {Number(baseRate || 0).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6,
            })}
          </Text>
          <Text style={{ color: isPositive ? "#10B981" : "#EF4444", fontWeight: "700", fontSize: 12, marginTop: 2 }}>
            {isPositive ? "+" : ""}{changePercent.toFixed(2)}%
          </Text>
        </View>
      </View>

      {/* Range tabs */}
      <View style={{ flexDirection: "row", marginTop: 10 }}>
        {ranges.map((r) => {
          const active = r === range;
          return (
            <Pressable
              key={r}
              onPress={() => onRangeChange(r)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 999,
                marginRight: 8,
                backgroundColor: active ? "#EEF2FF" : "transparent",
              }}
            >
              <Text style={{ fontWeight: "800", color: active ? "#1D4ED8" : "#6B7280" }}>
                {r}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Chart box */}
      <View
        style={{
          width: chartW,
          height: chartH,
          borderRadius: 18,
          backgroundColor: "#fff",
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "#EEF0F3",
          marginTop: 10,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : historicalPoints.length < 2 ? (
          <Text style={{ color: "#888", fontSize: 12 }}>No chart data available</Text>
        ) : (
          <Svg width={chartW} height={chartH}>
            <Defs>
              <SvgGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={isPositive ? "#10B981" : "#EF4444"} stopOpacity="0.18" />
                <Stop offset="1" stopColor={isPositive ? "#10B981" : "#EF4444"} stopOpacity="0.00" />
              </SvgGradient>
              <SvgGradient id="lineGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={isPositive ? "#10B981" : "#EF4444"} stopOpacity="0.85" />
                <Stop offset="1" stopColor={isPositive ? "#059669" : "#DC2626"} stopOpacity="0.85" />
              </SvgGradient>
            </Defs>

            {fillPath ? <Path d={fillPath} fill="url(#areaGrad)" /> : null}
            {linePath ? (
              <Path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth={3} />
            ) : null}
            {linePath ? (
              <Path
                d={`M ${lastPoint.x} ${lastPoint.y} m -4,0 a 4,4 0 1,0 8,0 a 4,4 0 1,0 -8,0`}
                fill={isPositive ? "#10B981" : "#EF4444"}
                opacity={0.9}
              />
            ) : null}
          </Svg>
        )}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [flagsByCurrency, setFlagsByCurrency] = useState<Record<string, string>>({});
  const [displayRates, setDisplayRates] = useState<DisplayRate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(true);

  // Total balance from backend (calculated in home currency)
  const [totalBalance, setTotalBalance] = useState<number>(0);

  // Home currency from backend (based on user's signup country)
  const [homeCurrency, setHomeCurrency] = useState<string>("");
  const [homeCurrencySymbol, setHomeCurrencySymbol] = useState<string>("");

  // Privacy toggle for hiding balances
  const [hideBalance, setHideBalance] = useState(false);

  // Chart state - LIVE DATA
  const [selectedRange, setSelectedRange] = useState<RangeKey>("1M");
  const [selectedPairKey, setSelectedPairKey] = useState<string>("");
  const [historicalPoints, setHistoricalPoints] = useState<HistoricalPoint[]>([]);
  const [chartChangePercent, setChartChangePercent] = useState<number>(0);
  const [chartLoading, setChartLoading] = useState(false);
  const [fxChartWidth, setFxChartWidth] = useState(0);

  // Load hide balance preference on mount
  useEffect(() => {
    const loadHideBalancePreference = async () => {
      try {
        const stored = await AsyncStorage.getItem(HIDE_BALANCE_KEY);
        if (stored !== null) setHideBalance(stored === "true");
      } catch (e) {
        console.log("Failed to load hide balance preference:", e);
      }
    };
    loadHideBalancePreference();
  }, []);

  // Fetch LIVE historical data when pair or range changes
  useEffect(() => {
    if (!selectedPairKey) return;
    
    const [from, to] = selectedPairKey.split("_");
    if (!from || !to) return;

    const fetchHistorical = async () => {
      setChartLoading(true);
      try {
        const res = await getHistoricalRates(from, to, selectedRange);
        if (res?.success && Array.isArray(res.points)) {
          setHistoricalPoints(res.points);
          setChartChangePercent(res.changePercent || 0);
        } else {
          setHistoricalPoints([]);
          setChartChangePercent(0);
        }
      } catch (e) {
        console.log("Failed to fetch historical rates:", e);
        setHistoricalPoints([]);
        setChartChangePercent(0);
      } finally {
        setChartLoading(false);
      }
    };

    fetchHistorical();
  }, [selectedPairKey, selectedRange]);

  const toggleHideBalance = useCallback(async () => {
    const newValue = !hideBalance;
    setHideBalance(newValue);
    try {
      await AsyncStorage.setItem(HIDE_BALANCE_KEY, String(newValue));
    } catch (e) {
      console.log("Failed to save hide balance preference:", e);
    }
  }, [hideBalance]);

  const formatBalance = useCallback(
    (balance?: number | null) => {
      if (hideBalance) return "••••••";
      const amount = typeof balance === "number" ? balance : 0;
      return amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    },
    [hideBalance]
  );

  const fetchUserData = useCallback(async () => {
    try {
      const phone = await AsyncStorage.getItem("user_phone");
      const storedUser = await AsyncStorage.getItem("user_info");

      if (storedUser) {
        const userInfo = JSON.parse(storedUser);
        setEmail(userInfo.email);
        const firstName = userInfo.firstName || "";
        setUserName(firstName.trim());
      }

      // 1) countries/flags
      let flagsMap: Record<string, string> = {};
      try {
        const countriesData: Country[] = await getCountries();
        for (const c of countriesData || []) {
          const key = (c.code || "").toUpperCase().trim();
          if (key) flagsMap[key] = c.flag || "";
        }
        setFlagsByCurrency(flagsMap);
      } catch (e) {
        console.log("Failed to load countries/flags:", e);
        setFlagsByCurrency({});
      }

      let userAccounts: UserAccount[] = [];
      let userHomeCurrency = "";

      if (phone) {
        // 2) profile
        const res = await getUserProfile(phone);
        if (res?.success && res?.user) {
          setKycStatus(res.user.kycStatus);

          const firstName = res.user.firstName || "";
          if (firstName) setUserName(String(firstName).trim());

          if (res.user.homeCurrency) {
            userHomeCurrency = res.user.homeCurrency;
            setHomeCurrency(res.user.homeCurrency);
            setHomeCurrencySymbol(res.user.homeCurrencySymbol || res.user.homeCurrency);
          }
        }

        // 3) accounts
        const accountsRes = await getUserAccounts(phone, true);
        if (accountsRes?.success && accountsRes?.accounts) {
          userAccounts = accountsRes.accounts;
          setAccounts(userAccounts);
        } else {
          setAccounts([]);
        }

        // 4) total balance from backend
        try {
          const totalRes = await getTotalBalance(phone);
          if (totalRes?.success) {
            setTotalBalance(totalRes.totalBalance || 0);
            if (totalRes.homeCurrency) {
              setHomeCurrency(totalRes.homeCurrency);
              setHomeCurrencySymbol(totalRes.homeCurrencySymbol || totalRes.homeCurrency);
            }
          }
        } catch (e) {
          console.log("Failed to fetch total balance:", e);
        }
      }

      // 5) exchange rates for all wallet pairs
      setRatesLoading(true);
      try {
        const currencyCodes = userAccounts
          .map((a) => (a.currencyCode || "").toUpperCase().trim())
          .filter(Boolean);

        if (userHomeCurrency && !currencyCodes.includes(userHomeCurrency)) {
          currencyCodes.push(userHomeCurrency);
        }

        const pairs: string[] = [];
        for (const from of currencyCodes) {
          for (const to of currencyCodes) {
            if (from !== to) pairs.push(`${from}_${to}`);
          }
        }

        if (pairs.length > 0) {
          const ratesRes = await getExchangeRates(pairs.join(","));

          if (ratesRes?.success && Array.isArray(ratesRes.rates)) {
            const formatted: DisplayRate[] = ratesRes.rates.map((r: any) => {
              const from = (r.fromCurrency || r.buy_currency || "").toUpperCase();
              const to = (r.toCurrency || r.sell_currency || "").toUpperCase();
              const numericRate = parseFloat(r.rate || r.core_rate || 0);

              return {
                from,
                to,
                fromFlag: flagsMap[from] || "",
                toFlag: flagsMap[to] || "",
                rate: Number(numericRate || 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6,
                }),
                change: "+0.0%",
                numericRate: Number.isFinite(numericRate) ? numericRate : 0,
              };
            });

            setDisplayRates(formatted);

            // Auto-select first pair for chart if not set
            if (!selectedPairKey && formatted.length > 0) {
              const first = formatted[0];
              setSelectedPairKey(`${first.from}_${first.to}`);
            }
          } else {
            setDisplayRates([]);
          }
        } else {
          setDisplayRates([]);
        }
      } catch (e) {
        console.log("Failed to load exchange rates:", e);
        setDisplayRates([]);
      } finally {
        setRatesLoading(false);
      }
    } catch (e) {
      console.log("Error fetching user data:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPairKey]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchUserData();
    }, [fetchUserData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserData();
  }, [fetchUserData]);

  const handleVerifyEmail = async () => {
    try {
      await sendEmailOtp(email);
      router.push(`/checkemail?email=${encodeURIComponent(email)}`);
    } catch {
      Alert.alert("Error", "Could not send verification email");
    }
  };

  const isKycApproved = kycStatus === "verified";

  const handleBlockedAction = () => {
    Alert.alert(
      "KYC Pending",
      "Your account verification is pending approval. Please wait for admin approval to use this feature."
    );
  };

  const handleDeactivatedCurrency = (currencyCode: string) => {
    Alert.alert(
      "Currency Deactivated",
      `The ${currencyCode} currency has been deactivated by the administrator. Please contact support for assistance.`
    );
  };

  const getFlagForCurrency = (currencyCode?: string) => {
    const key = (currencyCode || "").toUpperCase().trim();
    return flagsByCurrency[key] || "";
  };

  // Show only wallet-to-wallet pairs in the visible list
  const visibleRates = useMemo(() => {
    const walletCurrencies = accounts.map((a) => (a.currencyCode || "").toUpperCase().trim());
    return displayRates
      .filter((r) => walletCurrencies.includes(r.from) && walletCurrencies.includes(r.to))
      .slice(0, 4);
  }, [displayRates, accounts]);

  // Selected rate object for chart
  const selectedRateObj = useMemo(() => {
    if (!selectedPairKey) return null;
    const [from, to] = selectedPairKey.split("_");
    return displayRates.find((r) => r.from === from && r.to === to) || null;
  }, [selectedPairKey, displayRates]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScreenShell padded={false}>
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {/* KYC Pending Banner */}
          {!loading && !isKycApproved && (
            <View
              style={{
                backgroundColor: "#FFF3CD",
                padding: 12,
                marginHorizontal: 16,
                marginTop: 8,
                borderRadius: 8,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 16, marginRight: 8 }}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", color: "#856404" }}>KYC Verification Pending</Text>
                <Text style={{ color: "#856404", fontSize: 12, marginTop: 2 }}>
                  Your account is awaiting admin approval. Some features are restricted.
                </Text>
              </View>
            </View>
          )}

          {/* Top Bar */}
          <View style={styles.topBar}>
            <Pressable style={styles.avatarCircle} onPress={() => router.push("/profile")}>
              <Text style={{ fontSize: 16 }}>👤</Text>
            </Pressable>

            {/* User Name + Total Balance */}
            <View style={{ marginLeft: 12 }}>
              {userName ? (
                <Text style={{ fontWeight: "600", fontSize: 14, color: "#222", marginTop: 2 }}>
                  {userName}
                </Text>
              ) : null}

              <Text style={{ color: "#888", fontSize: 11 }}>
                Total Balance {homeCurrency ? `(${homeCurrency})` : ""}
              </Text>

              {ratesLoading && accounts.length > 0 ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Pressable onPress={toggleHideBalance} style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ fontWeight: "700", fontSize: 16, color: "#222" }}>
                    {hideBalance ? "••••••" : `${homeCurrencySymbol}${formatBalance(totalBalance)}`}
                  </Text>
                  <Text style={{ marginLeft: 6, fontSize: 14 }}>{hideBalance ? "🙈" : "👁️"}</Text>
                </Pressable>
              )}
            </View>

            <View style={{ flex: 1 }} />

            <Pressable
              style={styles.addAccountPill}
              onPress={() => (isKycApproved ? router.push("/addaccount") : handleBlockedAction())}
            >
              <Text style={styles.addAccountIcon}>＋</Text>
              <Text style={styles.addAccountText}>Add account</Text>
            </Pressable>
          </View>

          {/* Accounts header */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>My accounts</Text>
            <View style={{ flex: 1 }} />
            <Pressable style={styles.hideBalanceRow} onPress={toggleHideBalance}>
              <Text style={styles.hideBalanceText}>{hideBalance ? "Show balance" : "Hide balance"}</Text>
              <Text style={{ marginLeft: 6 }}>{hideBalance ? "🙈" : "👁️"}</Text>
            </Pressable>
          </View>

          {/* Accounts horizontal */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountsRow}>
            {accounts.length === 0 && !loading ? (
              <View style={{ padding: 20, alignItems: "center", width: "100%" }}>
                <Text style={{ color: "#888", fontSize: 14 }}>
                  No accounts yet. Tap "Add account" to create one.
                </Text>
              </View>
            ) : (
              accounts.map((a) => {
                const isCurrencyDisabled = a.currency?.enabled === false;

                return (
                  <Pressable
                    key={a.id}
                    onPress={() => {
                      if (isCurrencyDisabled) {
                        handleDeactivatedCurrency(a.currencyCode);
                        return;
                      }
                      if (!isKycApproved) {
                        handleBlockedAction();
                        return;
                      }

                      const accountData = JSON.stringify({
                        id: a.id,
                        currencyCode: a.currencyCode,
                        accountName: a.accountName,
                        iban: a.iban,
                        bicSwift: a.bicSwift,
                        status: a.status,
                        balance: a.balance,
                        flag: getFlagForCurrency(a.currencyCode),
                        currencyName: a.currency?.name || a.currencyCode,
                      });

                      router.push(`/wallet?accountData=${encodeURIComponent(accountData)}`);
                    }}
                    style={{ marginRight: 12 }}
                  >
                    <LinearGradient
                      colors={
                        isCurrencyDisabled
                          ? ["#9ca3af", "#6b7280"]
                          : a.currencyCode === "CAD"
                          ? ["#3c3b3bff", "#3c3b3b"]
                          : ["#19955f", "#19955f"]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.accountCardGradient, isCurrencyDisabled && { opacity: 0.7 }]}
                    >
                      <View style={styles.accountHeader}>
                        <Text style={[styles.flag, { color: "#fff" }]}>{getFlagForCurrency(a.currencyCode)}</Text>
                        <Text style={styles.accountLabelWhite}>{a.currencyCode}</Text>

                        {isCurrencyDisabled && (
                          <View
                            style={{
                              backgroundColor: "#ef4444",
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                              marginLeft: 6,
                            }}
                          >
                            <Text style={{ color: "#fff", fontSize: 9, fontWeight: "600" }}>INACTIVE</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.accountAmountWhite}>{formatBalance(a.balance)}</Text>

                      <Image
                        source={require("../../../assets/images/icons/icons-icon.png")}
                        style={styles.cardCornerImage}
                        resizeMode="contain"
                      />
                    </LinearGradient>
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <PrimaryButton
              title="Transfer Now"
              onPress={() => (isKycApproved ? router.push("/sendmoney") : handleBlockedAction())}
              style={{ flex: 1 }}
            />
            <OutlineButton
              title="Add Money"
              onPress={() => (isKycApproved ? setSheetOpen(true) : handleBlockedAction())}
              style={{ flex: 1, marginLeft: 12 }}
            />
          </View>

          {kycStatus === "pending" && <VerifyEmailCard email={email} onPress={handleVerifyEmail} />}

          {/* Recents */}
          <Text style={[styles.sectionTitle, { marginTop: 18, paddingHorizontal: 16 }]}>Recent Recipients</Text>
          <View style={styles.recentRow}>
            {recents.map((r, idx) => (
              <Pressable key={idx} style={styles.recentCard} onPress={() => !isKycApproved && handleBlockedAction()}>
                <View style={styles.recentAvatarWrap}>
                  <View style={styles.recentAvatar}>
                    <Text style={{ fontWeight: "800", color: "#323232ff" }}>{r.initials}</Text>
                  </View>
                  <View style={styles.smallFlag}>
                    <Text>{r.flag}</Text>
                  </View>
                </View>
                <Text style={styles.recentName}>{r.name}</Text>
                {!!r.bank && <Text style={styles.recentBank}>{r.bank}</Text>}
              </Pressable>
            ))}
          </View>

          {/* FX */}
          <Text style={[styles.sectionTitle, { marginTop: 18, paddingHorizontal: 16 }]}>Exchange Rates</Text>

          <View style={styles.fxCard}>
            <View style={styles.fxHeader}>
              <View>
                <Text style={styles.fxTitle}>Live exchange rates</Text>
                <Text style={styles.fxSubtitle}>Mid-market • updates frequently</Text>
              </View>

              <Pressable onPress={() => {}}>
                <Text style={styles.fxSeeAll}>See all</Text>
              </Pressable>
            </View>

            <View style={styles.fxDivider} />

            {ratesLoading ? (
              <View style={{ padding: 20, alignItems: "center" }}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : visibleRates.length === 0 ? (
              <View style={{ padding: 20, alignItems: "center" }}>
                <Text style={{ color: "#888", fontSize: 14, textAlign: "center" }}>
                  Add at least two currency accounts to see exchange rates between them.
                </Text>
              </View>
            ) : (
              <>
                {visibleRates.map((x, idx) => {
                  const isPositive = String(x.change).trim().startsWith("+");
                  const key = `${x.from}_${x.to}`;

                  return (
                    <Pressable
                      key={`${x.from}-${x.to}-${idx}`}
                      style={[
                        styles.fxRow,
                        idx === visibleRates.length - 1 ? { paddingBottom: 14 } : null,
                      ]}
                      onPress={() => {
                        setSelectedPairKey(key);
                        router.push(`/convert?from=${x.from}&to=${x.to}`);
                      }}
                      onLongPress={() => {
                        setSelectedPairKey(key);
                      }}
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
                            {x.change}
                          </Text>
                        </View>
                        <Text style={styles.fxChevron}>›</Text>
                      </View>
                    </Pressable>
                  );
                })}

                {/* LIVE Chart using backend data */}
                {selectedRateObj ? (
                  <View
                    style={{ paddingHorizontal: 16, paddingBottom: 14 }}
                    onLayout={(e) => {
                      const w = e.nativeEvent.layout.width;
                      if (w !== fxChartWidth) setFxChartWidth(w);
                    }}
                  >
                    {fxChartWidth > 0 ? (
                      <LiveRateMiniChart
                        pairLabel={`${selectedRateObj.from} → ${selectedRateObj.to}`}
                        baseRate={selectedRateObj.numericRate}
                        changePercent={chartChangePercent}
                        range={selectedRange}
                        onRangeChange={setSelectedRange}
                        containerWidth={fxChartWidth}
                        historicalPoints={historicalPoints}
                        isLoading={chartLoading}
                      />
                    ) : null}

                    <View style={{ marginTop: 10 }}>
                      <Text style={styles.fxFooterText}>Last updated: just now</Text>
                    </View>
                  </View>
                ) : (
                  <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
                    <Text style={styles.fxFooterText}>Last updated: just now</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </ScreenShell>

      {/* Bottom Sheet */}
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <Text style={styles.sheetTitle}>Add money to</Text>

        {accounts.length === 0 ? (
          <Text style={{ textAlign: "center", color: "#888", padding: 20 }}>
            No accounts available. Create an account first.
          </Text>
        ) : (
          accounts.map((a) => {
            const isCurrencyDisabled = a.currency?.enabled === false;

            return (
              <Pressable
                key={a.id}
                style={[styles.sheetRow, isCurrencyDisabled && { opacity: 0.5 }]}
                onPress={() => {
                  if (isCurrencyDisabled) {
                    handleDeactivatedCurrency(a.currencyCode);
                    return;
                  }
                  setSheetOpen(false);
                  router.push("/addmoneymethods");
                }}
              >
                <View style={styles.sheetRowLeft}>
                  <Text style={styles.flag}>{getFlagForCurrency(a.currencyCode)}</Text>
                  <View>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={styles.sheetRowTitle}>{a.currencyCode}</Text>
                      {isCurrencyDisabled && (
                        <View
                          style={{
                            backgroundColor: "#ef4444",
                            paddingHorizontal: 4,
                            paddingVertical: 1,
                            borderRadius: 3,
                            marginLeft: 6,
                          }}
                        >
                          <Text style={{ color: "#fff", fontSize: 8, fontWeight: "600" }}>INACTIVE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.sheetRowSub}>{a.currencyCode}</Text>
                  </View>
                </View>
                <Text style={styles.sheetRowAmt}>{formatBalance(a.balance)}</Text>
              </Pressable>
            );
          })
        )}
      </BottomSheet>
    </SafeAreaView>
  );
}
