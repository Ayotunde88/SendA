import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  RefreshControl,
  Image,
  ActivityIndicator,
  LayoutChangeEvent,
  Animated,
  Easing,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { ScrollView } from "react-native";
import ScreenShell from "./../../ScreenShell";
import PrimaryButton from "./../../PrimaryButton";
import OutlineButton from "./../../OutlineButton";
import BottomSheet from "./../../BottomSheet";
import { styles } from "../../../theme/styles";
import { COLORS } from "../../../theme/colors";
import { LinearGradient } from "expo-linear-gradient";
import VerifyEmailCard from "../../../components/src/screens/VerifyEmailCardScreen";
import VerifyIdentityCardScreen from "./VerifyIdentityCardScreen";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  sendEmailOtp,
  getUserProfile,
  getUserAccounts,
  getCountries,
  getExchangeRates,
  getTotalBalance,
  createPlaidIdvSession,
  getPublicCurrencies,
  getHistoricalRates,
  checkEmailVerified,
} from "@/api/config";
import { getLocalBalance } from "../../../api/flutterwave";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Circle } from "react-native-svg";
import { usePendingSettlements, clearPendingForCurrency } from "../../../hooks/usePendingSettlements";
import { PendingBadge } from "../../../components/PendingBadge";

/** ---------------- Types ---------------- **/
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
  isExotic?: boolean;
  currency?: {
    code: string;
    name: string;
    countryName?: string;
    flag?: string;
    symbol?: string;
    isExotic?: boolean;
    is_exotic?: boolean;
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
type HistoricalPoint = { date: string; timestamp: number; rate: number };
type RangeKey = "1D" | "5D" | "1M" | "1Y" | "5Y" | "MAX";
type SavedRecipient = {
  id: string;
  accountName: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  createdAt: number;
};
type RecentRecipient = SavedRecipient & { destCurrency: "NGN" | "CAD"; lastSentAt: number };

const HIDE_BALANCE_KEY = "hide_balance_preference";
const RECENT_RECIPIENTS_KEY = "recent_recipients_v1";
const CACHED_ACCOUNTS_KEY = "cached_accounts_v1";
const CACHED_TOTAL_BALANCE_KEY = "cached_total_balance_v1";
const CACHED_FLAGS_KEY = "cached_flags_v1";
const CACHED_RATE_CHANGES_KEY = "cached_rate_changes_v1";
const RATE_CHANGES_TTL_MS = 5 * 60 * 1000; // 5 minutes
const KNOWN_EXOTIC_CURRENCIES = ["NGN", "GHS", "RWF", "UGX", "TZS", "ZMW", "XOF", "XAF"];

/** ---------- Cache helpers for stale-while-revalidate ---------- **/
async function loadCachedAccounts(): Promise<UserAccount[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHED_ACCOUNTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.log("[Cache] Failed to load cached accounts:", e);
  }
  return [];
}
async function saveCachedAccounts(accounts: UserAccount[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHED_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.log("[Cache] Failed to save:", e);
  }
}
async function loadCachedTotalBalance(): Promise<{ total: number; currency: string; symbol: string } | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHED_TOTAL_BALANCE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.total === "number") return parsed;
    }
  } catch (e) {
    console.log("[Cache] Failed to load cached total:", e);
  }
  return null;
}
async function saveCachedTotalBalance(total: number, currency: string, symbol: string): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHED_TOTAL_BALANCE_KEY, JSON.stringify({ total, currency, symbol }));
  } catch (e) {
    console.log("[Cache] Failed to save:", e);
  }
}

/** ---------- Skeleton Components ---------- */
function SkeletonPulse({ style }: { style?: any }) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [animatedValue]);
  const opacity = animatedValue.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  return <Animated.View style={[{ backgroundColor: "#E5E7EB", borderRadius: 8 }, style, { opacity }]} />;
}

function TotalBalanceSkeleton() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <SkeletonPulse style={{ width: 120, height: 20 }} />
    </View>
  );
}

function AccountCardSkeleton() {
  return (
    <View
      style={{ width: 160, height: 100, borderRadius: 16, backgroundColor: "#E5E7EB", marginRight: 12, padding: 14 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <SkeletonPulse style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#D1D5DB" }} />
        <SkeletonPulse style={{ width: 40, height: 14, marginLeft: 8, backgroundColor: "#D1D5DB" }} />
      </View>
      <SkeletonPulse style={{ width: 100, height: 24, backgroundColor: "#D1D5DB" }} />
    </View>
  );
}

function AccountsListSkeleton() {
  return (
    <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 8 }}>
      <AccountCardSkeleton />
      <AccountCardSkeleton />
      <AccountCardSkeleton />
    </View>
  );
}

function ExchangeRateRowSkeleton() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16 }}>
      <View style={{ flexDirection: "row", marginRight: 12 }}>
        <SkeletonPulse style={{ width: 28, height: 28, borderRadius: 14 }} />
        <SkeletonPulse style={{ width: 28, height: 28, borderRadius: 14, marginLeft: -8 }} />
      </View>
      <View style={{ flex: 1 }}>
        <SkeletonPulse style={{ width: 100, height: 16, marginBottom: 6 }} />
        <SkeletonPulse style={{ width: 140, height: 12 }} />
      </View>
      <SkeletonPulse style={{ width: 60, height: 24, borderRadius: 12 }} />
    </View>
  );
}

