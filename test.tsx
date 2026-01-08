import React, { useState, useCallback, useMemo, useEffect } from "react";
import { View, Text, Pressable, Alert, RefreshControl, Image, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { ScrollView } from "react-native";
import ScreenShell from "./../../ScreenShell";
import PrimaryButton from "./../../PrimaryButton";
import OutlineButton from "./../../OutlineButton";
import BottomSheet from "./../../BottomSheet";
import { styles } from "../../../theme/styles";
import { COLORS } from "../../../theme/colors";
import { LinearGradient } from "expo-linear-gradient";
import { recents } from "../data/MockData";
import VerifyEmailCard from "../../../components/src/screens/VerifyEmailCardScreen";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { sendEmailOtp, getUserProfile, getUserAccounts, getCountries, getExchangeRates, getTotalBalance } from "@/api/config";
import { getNGNBalance } from "../../../api/flutterwave";

type Country = {
  code: string;
  name: string;
  flag?: string;
  dialCode?: string;
  symbol?: string;
  currencyCode?: string;
  currencyEnabled?: boolean;
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

type RangeKey = "1D" | "5D" | "1M" | "1Y" | "5Y" | "MAX";

const HIDE_BALANCE_KEY = "hide_balance_preference";

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
const HIDE_BALANCE_KEY = "hide_balance_preference";

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
  const [disabledCurrencies, setDisabledCurrencies] = useState<Record<string, true>>({});
  const [displayRates, setDisplayRates] = useState<DisplayRate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(true);

  // Total balance from backend (calculated in home currency)
  const [totalBalance, setTotalBalance] = useState<number>(0);

  // Home currency from backend (based on user's signup country)
  const [homeCurrency, setHomeCurrency] = useState<string>("");
  const [homeCurrencySymbol, setHomeCurrencySymbol] = useState<string>("");

  // Privacy toggle for hiding balances
  const [hideBalance, setHideBalance] = useState(false);

  // Load hide balance preference on mount
  useEffect(() => {
    const loadHideBalancePreference = async () => {
      try {
        const stored = await AsyncStorage.getItem(HIDE_BALANCE_KEY);
        if (stored !== null) {
          setHideBalance(stored === "true");
        }
      } catch (e) {
        console.log("Failed to load hide balance preference:", e);
      }
    };
    loadHideBalancePreference();
  }, []);

  // Toggle and persist hide balance preference
  const toggleHideBalance = useCallback(async () => {
    const newValue = !hideBalance;
    setHideBalance(newValue);
    try {
      await AsyncStorage.setItem(HIDE_BALANCE_KEY, String(newValue));
    } catch (e) {
      console.log("Failed to save hide balance preference:", e);
    }
  }, [hideBalance]);

  // Format balance with privacy mask
  const formatBalance = useCallback(
    (balance?: number | null) => {
      if (hideBalance) {
        return "••••••";
      }
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
        // Set user first name from stored info
        const firstName = userInfo.firstName || userInfo.first_name || "";
        setUserName(firstName.trim());
      }

      // 1) Fetch countries/currencies from backend for flags
      let flagsMap: Record<string, string> = {};
      let disabledMap: Record<string, true> = {};

      try {
        const countriesData: Country[] = await getCountries();

        for (const c of countriesData || []) {
          const flag = (c.flag || "").trim();

          // PRIMARY: 3-letter currency code for wallet lookups (USD, AUD, ...)
          const currencyKey = (c.currencyCode || "").toUpperCase().trim();
          if (currencyKey && flag && !flagsMap[currencyKey]) {
            flagsMap[currencyKey] = flag;
          }
          if (currencyKey && c.currencyEnabled === false) {
            disabledMap[currencyKey] = true;
          }

          // FALLBACK: some endpoints return currency code in `code`
          const codeKey = (c.code || "").toUpperCase().trim();
          if (codeKey && flag && !flagsMap[codeKey]) {
            flagsMap[codeKey] = flag;
          }
          if (codeKey && c.currencyEnabled === false) {
            disabledMap[codeKey] = true;
          }
        }

        setFlagsByCurrency(flagsMap);
        setDisabledCurrencies(disabledMap);
      } catch (e) {
        console.log("Failed to load countries/flags:", e);
        setFlagsByCurrency({});
        setDisabledCurrencies({});
      }

      let userAccounts: UserAccount[] = [];
      let userHomeCurrency = "";

      if (phone) {
        // 2) Fetch latest profile (KYC + home currency from backend)
        const res = await getUserProfile(phone);
        if (res.success && res.user) {
          setKycStatus(res.user.kycStatus);

          // Update user first name from profile if available
          const firstName = res.user.firstName || res.user.first_name || "";
          if (firstName) {
            setUserName(firstName.trim());
          }

          // Use backend-provided home currency (already matched to user's signup country)
          if (res.user.homeCurrency) {
            userHomeCurrency = res.user.homeCurrency;
            setHomeCurrency(res.user.homeCurrency);
            setHomeCurrencySymbol(res.user.homeCurrencySymbol || res.user.homeCurrency);
          }
        }

        // 3) Fetch accounts (+ balances)
        const accountsRes = await getUserAccounts(phone, true);
        if (accountsRes.success && accountsRes.accounts) {
          userAccounts = accountsRes.accounts;

          // Ensure NGN reflects the local ledger balance (not CurrencyCloud)
          const hasNGN = userAccounts.some(
            (a) => (a.currencyCode || "").toUpperCase().trim() === "NGN"
          );
          if (hasNGN) {
            try {
              const ngnRes = await getNGNBalance(phone);
              if (ngnRes.success) {
                userAccounts = userAccounts.map((a) =>
                  (a.currencyCode || "").toUpperCase().trim() === "NGN"
                    ? { ...a, balance: ngnRes.balance }
                    : a
                );
              }
            } catch (e) {
              console.log("Failed to fetch NGN local balance:", e);
            }
          }

          setAccounts(userAccounts);
        } else {
          setAccounts([]);
        }

        // 4) Fetch total balance from backend (calculated in home currency by CurrencyCloud)
        try {
          const totalRes = await getTotalBalance(phone);
          if (totalRes.success) {
            setTotalBalance(totalRes.totalBalance || 0);
            // Update home currency from total balance response if available
            if (totalRes.homeCurrency) {
              setHomeCurrency(totalRes.homeCurrency);
              setHomeCurrencySymbol(totalRes.homeCurrencySymbol || totalRes.homeCurrency);
            }
          }
        } catch (e) {
          console.log("Failed to fetch total balance:", e);
        }
      }

      // 4) Fetch LIVE exchange rates for user's currency pairs (including home currency)
      setRatesLoading(true);
      try {
        const currencyCodes = userAccounts
          .map((a) => (a.currencyCode || "").toUpperCase().trim())
          .filter(Boolean);

        // Include home currency in pairs for total balance conversion
        if (userHomeCurrency && !currencyCodes.includes(userHomeCurrency)) {
          currencyCodes.push(userHomeCurrency);
        }

        const pairs: string[] = [];
        for (const from of currencyCodes) {
          for (const to of currencyCodes) {
            if (from !== to) {
              pairs.push(`${from}_${to}`);
            }
          }
        }

        if (pairs.length > 0) {
          const ratesRes = await getExchangeRates(pairs.join(","));

          if (ratesRes.success && ratesRes.rates) {
            const formatted: DisplayRate[] = ratesRes.rates.map((r: any) => {
              const from = (r.fromCurrency || r.buy_currency || "").toUpperCase();
              const to = (r.toCurrency || r.sell_currency || "").toUpperCase();
              const numericRate = parseFloat(r.rate || r.core_rate || 0);
              return {
                from,
                to,
                fromFlag: flagsMap[from] || "",
                toFlag: flagsMap[to] || "",
                rate: numericRate.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                }),
                change: "+0.0%",
                numericRate,
              };
            });
            setDisplayRates(formatted);
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
  }, []);


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

  const getFlagForCurrency = (currencyCode?: string) => {
    const key = (currencyCode || "").toUpperCase().trim();

    // Backend may key flags by currencyCode (USD) OR by country ISO2 (US) depending on the record.
    const currencyToCountry: Record<string, string> = {
      USD: "US",
      AUD: "AU",
    };

    const fallbackEmoji: Record<string, string> = {
      USD: "🇺🇸",
      AUD: "🇦🇺",
    };

    const byCurrency = flagsByCurrency[key];
    if (byCurrency) return byCurrency;

    const countryKey = currencyToCountry[key];
    const byCountry = countryKey ? flagsByCurrency[countryKey] : "";
    if (byCountry) return byCountry;

    return fallbackEmoji[key] || "";
  };

  const isWalletDisabled = (a?: Pick<UserAccount, "status" | "currencyCode"> | null) => {
    const status = String(a?.status || "").toLowerCase().trim();
    if (status === "disabled" || status === "inactive" || status === "in-active") return true;

    const code = (a?.currencyCode || "").toUpperCase().trim();
    return !!(code && disabledCurrencies[code]);
  };

  // Filter display rates for UI (only show wallet-to-wallet pairs)
  const visibleRates = useMemo(() => {
    const walletCurrencies = accounts.map((a) => (a.currencyCode || "").toUpperCase().trim());
    return displayRates
      .filter((r) => walletCurrencies.includes(r.from) && walletCurrencies.includes(r.to))
      .slice(0, 4);
  }, [displayRates, accounts]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScreenShell padded={false}>
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
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
                <Text style={{ fontWeight: "700", color: "#856404" }}>
                  KYC Verification Pending
                </Text>
                <Text style={{ color: "#856404", fontSize: 12, marginTop: 2 }}>
                  Your account is awaiting admin approval. Some features are restricted.
                </Text>
              </View>
            </View>
          )}

          <View style={styles.topBar}>
            <Pressable
              style={styles.avatarCircle}
              onPress={() => router.push("/profile")}
            >
              <Text style={{ fontSize: 16 }}>👤</Text>
            </Pressable>

            {/* User Name and Total Balance */}
            <View style={{ marginLeft: 12 }}>
              {userName ? (
                <Text style={{ fontWeight: "600", fontSize: 14, color: "#222", marginBottom: 2 }}>
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
                  <Text style={{ marginLeft: 6, fontSize: 14 }}>
                    {hideBalance ? "🙈" : "👁️"}
                  </Text>
                </Pressable>
              )}
            </View>

            <View style={{ flex: 1 }} />

            <Pressable
              style={styles.addAccountPill}
              onPress={() =>
                isKycApproved ? router.push("/addaccount") : handleBlockedAction()
              }
            >
              <Text style={styles.addAccountIcon}>＋</Text>
              <Text style={styles.addAccountText}>Add account</Text>
            </Pressable>
          </View>

          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>My accounts</Text>
            <View style={{ flex: 1 }} />
            <Pressable style={styles.hideBalanceRow} onPress={toggleHideBalance}>
              <Text style={styles.hideBalanceText}>
                {hideBalance ? "Show balance" : "Hide balance"}
              </Text>
              <Text style={{ marginLeft: 6 }}>{hideBalance ? "🙈" : "👁️"}</Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.accountsRow}
          >
            {accounts.length === 0 && !loading ? (
              <View style={{ padding: 20, alignItems: "center", width: "100%" }}>
                <Text style={{ color: "#888", fontSize: 14 }}>
                  No accounts yet. Tap "Add account" to create one.
                </Text>
              </View>
            ) : (
              accounts.map((a) => {
                const walletDisabled = isWalletDisabled(a);

                return (
                  <Pressable
                    key={a.id}
                    onPress={() => {
                      if (walletDisabled) {
                        Alert.alert(
                          "Wallet Disabled",
                          "This wallet has been disabled by an administrator. Please contact support if you need it re-enabled."
                        );
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
                    style={{ marginRight: 12, opacity: walletDisabled ? 0.6 : 1 }}
                  >
                    <LinearGradient
                      colors={
                        a.currencyCode === "CAD"
                          ? ["#3c3b3bff", "#3c3b3b"]
                          : ["#19955f", "#19955f"]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.accountCardGradient}
                    >
                      {walletDisabled ? (
                        <View
                          style={{
                            position: "absolute",
                            top: 10,
                            right: 10,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 10,
                            backgroundColor: "rgba(0,0,0,0.35)",
                          }}
                        >
                          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>
                            DISABLED
                          </Text>
                        </View>
                      ) : null}

                      <View style={styles.accountHeader}>
                        <Text style={[styles.flag, { color: "#fff" }]}>
                          {getFlagForCurrency(a.currencyCode)}
                        </Text>
                        <Text style={styles.accountLabelWhite}>{a.currencyCode}</Text>
                      </View>

                      <Text style={styles.accountAmountWhite}>
                        {formatBalance(a.balance)}
                      </Text>

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

          <View style={styles.actionsRow}>
            <PrimaryButton
              title="Transfer Now"
              onPress={() =>
                isKycApproved ? router.push("/sendmoney") : handleBlockedAction()
              }
              style={{ flex: 1 }}
            />
            <OutlineButton
              title="Add Money"
              onPress={() =>
                isKycApproved ? setSheetOpen(true) : handleBlockedAction()
              }
              style={{ flex: 1, marginLeft: 12 }}
            />
          </View>

          {kycStatus === "pending" && (
            <VerifyEmailCard email={email} onPress={handleVerifyEmail} />
          )}

          <Text style={[styles.sectionTitle, { marginTop: 18, paddingHorizontal: 16 }]}>
            Recent Recipients
          </Text>
          <View style={styles.recentRow}>
            {recents.map((r, idx) => (
              <Pressable
                key={idx}
                style={styles.recentCard}
                onPress={() => !isKycApproved && handleBlockedAction()}
              >
                <View style={styles.recentAvatarWrap}>
                  <View style={styles.recentAvatar}>
                    <Text style={{ fontWeight: "800", color: "#323232ff" }}>
                      {r.initials}
                    </Text>
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

          <Text style={[styles.sectionTitle, { marginTop: 18, paddingHorizontal: 16 }]}>
            Exchange Rates
          </Text>
          <View style={styles.fxCard}>
            <View style={styles.fxHeader}>
              <View>
                <Text style={styles.fxTitle}>Live exchange rates</Text>
                <Text style={styles.fxSubtitle}>Mid-market • updates frequently</Text>
              </View>

              <Pressable onPress={() => router.push("/rates")}>
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
              visibleRates.map((x, idx) => {
                const isPositive = String(x.change).trim().startsWith("+");
                return (
                  <Pressable
                    key={`${x.from}-${x.to}-${idx}`}
                    style={[
                      styles.fxRow,
                      idx === visibleRates.length - 1 ? { paddingBottom: 14 } : null,
                    ]}
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
                      <View
                        style={[styles.fxChangePill, isPositive ? styles.fxUp : styles.fxDown]}
                      >
                        <Text
                          style={[
                            styles.fxChangeText,
                            isPositive ? styles.fxUpText : styles.fxDownText,
                          ]}
                        >
                          {x.change}
                        </Text>
                      </View>
                      <Text style={styles.fxChevron}>›</Text>
                    </View>
                  </Pressable>
                );
              })
            )}

            {selectedRateObj && (
                  <View
                    style={{ paddingHorizontal: 16, paddingBottom: 14 }}
                    onLayout={(e) => {
                      const w = e.nativeEvent.layout.width;
                      if (w !== fxChartWidth) setFxChartWidth(w);
                    }}
                  >
                    {fxChartWidth > 0 && (
                      <>
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
                        <View style={styles.midMarketBox}>
                          <View style={styles.midMarketRow}>
                            <View style={styles.midMarketIconWrap}>
                              <Ionicons name="globe-outline" size={16} style={styles.midMarketIcon} />
                            </View>
                            <View style={styles.midMarketTextWrap}>
                              <Text style={styles.midMarketTitle}>Mid-Market Rates</Text>
                              <Text style={styles.midMarketDescription}>
                                All rates shown are <Text style={styles.midMarketStrong}>mid-market rates</Text> (also
                                known as interbank rates). These represent the midpoint between buy and sell prices in
                                the global currency markets. Rates may differ slightly from Google or other sources
                                which often display retail rates with spreads.
                              </Text>
                            </View>
                          </View>
                        </View>
                      </>
                    )}

                    <View style={{ marginTop: 10 }}>
                      <Text style={styles.fxFooterText}>Last updated: just now</Text>
                    </View>
                  </View>
                )}
        </ScrollView>
      </ScreenShell>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <Text style={styles.sheetTitle}>Add money to</Text>

        {accounts.length === 0 ? (
          <Text style={{ textAlign: "center", color: "#888", padding: 20 }}>
            No accounts available. Create an account first.
          </Text>
        ) : (
          accounts.map((a) => {
            const walletDisabled = isWalletDisabled(a);

            return (
              <Pressable
                key={a.id}
                style={[styles.sheetRow, { opacity: walletDisabled ? 0.6 : 1 }]}
                onPress={() => {
                  if (walletDisabled) {
                    Alert.alert(
                      "Wallet Disabled",
                      "This wallet has been disabled by an administrator."
                    );
                    return;
                  }
                  setSheetOpen(false);
                  router.push("/addmoneymethods");
                }}
              >
                <View style={styles.sheetRowLeft}>
                  <Text style={styles.flag}>{getFlagForCurrency(a.currencyCode)}</Text>
                  <View>
                    <Text style={styles.sheetRowTitle}>{a.currencyCode}</Text>
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