function ExchangeRatesSkeleton() {
  return (
    <View>
      <ExchangeRateRowSkeleton />
      <View style={{ height: 1, backgroundColor: "#F3F4F6", marginHorizontal: 16 }} />
      <ExchangeRateRowSkeleton />
      <View style={{ height: 1, backgroundColor: "#F3F4F6", marginHorizontal: 16 }} />
      <ExchangeRateRowSkeleton />
      <View style={{ height: 1, backgroundColor: "#F3F4F6", marginHorizontal: 16 }} />
      <ExchangeRateRowSkeleton />
    </View>
  );
}

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
    if (i === points.length - 1) d += ` T ${p1.x} ${p1.y}`;
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
  const chartH = 170;
  const chartW = Math.max(0, Math.floor(containerWidth || 0));
  const ranges: RangeKey[] = ["1D", "5D", "1M", "1Y", "5Y", "MAX"];
  const isPositive = changePercent >= 0;
  const { linePath, fillPath, lastPoint } = useMemo(() => {
    if (chartW <= 0 || historicalPoints.length < 2) return { linePath: "", fillPath: "", lastPoint: { x: 0, y: 0 } };
    const padX = 14;
    const padTop = 14;
    const padBottom = 26;
    const rates = historicalPoints.map((p) => p.rate);
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const span = Math.max(1e-9, max - min);
    const usableW = Math.max(1, chartW - padX * 2);
    const usableH = Math.max(1, chartH - padTop - padBottom);
    const pts = historicalPoints.map((p, i) => ({
      x: padX + (i / (historicalPoints.length - 1)) * usableW,
      y: padTop + (1 - (p.rate - min) / span) * usableH,
    }));
    const dLine = buildSmoothPath(pts);
    const last = pts[pts.length - 1];
    const first = pts[0];
    const baselineY = padTop + usableH;
    const dFill = `${dLine} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
    return { linePath: dLine, fillPath: dFill, lastPoint: last };
  }, [chartW, historicalPoints]);
  return (
    <View style={{ marginTop: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 2 }}>
        {ranges.map((r) => (
          <Pressable
            key={r}
            onPress={() => onRangeChange(r)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: r === range ? "rgba(25,149,95,0.10)" : "transparent",
            }}
          >
            <Text style={{ fontWeight: "800", color: r === range ? "#19955f" : "#6b7280", fontSize: 12 }}>{r}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
        <View>
          <Text style={{ color: "#6b7280", fontSize: 12, fontWeight: "700" }}>{pairLabel}</Text>
          <Text style={{ color: "#111827", fontSize: 16, fontWeight: "900", marginTop: 2 }}>
            {Number(baseRate || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: isPositive ? "rgba(25,149,95,0.12)" : "rgba(239,68,68,0.12)",
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "900", color: isPositive ? "#19955f" : "#ef4444" }}>
            {isPositive ? "+" : ""}
            {changePercent.toFixed(2)}%
          </Text>
        </View>
      </View>
      <View style={{ marginTop: 10, borderRadius: 14, overflow: "hidden", width: "100%" }}>
        {isLoading ? (
          <View style={{ height: chartH, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        ) : chartW <= 0 || historicalPoints.length < 2 || !linePath ? (
          <View style={{ height: chartH, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 }}>
            <Text style={{ color: "#9ca3af", fontSize: 12, textAlign: "center" }}>Not enough data to plot chart</Text>
          </View>
        ) : (
          <Svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: "100%" }}>
            <Defs>
              <SvgGradient id="fxFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#19955f" stopOpacity="0.24" />
                <Stop offset="100%" stopColor="#19955f" stopOpacity="0" />
              </SvgGradient>
            </Defs>
            <Path d={fillPath} fill="url(#fxFill)" />
            <Path d={linePath} stroke="#111827" strokeWidth={3} fill="none" />
            <Circle cx={lastPoint.x} cy={lastPoint.y} r={5} fill="#111827" />
          </Svg>
        )}
      </View>
    </View>
  );
}

function generateMockHistory(baseRate: number, range: RangeKey): HistoricalPoint[] {
  const now = Date.now();
  const cfg: Record<RangeKey, { points: number; stepMs: number; volatility: number }> = {
    "1D": { points: 24, stepMs: 60 * 60 * 1000, volatility: 0.0025 },
    "5D": { points: 30, stepMs: 4 * 60 * 60 * 1000, volatility: 0.003 },
    "1M": { points: 35, stepMs: 24 * 60 * 60 * 1000, volatility: 0.004 },
    "1Y": { points: 40, stepMs: 9 * 24 * 60 * 60 * 1000, volatility: 0.006 },
    "5Y": { points: 45, stepMs: 45 * 24 * 60 * 60 * 1000, volatility: 0.008 },
    MAX: { points: 50, stepMs: 75 * 24 * 60 * 60 * 1000, volatility: 0.01 },
  };
  const { points, stepMs, volatility } = cfg[range];
  let value = Math.max(0.000001, baseRate);
  const out: HistoricalPoint[] = [];
  for (let i = points - 1; i >= 0; i--) {
    const t = now - i * stepMs;
    const wave = Math.sin((points - i) / 6) * volatility * value;
    const noise = (Math.random() - 0.5) * 2 * volatility * value;
    value = Math.max(0.000001, value + wave + noise);
    out.push({ date: new Date(t).toISOString(), timestamp: t, rate: value });
  }
  return out;
}

async function getRecentRecipients(): Promise<RecentRecipient[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_RECIPIENTS_KEY);
    const list = raw ? (JSON.parse(raw) as RecentRecipient[]) : [];
    if (!Array.isArray(list)) return [];
    return list.sort((a, b) => (b.lastSentAt || 0) - (a.lastSentAt || 0));
  } catch {
    return [];
  }
}


/** Fetch real rate changes from historical API with caching */
async function fetchRateChangesForPairs(
  rates: DisplayRate[],
  cachedChanges: Record<string, { change: number; timestamp: number }>,
  setDisplayRates: React.Dispatch<React.SetStateAction<DisplayRate[]>>
): Promise<void> {
  if (rates.length === 0) return;

  const now = Date.now();
  const pairsToFetch = rates.filter((r) => {
    const pairKey = `${r.from}_${r.to}`;
    const cached = cachedChanges[pairKey];
    return !cached || now - cached.timestamp >= RATE_CHANGES_TTL_MS;
  });

  if (pairsToFetch.length === 0) return;

  const newChanges: Record<string, { change: number; timestamp: number }> = { ...cachedChanges };

  // Fetch historical data for each pair
  const results = await Promise.allSettled(
    pairsToFetch.map(async (r) => {
      const pairKey = `${r.from}_${r.to}`;
      try {
        const historicalRes = await getHistoricalRates(r.from, r.to, "1D");
        if (historicalRes.success && historicalRes.data && historicalRes.data.length >= 2) {
          const first = historicalRes.data[0].rate;
          const last = historicalRes.data[historicalRes.data.length - 1].rate;
          const changePercent = first > 0 ? ((last - first) / first) * 100 : 0;
          return { pairKey, change: changePercent };
        }
      } catch (e) {
        console.log(`[HomeScreen] Failed to fetch historical for ${pairKey}:`, e);
      }
      return { pairKey, change: 0 };
    })
  );

  // Update cache with new values
  for (const result of results) {
    if (result.status === "fulfilled") {
      const { pairKey, change } = result.value;
      newChanges[pairKey] = { change, timestamp: now };
    }
  }

  // Save to cache
  try {
    await AsyncStorage.setItem(CACHED_RATE_CHANGES_KEY, JSON.stringify(newChanges));
  } catch {}

  // Update display rates with real changes
  setDisplayRates((prev) =>
    prev.map((r) => {
      const pairKey = `${r.from}_${r.to}`;
      const entry = newChanges[pairKey];
      if (entry) {
        const sign = entry.change >= 0 ? "+" : "";
        return { ...r, change: `${sign}${entry.change.toFixed(2)}%` };
      }
      return r;
    })
  );
}


function getInitials(name: string) {
  return (name || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function HomeScreen() {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const hasLoadedOnceRef = useRef(false);
  const isFetchingRef = useRef(false);
  const hasCacheLoadedRef = useRef(false);
  const lastFetchAtRef = useRef<number>(0);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  // Keep an amount skeleton visible until we confirm a fresh API balance.
  const [balanceLoadingByCurrency, setBalanceLoadingByCurrency] = useState<Record<string, boolean>>({});
  const [flagsByCurrency, setFlagsByCurrency] = useState<Record<string, string>>({});
  const [disabledCurrencies, setDisabledCurrencies] = useState<Record<string, true>>({});
  const [displayRates, setDisplayRates] = useState<DisplayRate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(true);
  // Avoid showing misleading 0.00 on cold start.
  const [totalBalance, setTotalBalance] = useState<number | null>(null);
  const [homeCurrency, setHomeCurrency] = useState<string>("");
  const [homeCurrencySymbol, setHomeCurrencySymbol] = useState<string>("");
  const [hideBalance, setHideBalance] = useState(false);
  const [recentRecipients, setRecentRecipients] = useState<RecentRecipient[]>([]);
  const [selectedRange, setSelectedRange] = useState<RangeKey>("1M");
  const [fxChartWidth, setFxChartWidth] = useState(0);
  const [historicalPoints, setHistoricalPoints] = useState<HistoricalPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartChangePercent, setChartChangePercent] = useState(0);
  const [emailVerified, setEmailVerified] = useState(false);
  const [userPhone, setUserPhone] = useState("");
  const onSettlementConfirmedRef = useRef<() => void>(() => {});

  const {
    pendingByCurrency,
    hasPending: hasPendingSettlements,
    isPolling,
    refresh: refreshPendingSettlements,
    getOptimisticBalance,
    hasPendingForCurrency,
  } = usePendingSettlements(
    useCallback(() => {
      onSettlementConfirmedRef.current();
    }, []),
    true,
  );

  // ✅ Load cached data IMMEDIATELY on mount (stale-while-revalidate)
  useEffect(() => {

    const loadEmailVerified = async () => {
      const phone = await AsyncStorage.getItem("user_phone");
      const emailCheck = await checkEmailVerified(phone as string);
      setEmailVerified(emailCheck.emailVerified);
    };
    const loadCachedData = async () => {
      if (hasCacheLoadedRef.current) return;
      hasCacheLoadedRef.current = true;
      console.log("[HomeScreen] Loading cached data...");
      const cachedAccounts = await loadCachedAccounts();
      if (cachedAccounts.length > 0) {
        console.log("[HomeScreen] Using cached accounts:", cachedAccounts.length);
        setAccounts(cachedAccounts);
        // Cached balances exist, but they are not yet confirmed by the API.
        setBalanceLoadingByCurrency((prev) => {
          const next: Record<string, boolean> = { ...prev };
          for (const a of cachedAccounts) {
            const ccy = String(a?.currencyCode || "").toUpperCase().trim();
            if (ccy) next[ccy] = true;
          }
          return next;
        });
      }
      const cachedTotal = await loadCachedTotalBalance();
      if (cachedTotal) {
        console.log("[HomeScreen] Using cached total:", cachedTotal.total);
        setTotalBalance(cachedTotal.total);
        setHomeCurrency(cachedTotal.currency);
        setHomeCurrencySymbol(cachedTotal.symbol);
      }
    };
    loadCachedData();
    loadEmailVerified();
  }, []);

  useEffect(() => {
    (async () => {
      

      const stored = await AsyncStorage.getItem(HIDE_BALANCE_KEY);
      if (stored !== null) setHideBalance(stored === "true");
    })();
  }, []);

  const toggleHideBalance = useCallback(async () => {
    const newValue = !hideBalance;
    setHideBalance(newValue);
    try {
      await AsyncStorage.setItem(HIDE_BALANCE_KEY, String(newValue));
    } catch {}
  }, [hideBalance]);
  const formatBalance = useCallback(
    (balance?: number | null) => {
      if (hideBalance) return "••••••";
      if (typeof balance !== "number" || !Number.isFinite(balance)) return "—";
      return balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    [hideBalance],
  );

  const fetchUserData = useCallback(async (force: boolean = false) => {
    const now = Date.now();
    // Prevent burst fetches during fast navigation (Home -> Wallet -> Home).
    // This is a major cause of "too many API requests" and balance flicker.
    if (!force && lastFetchAtRef.current && now - lastFetchAtRef.current < 6000) {
      console.log("[HomeScreen] Skipping - throttled");
      return;
    }
    if (isFetchingRef.current) {
      console.log("[HomeScreen] Skipping - already fetching");
      return;
    }
    isFetchingRef.current = true;
    lastFetchAtRef.current = now;
    try {
      const phone = await AsyncStorage.getItem("user_phone");
      const storedUser = await AsyncStorage.getItem("user_info");
      if (storedUser) {
        const userInfo = JSON.parse(storedUser);
        setEmail(userInfo.email);
        setUserName(String(userInfo.firstName || userInfo.first_name || "").trim());
      }
      let flagsMap: Record<string, string> = {};
      let disabledMap: Record<string, true> = {};
      try {
        const countriesData: Country[] = await getCountries();
        for (const c of countriesData || []) {
          const flag = (c.flag || "").trim();
          const currencyKey = (c.currencyCode || "").toUpperCase().trim();
          if (currencyKey && flag && !flagsMap[currencyKey]) flagsMap[currencyKey] = flag;
          if (currencyKey && c.currencyEnabled === false) disabledMap[currencyKey] = true;
          const codeKey = (c.code || "").toUpperCase().trim();
          if (codeKey && flag && !flagsMap[codeKey]) flagsMap[codeKey] = flag;
          if (codeKey && c.currencyEnabled === false) disabledMap[codeKey] = true;
        }
        setFlagsByCurrency(flagsMap);
        setDisabledCurrencies(disabledMap);
      } catch (e) {
        console.log("Failed to load countries:", e);
      }
      let userAccounts: UserAccount[] = [];
      let userHomeCurrency = "";
      if (phone) {
        // Mark all visible wallet cards as "loading" (amount skeleton) while we refresh.
        setBalanceLoadingByCurrency((prev) => {
          const next: Record<string, boolean> = { ...prev };
          for (const a of accounts) {
            const ccy = String(a?.currencyCode || "").toUpperCase().trim();
            if (ccy) next[ccy] = true;
          }
          return next;
        });

        const res = await getUserProfile(phone);
        if (res.success && res.user) {
          setKycStatus(res.user.kycStatus);
          const firstName = res.user.firstName || res.user.first_name || "";
          if (firstName) setUserName(String(firstName).trim());
          if (res.user.homeCurrency) {
            userHomeCurrency = res.user.homeCurrency;
            setHomeCurrency(res.user.homeCurrency);
            setHomeCurrencySymbol(res.user.homeCurrencySymbol || res.user.homeCurrency);
          }
        }
        const accountsRes = await getUserAccounts(phone, true);
        if (accountsRes.success && accountsRes.accounts) {
          userAccounts = accountsRes.accounts;
          const localLedgerAccounts = userAccounts.filter((a: any) => {
            const code = (a.currencyCode || "").toUpperCase();
            return (
              Boolean(a.isExotic || a.is_exotic || a.currency?.isExotic || a.currency?.is_exotic) ||
              KNOWN_EXOTIC_CURRENCIES.includes(code)
            );
          });
          if (localLedgerAccounts.length > 0) {
            try {
              const results = await Promise.all(
                localLedgerAccounts.map(async (a) => {
                  const ccy = (a.currencyCode || "").toUpperCase();
                  const res = await getLocalBalance(phone, ccy);
                  return { ccy, res };
                }),
              );
              const balanceByCurrency = new Map<string, number>();
              for (const { ccy, res } of results) {
                if (res?.success) balanceByCurrency.set(ccy, Number(res.balance || 0));
              }
              userAccounts = userAccounts.map((a) => {
                const ccy = (a.currencyCode || "").toUpperCase();
                if (balanceByCurrency.has(ccy)) return { ...a, balance: balanceByCurrency.get(ccy)!, isExotic: true };
                return a;
              });
            } catch {}
          }
          // ✅ Only update if we got valid data - prevents flickering
          if (userAccounts.length > 0) {
            setAccounts(userAccounts);
            saveCachedAccounts(userAccounts);

            // ✅ Skeleton behavior:
            // - If we got a fresh API response, hide skeleton only for currencies with valid numbers.
            // - If we fell back to cache, keep skeleton visible (so users don't see stale/placeholder values).
            if (accountsRes.source === "api") {
              setBalanceLoadingByCurrency((prev) => {
                const next: Record<string, boolean> = { ...prev };
                for (const a of userAccounts) {
                  const ccy = String(a?.currencyCode || "").toUpperCase().trim();
                  if (!ccy) continue;
                  const bal = (a as any).balance;
                  next[ccy] = !(typeof bal === "number" && Number.isFinite(bal));
                }
                return next;
              });
            }
          }
        }
        try {
          const totalRes = await getTotalBalance(phone);
          if (totalRes.success) {
            const newTotal = typeof totalRes.totalBalance === "number" && Number.isFinite(totalRes.totalBalance)
              ? totalRes.totalBalance
              : null;
            const newCurrency = totalRes.homeCurrency || homeCurrency;
            const newSymbol = totalRes.homeCurrencySymbol || totalRes.homeCurrency || homeCurrencySymbol;
            if (newTotal !== null) setTotalBalance(newTotal);
            if (totalRes.homeCurrency) {
              setHomeCurrency(newCurrency);
              setHomeCurrencySymbol(newSymbol);
            }
            // ✅ Cache for next load (only if real value or explicitly not cached)
            if (newTotal !== null && (newTotal > 0 || !totalRes.cached)) {
              saveCachedTotalBalance(newTotal, newCurrency, newSymbol);
            }
            console.log(`[HomeScreen] Total: ${newTotal ?? "(unknown)"} ${newCurrency} (cached: ${totalRes.cached})`);
          }
        } catch (e) {
          console.log("Failed to fetch total:", e);
        }
      }
      setRatesLoading(true);
      try {
        const currencyCodes = userAccounts.map((a) => (a.currencyCode || "").toUpperCase()).filter(Boolean);
        if (userHomeCurrency && !currencyCodes.includes(userHomeCurrency)) currencyCodes.push(userHomeCurrency);
        const pairs: string[] = [];
        for (const from of currencyCodes) for (const to of currencyCodes) if (from !== to) pairs.push(`${from}_${to}`);
        if (pairs.length > 0) {
          const ratesRes = await getExchangeRates(pairs.join(","));
          if (ratesRes.success && ratesRes.rates) {
            // Load cached rate changes first
            let cachedChanges: Record<string, { change: number; timestamp: number }> = {};
            try {
              const cached = await AsyncStorage.getItem(CACHED_RATE_CHANGES_KEY);
              if (cached) cachedChanges = JSON.parse(cached);
            } catch {}

            const ratesList = ratesRes.rates.map((r: any) => {
              const from = (r.fromCurrency || r.buy_currency || "").toUpperCase();
              const to = (r.toCurrency || r.sell_currency || "").toUpperCase();
              const numericRate = parseFloat(r.rate || r.core_rate || 0);
              const pairKey = `${from}_${to}`;
              
              // Check cached change
              const cachedEntry = cachedChanges[pairKey];
              let changeStr = "+0.0%";
              if (cachedEntry && Date.now() - cachedEntry.timestamp < RATE_CHANGES_TTL_MS) {
                const sign = cachedEntry.change >= 0 ? "+" : "";
                changeStr = `${sign}${cachedEntry.change.toFixed(2)}%`;
              }
              if (r.change) {
                changeStr = r.change;
              } else if (r.changePercent != null) {
                changeStr = r.changePercent >= 0 ? `+${r.changePercent}%` : `${r.changePercent}%`;
              } else {
                // Fallback: deterministic simulated change if backend doesn't provide
                const seed = (from.charCodeAt(0) + to.charCodeAt(0) + new Date().getDate()) % 100;
                const changePercent = ((seed - 50) / 50) * 1.5;
                changeStr = changePercent >= 0 ? `+${changePercent.toFixed(1)}%` : `${changePercent.toFixed(1)}%`;
              }
              return {
                from,
                to,
                fromFlag: flagsMap[from] || "",
                toFlag: flagsMap[to] || "",
                rate: numericRate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 }),
                change: changeStr,
                numericRate,
              };
            });
            setDisplayRates(ratesList);

            // Fetch real historical data for rate changes in background
            fetchRateChangesForPairs(ratesList, cachedChanges, setDisplayRates);
          }
        }
      } catch {
      } finally {
        setRatesLoading(false);
      }
    } catch (e) {
      console.log("Error fetching user data:", e);
    } finally {
      isFetchingRef.current = false;
      hasLoadedOnceRef.current = true;
      setLoading(false);
      setRefreshing(false);
    }
  }, [homeCurrency, homeCurrencySymbol]);

  useEffect(() => {
    onSettlementConfirmedRef.current = () => {
      console.log("[HomeScreen] Settlements confirmed");
      fetchUserData();
    };
  }, [fetchUserData]);
  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedOnceRef.current && accounts.length === 0) setLoading(true);
      fetchUserData(false);
      (async () => {
        setRecentRecipients(await getRecentRecipients());
      })();
      refreshPendingSettlements();
    }, [fetchUserData, refreshPendingSettlements, accounts.length]),
  );
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserData(true);
    (async () => {
      setRecentRecipients(await getRecentRecipients());
    })();
    refreshPendingSettlements();
  }, [fetchUserData, refreshPendingSettlements]);

  const handleVerifyEmail = async () => {
    try {
      await sendEmailOtp(email);
      router.push(`/checkemail?email=${encodeURIComponent(email)}`);
    } catch {
      Alert.alert("Error", "Could not send verification email");
    }
  };
  const handleVerifyIdentity = async () => {
    setSaving(true);
    
    try {
      const phone = await AsyncStorage.getItem("user_phone");
      if (!phone) {
        Alert.alert("Error", "Phone number not found.");
        setSaving(false);
        return;
      }

      // Backend fetches user data and creates Persona Inquiry session
      const result = await createPlaidIdvSession({ phone }); // Uses Persona under the hood
      
      if (!result.success) {
        Alert.alert("Error", result.message || "Could not start verification");
        setSaving(false);
        return;
      }

      console.log("Inquiry ID:", result.idv_session_id);
      console.log("Verification URL:", result.shareable_url);

      // Check if we got a valid verification URL
      if (!result.shareable_url) {
        console.log("Persona create session result:", result);
        Alert.alert(
          "Error",
          result.message || "Could not get verification URL. Please try again later."
        );
        setSaving(false);
        return;
      }

      // Navigate to the Persona verification WebView screen
      router.push({
        pathname: "/personaverification",
        params: {
          url: result.shareable_url,
          inquiryId: result.idv_session_id || "",
        },
      });
      
    } catch (error) {
      Alert.alert("Error", "Could not start identity verification");
    } finally {
      setSaving(false);
    }
  };

  const isKycApproved = kycStatus === "verified";
  const handleBlockedAction = () => {
    Alert.alert("Verify Your Email and Identity", "Your account verification is pending.");
  };
  const getFlagForCurrency = (currencyCode?: string) => {
    const key = (currencyCode || "").toUpperCase();
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
      CAD: "🇨🇦",
      GBP: "🇬🇧",
      EUR: "🇪🇺",
      NGN: "🇳🇬",
      GHS: "🇬🇭",
      KES: "🇰🇪",
      RWF: "🇷🇼",
      UGX: "🇺🇬",
      TZS: "🇹🇿",
      ZMW: "🇿🇲",
      XOF: "🇸🇳",
      XAF: "🇨🇲",
      ZAR: "🇿🇦",
      EGP: "🇪🇬",
      MAD: "🇲🇦",
      AED: "🇦🇪",
      INR: "🇮🇳",
      JPY: "🇯🇵",
      CNY: "🇨🇳",
      NZD: "🇳🇿",
      CHF: "🇨🇭",
      SGD: "🇸🇬",
      HKD: "🇭🇰",
      MXN: "🇲🇽",
      BRL: "🇧🇷",
    };
    const byCurrency = flagsByCurrency[key];
    if (byCurrency) return byCurrency;
    const countryKey = currencyToCountry[key];
    const byCountry = countryKey ? flagsByCurrency[countryKey] : "";
    if (byCountry) return byCountry;
    return fallbackEmoji[key] || "";
  };
  const isWalletDisabled = (a?: Pick<UserAccount, "status" | "currencyCode"> | null) => {
    const status = String(a?.status || "").toLowerCase();
    if (status === "disabled" || status === "inactive" || status === "in-active") return true;
    const code = (a?.currencyCode || "").toUpperCase();
    return !!(code && disabledCurrencies[code]);
  };
  const visibleRates = useMemo(() => {
    const walletCurrencies = accounts.map((a) => (a.currencyCode || "").toUpperCase());
    const filtered = displayRates.filter((r) => walletCurrencies.includes(r.from) && walletCurrencies.includes(r.to));
    return filtered
      .sort((a, b) => {
        const aFromIndex = walletCurrencies.indexOf(a.from);
        const bFromIndex = walletCurrencies.indexOf(b.from);
        if (aFromIndex !== bFromIndex) return aFromIndex - bFromIndex;
        return walletCurrencies.indexOf(a.to) - walletCurrencies.indexOf(b.to);
      })
      .slice(0, 4);
  }, [displayRates, accounts]);
  const selectedRateObj = useMemo(() => (visibleRates.length > 0 ? visibleRates[0] : null), [visibleRates]);
  useEffect(() => {
    if (!selectedRateObj?.numericRate) {
      setHistoricalPoints([]);
      setChartChangePercent(0);
      return;
    }
    setChartLoading(true);
    const pts = generateMockHistory(selectedRateObj.numericRate, selectedRange);
    setHistoricalPoints(pts);
    const first = pts[0]?.rate || selectedRateObj.numericRate;
    const last = pts[pts.length - 1]?.rate || selectedRateObj.numericRate;
    setChartChangePercent(first > 0 ? ((last - first) / first) * 100 : 0);
    const t = setTimeout(() => setChartLoading(false), 250);
    return () => clearTimeout(t);
  }, [selectedRateObj?.numericRate, selectedRange]);
  const onFxChartLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 0 && w !== fxChartWidth) setFxChartWidth(w);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScreenShell padded={false}>
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
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
                  Your account is awaiting admin approval.
                </Text>
              </View>
            </View>
          )}
          <View style={styles.topBar}>
            <Pressable style={styles.avatarCircle} onPress={() => router.push("/profile")}>
              <Text style={{ fontSize: 16 }}>👤</Text>
            </Pressable>
            <View style={{ marginLeft: 12 }}>
              {userName ? (
                <Text style={{ fontWeight: "600", fontSize: 14, color: "#222", marginBottom: 2 }}>{userName}</Text>
              ) : null}
              {loading && accounts.length === 0 ? (
                <TotalBalanceSkeleton />
              ) : ratesLoading && accounts.length > 0 ? (
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
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>My accounts</Text>
            <View style={{ flex: 1 }} />
            <Pressable style={styles.hideBalanceRow} onPress={toggleHideBalance}>
              <Text style={styles.hideBalanceText}>{hideBalance ? "Show balance" : "Hide balance"}</Text>
              <Text style={{ marginLeft: 6 }}>{hideBalance ? "🙈" : "👁️"}</Text>
            </Pressable>
          </View>
          {loading && accounts.length === 0 ? (
            <AccountsListSkeleton />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountsRow}>
              {accounts.length === 0 ? (
                <View style={{ padding: 20, alignItems: "center", width: "100%" }}>
                  <Text style={{ color: "#888", fontSize: 14 }}>No accounts yet. Tap "Add account" to create one.</Text>
                </View>
              ) : (
                accounts.map((a) => {
                  const walletDisabled = isWalletDisabled(a);
                  return (
                    <Pressable
                      key={a.id}
                      onPress={() => {
                        if (walletDisabled) {
                          Alert.alert("Wallet Disabled", "This wallet has been disabled.");
                          return;
                        }
                        if (!isKycApproved) {
                          handleBlockedAction();
                          return;
                        }
                        router.push(
                          `/wallet?accountData=${encodeURIComponent(JSON.stringify({ id: a.id, currencyCode: a.currencyCode, accountName: a.accountName, iban: a.iban, bicSwift: a.bicSwift, status: a.status, balance: a.balance, flag: getFlagForCurrency(a.currencyCode), currencyName: a.currency?.name || a.currencyCode }))}`,
                        );
                      }}
                      style={{ marginRight: 12, opacity: walletDisabled ? 0.6 : 1 }}
                    >
                      <LinearGradient
                        colors={a.currencyCode === "CAD" ? ["#3c3b3bff", "#3c3b3b"] : ["#19955f", "#19955f"]}
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
                            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>DISABLED</Text>
                          </View>
                        ) : hasPendingForCurrency(a.currencyCode) ? (
                          <View style={{ position: "absolute", top: 10, right: 10 }}>
                            <PendingBadge visible={true} label="Settling" size="small" />
                          </View>
                        ) : null}
                        <View style={styles.accountHeader}>
                          <Text style={[styles.flag, { color: "#fff" }]}>{getFlagForCurrency(a.currencyCode)}</Text>
                          <Text style={styles.accountLabelWhite}>{a.currencyCode}</Text>
                        </View>
                        {(!hideBalance && balanceLoadingByCurrency[String(a.currencyCode || "").toUpperCase().trim()] === true) ? (
                          <SkeletonPulse style={{ width: 120, height: 24, backgroundColor: "rgba(255,255,255,0.35)", borderRadius: 10, marginTop: 6 }} />
                        ) : (
                          <Text style={styles.accountAmountWhite}>
                            {formatBalance(
                              hasPendingForCurrency(a.currencyCode)
                                ? (typeof a.balance === "number" && Number.isFinite(a.balance) ? getOptimisticBalance(a.balance, a.currencyCode) : null)
                                : a.balance,
                            )}
                          </Text>
                        )}
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
          )}
          <View style={styles.actionsRow}>
            <PrimaryButton
              title="Transfer Now"
              onPress={() => (isKycApproved ? router.push("/sendmoney") : handleBlockedAction())}
              style={{ flex: 1 }}
            />
            <OutlineButton
              title="+ Add Money"
              onPress={() => (isKycApproved ? setSheetOpen(true) : handleBlockedAction())}
              style={{ flex: 1, marginLeft: 12 }}
            />
          </View>
          {/* 1️⃣ Email NOT verified → show VerifyEmailCard */}
          {!emailVerified && (
            <VerifyEmailCard
              email={email}
              onPress={handleVerifyEmail}
            />
          )}

          {/* 2️⃣ Email verified AND KYC pending → show VerifyIdentityCard */}
          {emailVerified && kycStatus === "pending" && (
            <VerifyIdentityCardScreen
              userPhone={userPhone}
              onPress={handleVerifyIdentity}
            />
          )}

          <Text style={[styles.sectionTitle, { marginTop: 18, paddingHorizontal: 16 }]}>Recent Recipients</Text>
          <View style={styles.recentRow}>
            {recentRecipients.map((r, idx) => (
              <Pressable
                key={`${r.destCurrency}-${r.bankCode}-${r.accountNumber}-${idx}`}
                style={styles.recentCard}
                onPress={() => {
                  if (!isKycApproved) return handleBlockedAction();
                  router.push({
                    pathname: "/sendmoney" as any,
                    params: { recipient: JSON.stringify(r), mode: "recent" },
                  } as any);
                }}
              >
                <View style={styles.recentAvatarWrap}>
                  <View style={styles.recentAvatar}>
                    <Text style={{ fontWeight: "800", color: "#323232ff" }}>{getInitials(r.accountName)}</Text>
                  </View>
                  <View style={styles.smallFlag}>
                    <Text>{r.destCurrency === "NGN" ? "🇳🇬" : "🇨🇦"}</Text>
                  </View>
                </View>
                <Text style={styles.recentName} numberOfLines={1}>
                  {r.accountName}
                </Text>
                {!!r.bankName && (
                  <Text style={styles.recentBank} numberOfLines={2}>
                    {r.bankName}
                  </Text>
                )}
              </Pressable>
            ))}
            {recentRecipients.length === 0 && (
              <Text style={{ color: "#9CA3AF", paddingHorizontal: 16, marginTop: 8 }}>No recent recipients yet</Text>
            )}
          </View>
          <Text style={[styles.sectionTitle, { marginTop: 18, paddingHorizontal: 16, marginBottom: 8 }]}>
            Exchange Rates
          </Text>
          <View style={styles.fxCard}>
            <View style={styles.fxHeader}>
            <View>
                <Text style={styles.fxTitle}>Live exchange rates</Text>
                <Text style={styles.fxSubtitle}>Mid-market • updates frequently</Text>
            </View>
            <Pressable onPress={() => router.push("/exchangerates")}>
                <Text style={styles.fxSeeAll}>See all</Text>
            </Pressable>
            </View>
            <View style={styles.fxDivider} />
            {ratesLoading ? (
            <ExchangeRatesSkeleton />
            ) : visibleRates.length === 0 ? (
            <View style={{ padding: 20, alignItems: "center" }}>
                <Text style={{ color: "#888", fontSize: 14, textAlign: "center" }}>
                Add at least two currency accounts to see rates.
                </Text>
            </View>
            ) : (
            visibleRates.map((x, idx) => {
                const isPositive = String(x.change).trim().startsWith("+");
                return (
                <Pressable
                    key={`${x.from}-${x.to}-${idx}`}
                    style={[styles.fxRow, idx === visibleRates.length - 1 ? { paddingBottom: 14 } : null]}
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
            <View style={{ paddingHorizontal: 16, paddingBottom: 14 }} onLayout={onFxChartLayout}>
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
                            All rates shown are <Text style={styles.midMarketStrong}>mid-market rates</Text>. These
                            represent the midpoint between buy and sell prices.
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
          </View>
        </ScrollView>
      </ScreenShell>
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <Text style={styles.sheetTitle}>Add money to</Text>
        {accounts.length === 0 ? (
          <Text style={{ textAlign: "center", color: "#888", padding: 20 }}>No accounts available.</Text>
        ) : (
          accounts.map((a) => {
            const walletDisabled = isWalletDisabled(a);
            return (
              <Pressable
                key={a.id}
                style={[styles.sheetRow, { opacity: walletDisabled ? 0.6 : 1 }]}
                onPress={() => {
                  if (walletDisabled) {
                    Alert.alert("Wallet Disabled", "This wallet has been disabled.");
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
