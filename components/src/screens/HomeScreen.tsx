import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  RefreshControl,
  Image,
  ActivityIndicator,
  LayoutChangeEvent,
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
} from "@/api/config";
import { getLocalBalance } from "../../../api/flutterwave";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Circle } from "react-native-svg";
import { usePendingSettlements } from "../../../hooks/usePendingSettlements";
import { PendingBadge } from "../../../components/PendingBadge";
import ConversionStatusBanner from "../../../components/ConversionStatusBanner";

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

type HistoricalPoint = {
  date: string;
  timestamp: number;
  rate: number;
};

type RangeKey = "1D" | "5D" | "1M" | "1Y" | "5Y" | "MAX";

/** --- Recipient types (for Recents) --- **/
type SavedRecipient = {
  id: string;
  accountName: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  createdAt: number;
};

type RecentRecipient = SavedRecipient & {
  destCurrency: "NGN" | "CAD";
  lastSentAt: number;
};

const HIDE_BALANCE_KEY = "hide_balance_preference";
const RECENT_RECIPIENTS_KEY = "recent_recipients_v1";

// ✅ Local cache keys (prevents 0.00 flicker)
const CACHED_ACCOUNTS_KEY = "cached_accounts_v1";
const ASYNC_TOTAL_BALANCE_KEY = "Async_total_Balance";

// Known exotic currencies - fallback if backend doesn't return isExotic flag
const KNOWN_EXOTIC_CURRENCIES = ["NGN", "GHS", "RWF", "UGX", "TZS", "ZMW", "XOF", "XAF"];

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
    if (chartW <= 0 || historicalPoints.length < 2) {
      return { linePath: "", fillPath: "", lastPoint: { x: 0, y: 0 } };
    }

    const padX = 14;
    const padTop = 14;
    const padBottom = 26;

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
  }, [chartW, historicalPoints]);

  return (
    <View style={{ marginTop: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 2 }}>
        {ranges.map((r) => {
          const active = r === range;
          return (
            <Pressable
              key={r}
              onPress={() => onRangeChange(r)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: active ? "rgba(25,149,95,0.10)" : "transparent",
              }}
            >
              <Text style={{ fontWeight: "800", color: active ? "#19955f" : "#6b7280", fontSize: 12 }}>
                {r}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
        <View>
          <Text style={{ color: "#6b7280", fontSize: 12, fontWeight: "700" }}>{pairLabel}</Text>
          <Text style={{ color: "#111827", fontSize: 16, fontWeight: "900", marginTop: 2 }}>
            {Number(baseRate || 0).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6,
            })}
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

/** ---------- Local mock historical generator (no new API needed) ---------- **/
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

    out.push({
      date: new Date(t).toISOString(),
      timestamp: t,
      rate: value,
    });
  }
  return out;
}

/** ---------- Recent recipients helpers ---------- **/
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

function getInitials(name: string) {
  return (name || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** ---------- Safe helpers ---------- **/
function safeNumber(v: any, fallback = 0) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeCcy(ccy: any) {
  return String(ccy || "").toUpperCase().trim();
}

function mergeAccountsKeepGoodBalances(prev: UserAccount[], incoming: UserAccount[]) {
  const prevByCcy = new Map<string, UserAccount>();
  for (const p of prev) prevByCcy.set(normalizeCcy(p.currencyCode), p);

  return incoming.map((a) => {
    const ccy = normalizeCcy(a.currencyCode);
    const prevA = prevByCcy.get(ccy);

    const nextBal = typeof a.balance === "number" ? a.balance : null;
    const prevBal = typeof prevA?.balance === "number" ? prevA.balance : null;

    // ✅ If API gives null/undefined, keep previous numeric balance
    if ((nextBal === null || nextBal === undefined) && prevBal !== null) {
      return { ...a, balance: prevBal };
    }

    // ✅ If API temporarily gives 0 but previous was >0, keep previous (prevents “0.00 flash”)
    // (We still allow real 0 if prev is also 0 / null)
    if (typeof nextBal === "number" && nextBal === 0 && typeof prevBal === "number" && prevBal > 0) {
      return { ...a, balance: prevBal };
    }

    return a;
  });
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

  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [flagsByCurrency, setFlagsByCurrency] = useState<Record<string, string>>({});
  const [disabledCurrencies, setDisabledCurrencies] = useState<Record<string, true>>({});
  const [displayRates, setDisplayRates] = useState<DisplayRate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(true);

  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [asyncTotalBalance, setAsyncTotalBalance] = useState<number>(0);
  const [homeCurrency, setHomeCurrency] = useState<string>("");
  const [homeCurrencySymbol, setHomeCurrencySymbol] = useState<string>("");

  // Track request version to prevent stale updates from race conditions
  const fetchVersionRef = React.useRef(0);
  // Track if a fetch is in progress to prevent overlapping requests
  const isFetchingRef = React.useRef(false);
  const [totalBalanceLoading, setTotalBalanceLoading] = useState(true);

  const [hideBalance, setHideBalance] = useState(false);

  /** ---- Recent recipients state ---- **/
  const [recentRecipients, setRecentRecipients] = useState<RecentRecipient[]>([]);

  /** ---- Live chart state ---- **/
  const [selectedRange, setSelectedRange] = useState<RangeKey>("1M");
  const [fxChartWidth, setFxChartWidth] = useState(0);
  const [historicalPoints, setHistoricalPoints] = useState<HistoricalPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartChangePercent, setChartChangePercent] = useState(0);
  const [emailVerified, setEmailVerified] = useState(false);

  /** ---- Pending settlements (hybrid balance) ---- **/
  const {
    settlements: pendingSettlements,
    hasPendingForCurrency,
    getOptimisticBalance,
    refresh: refreshPendingSettlements,
    checkAndClearIfSettled,
    removeSettlement,
  } = usePendingSettlements();

  // Clear pending settlements once API returns *settled* balances.
  const clearSettledConversions = useCallback(
    async (freshAccounts: UserAccount[]) => {
      if (pendingSettlements.length === 0) return;

      for (const settlement of pendingSettlements) {
        const sellCcy = normalizeCcy(settlement.sellCurrency);
        const buyCcy = normalizeCcy(settlement.buyCurrency);

        const sellAccount = freshAccounts.find((a) => normalizeCcy(a.currencyCode) === sellCcy);
        const buyAccount = freshAccounts.find((a) => normalizeCcy(a.currencyCode) === buyCcy);

        const sellNeedsConfirm = safeNumber(settlement.sellAmount, 0) !== 0;
        const buyNeedsConfirm = safeNumber(settlement.buyAmount, 0) !== 0;

        const sellBaselineOk = typeof settlement.sellBalanceBefore === "number";
        const buyBaselineOk = typeof settlement.buyBalanceBefore === "number";

        const sellSettled = !sellNeedsConfirm
          ? true
          : sellAccount && sellBaselineOk
          ? await checkAndClearIfSettled(
              sellCcy,
              safeNumber(sellAccount.balance, 0),
              safeNumber(settlement.sellBalanceBefore, 0) - safeNumber(settlement.sellAmount, 0),
              0.01
            )
          : false;

        const buySettled = !buyNeedsConfirm
          ? true
          : buyAccount && buyBaselineOk
          ? await checkAndClearIfSettled(
              buyCcy,
              safeNumber(buyAccount.balance, 0),
              safeNumber(settlement.buyBalanceBefore, 0) + safeNumber(settlement.buyAmount, 0),
              0.01
            )
          : false;

        if (sellSettled && buySettled) {
          await removeSettlement(settlement.id, true);
        }
      }
    },
    [pendingSettlements, checkAndClearIfSettled, removeSettlement]
  );

  // ✅ Load cached balances first (prevents 0.00 flash)
  useEffect(() => {
    const bootstrapFromCache = async () => {
      try {
        const [rawAcc, rawTotal] = await Promise.all([
          AsyncStorage.getItem(CACHED_ACCOUNTS_KEY),
          AsyncStorage.getItem(ASYNC_TOTAL_BALANCE_KEY),
        ]);

        if (rawAcc) {
          const cached = JSON.parse(rawAcc);
          if (Array.isArray(cached)) setAccounts(cached);
        }

        const n = rawTotal ? Number(rawTotal) : 0;
        const safe = Number.isFinite(n) ? n : 0;
        setAsyncTotalBalance(safe);
        // show cached immediately (but do not mark “loading false” yet)
        if (safe > 0) setTotalBalance(safe);
      } catch {
        // ignore
      }
    };

    bootstrapFromCache();

    const loadPrefs = async () => {
      try {
        const fetchedEmailVerified = await AsyncStorage.getItem("email_verified");
        setEmailVerified(fetchedEmailVerified?.toString() === "true");

        const stored = await AsyncStorage.getItem(HIDE_BALANCE_KEY);
        if (stored !== null) setHideBalance(stored === "true");
      } catch (e) {
        console.log("Failed to load prefs:", e);
      }
    };

    loadPrefs();
  }, []);

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
      if (balance === null || balance === undefined) return "—";
      return balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    [hideBalance]
  );

  const fetchUserData = useCallback(async () => {
    if (isFetchingRef.current) {
      console.log("[HomeScreen] Skipping fetch - already in progress");
      return;
    }
    isFetchingRef.current = true;

    const currentVersion = ++fetchVersionRef.current;

    // ✅ mark loading states BEFORE network (not after)
    setTotalBalanceLoading(true);
    if (accounts.length === 0) setLoading(true);

    try {
      // refresh pending settlement state first (cheap)
      await refreshPendingSettlements();
      if (currentVersion !== fetchVersionRef.current) return;

      const [phone, storedUser] = await Promise.all([
        AsyncStorage.getItem("user_phone"),
        AsyncStorage.getItem("user_info"),
      ]);

      if (storedUser) {
        try {
          const userInfo = JSON.parse(storedUser);
          setEmail(userInfo.email);
          const firstName = userInfo.firstName || userInfo.first_name || "";
          setUserName(String(firstName).trim());
        } catch {}
      }

      if (!phone) {
        setRatesLoading(false);
        return;
      }

      const [countriesResult, profileResult, accountsResult, totalResult] = await Promise.allSettled([
        getCountries(),
        getUserProfile(phone),
        getUserAccounts(phone, true),
        getTotalBalance(phone),
      ]);

      if (currentVersion !== fetchVersionRef.current) return;

      // -------- Countries / flags --------
      let flagsMap: Record<string, string> = {};
      let disabledMap: Record<string, true> = {};

      if (countriesResult.status === "fulfilled") {
        const countriesData = countriesResult.value;
        for (const c of countriesData || []) {
          const flag = String((c as any)?.flag || "").trim();
          const currencyKey = normalizeCcy((c as any).currencyCode || (c as any).currency_code);
          if (currencyKey && flag && !flagsMap[currencyKey]) flagsMap[currencyKey] = flag;
          if (currencyKey && (c as any).currencyEnabled === false) disabledMap[currencyKey] = true;

          const codeKey = normalizeCcy((c as any).code);
          if (codeKey && flag && !flagsMap[codeKey]) flagsMap[codeKey] = flag;
          if (codeKey && (c as any).currencyEnabled === false) disabledMap[codeKey] = true;
        }
        setFlagsByCurrency(flagsMap);
        setDisabledCurrencies(disabledMap);
      }

      // -------- Profile --------
      let userHomeCurrency = "";
      if (profileResult.status === "fulfilled") {
        const res = profileResult.value as any;
        if (res?.success && res?.user) {
          setKycStatus(res.user.kycStatus);
          const firstName = res.user.firstName || res.user.first_name || "";
          if (firstName) setUserName(String(firstName).trim());
          if (res.user.homeCurrency) {
            userHomeCurrency = res.user.homeCurrency;
            setHomeCurrency(res.user.homeCurrency);
            setHomeCurrencySymbol(res.user.homeCurrencySymbol || res.user.homeCurrency);
          }
        }
      }

      // -------- Total balance (NEVER overwrite with transient 0) --------
      if (totalResult.status === "fulfilled") {
        const totalRes: any = totalResult.value;

        if (totalRes?.success) {
          const nextTotal = safeNumber(totalRes.totalBalance, NaN);
          const prevTotal = safeNumber(totalBalance, 0);

          // accept if finite and:
          // - >0, or
          // - prev is 0, or
          // - accounts empty (user might really have 0)
          const accept =
            Number.isFinite(nextTotal) &&
            (nextTotal > 0 || prevTotal === 0 || accounts.length === 0);

          if (accept) {
            setTotalBalance(nextTotal);
            setAsyncTotalBalance(nextTotal);
            await AsyncStorage.setItem(ASYNC_TOTAL_BALANCE_KEY, String(nextTotal));
          } else {
            // keep previous value (prevents flicker)
            setTotalBalance(prevTotal);
          }

          if (totalRes.homeCurrency) {
            setHomeCurrency(totalRes.homeCurrency);
            setHomeCurrencySymbol(totalRes.homeCurrencySymbol || totalRes.homeCurrency);
          }
        }
      }

      // -------- Accounts --------
      let userAccounts: UserAccount[] = [];
      if (accountsResult.status === "fulfilled") {
        const accountsRes: any = accountsResult.value;
        if (accountsRes?.success && Array.isArray(accountsRes.accounts)) {
          userAccounts = accountsRes.accounts as UserAccount[];

          // Exotic currencies: fetch local ledger balances
          const localLedgerAccounts = userAccounts.filter((a: any) => {
            const code = normalizeCcy(a.currencyCode || a.currency_code);
            const backendExotic = Boolean(a.isExotic || a.is_exotic || a.currency?.isExotic || a.currency?.is_exotic);
            const knownExotic = KNOWN_EXOTIC_CURRENCIES.includes(code);
            return backendExotic || knownExotic;
          });

          if (localLedgerAccounts.length > 0) {
            try {
              const results = await Promise.all(
                localLedgerAccounts.map(async (a) => {
                  const ccy = normalizeCcy(a.currencyCode);
                  const res = await getLocalBalance(phone, ccy);
                  return { ccy, res };
                })
              );

              if (currentVersion !== fetchVersionRef.current) return;

              const balanceByCurrency = new Map<string, number>();
              for (const { ccy, res } of results) {
                if (res?.success) balanceByCurrency.set(ccy, safeNumber(res.balance, 0));
              }

              userAccounts = userAccounts.map((a) => {
                const ccy = normalizeCcy(a.currencyCode);
                if (balanceByCurrency.has(ccy)) return { ...a, balance: balanceByCurrency.get(ccy)!, isExotic: true };
                return a;
              });
            } catch (e) {
              console.log("Failed to fetch local ledger balances:", e);
            }
          }

          // ✅ merge to keep previous good balances
          setAccounts((prev) => {
            const merged = mergeAccountsKeepGoodBalances(prev, userAccounts);
            // ✅ persist cache so coming back never flashes 0.00
            AsyncStorage.setItem(CACHED_ACCOUNTS_KEY, JSON.stringify(merged)).catch(() => {});
            return merged;
          });

          // Clear pending settlements that have now settled
          await clearSettledConversions(userAccounts);
        } else {
          // keep current accounts (don’t wipe)
          console.log("[HomeScreen] Accounts fetch failed:", accountsRes?.error || accountsRes);
        }
      } else {
        // keep current accounts (don’t wipe)
        console.log("[HomeScreen] Accounts fetch failed:", accountsResult);
      }

      // -------- Exchange rates --------
      if (currentVersion !== fetchVersionRef.current) return;
      setRatesLoading(true);

      try {
        const currencyCodes = (userAccounts.length ? userAccounts : accounts)
          .map((a) => normalizeCcy(a.currencyCode))
          .filter(Boolean);

        if (userHomeCurrency && !currencyCodes.includes(userHomeCurrency)) currencyCodes.push(userHomeCurrency);

        const pairs: string[] = [];
        for (const from of currencyCodes) {
          for (const to of currencyCodes) {
            if (from !== to) pairs.push(`${from}_${to}`);
          }
        }

        if (pairs.length > 0) {
          const ratesRes: any = await getExchangeRates(pairs.join(","));
          if (currentVersion !== fetchVersionRef.current) return;

          if (ratesRes?.success && Array.isArray(ratesRes.rates)) {
            const formatted: DisplayRate[] = ratesRes.rates.map((r: any) => {
              const from = normalizeCcy(r.fromCurrency || r.buy_currency);
              const to = normalizeCcy(r.toCurrency || r.sell_currency);
              const numericRate = safeNumber(r.rate || r.core_rate, 0);

              return {
                from,
                to,
                fromFlag: flagsMap[from] || "",
                toFlag: flagsMap[to] || "",
                rate: numericRate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 }),
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
      isFetchingRef.current = false;
      if (currentVersion === fetchVersionRef.current) {
        setLoading(false);
        setRefreshing(false);
        setTotalBalanceLoading(false);
      }
    }
  }, [accounts.length, accounts, clearSettledConversions, refreshPendingSettlements, totalBalance]);

  // Auto-refresh interval in milliseconds
  const AUTO_REFRESH_INTERVAL_MS = 300000;

  useFocusEffect(
    useCallback(() => {
      // Initial fetch on focus
      fetchUserData();

      // load recents on focus
      (async () => {
        const list = await getRecentRecipients();
        setRecentRecipients(list);
      })();

      // ✅ periodic refresh while focused
      const id = setInterval(() => {
        fetchUserData();
      }, AUTO_REFRESH_INTERVAL_MS);

      return () => clearInterval(id);
    }, [fetchUserData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserData();
    (async () => {
      const list = await getRecentRecipients();
      setRecentRecipients(list);
    })();
  }, [fetchUserData]);

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

      const result: any = await createPlaidIdvSession({ phone });

      if (!result.success) {
        Alert.alert("Error", result.message || "Could not start verification");
        setSaving(false);
        return;
      }

      console.log("Link token:", result.link_token);
      console.log("Shareable URL:", result.shareable_url);
    } catch (error) {
      Alert.alert("Error", "Could not start identity verification");
    } finally {
      setSaving(false);
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
    const key = normalizeCcy(currencyCode);

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

    const code = normalizeCcy(a?.currencyCode);
    return !!(code && disabledCurrencies[code]);
  };

  const visibleRates = useMemo(() => {
    const walletCurrencies = accounts.map((a) => normalizeCcy(a.currencyCode));

    const filtered = displayRates.filter((r) => walletCurrencies.includes(r.from) && walletCurrencies.includes(r.to));

    const sorted = filtered.sort((a, b) => {
      const aFromIndex = walletCurrencies.indexOf(a.from);
      const aToIndex = walletCurrencies.indexOf(a.to);
      const bFromIndex = walletCurrencies.indexOf(b.from);
      const bToIndex = walletCurrencies.indexOf(b.to);

      if (aFromIndex !== bFromIndex) return aFromIndex - bFromIndex;
      return aToIndex - bToIndex;
    });

    return sorted.slice(0, 4);
  }, [displayRates, accounts]);

  const selectedRateObj = useMemo(() => {
    return visibleRates.length > 0 ? visibleRates[0] : null;
  }, [visibleRates]);

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
    const changePct = first > 0 ? ((last - first) / first) * 100 : 0;
    setChartChangePercent(changePct);

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
                  Your account is awaiting admin approval. Some features are restricted.
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

              {totalBalanceLoading ? (
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

          {pendingSettlements.length > 0 && (
            <ConversionStatusBanner
              settlements={pendingSettlements}
              flagsByCurrency={flagsByCurrency}
              onDismiss={async (id) => {
                await removeSettlement(id);
              }}
            />
          )}

          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>My accounts</Text>
            <View style={{ flex: 1 }} />
            <Pressable style={styles.hideBalanceRow} onPress={toggleHideBalance}>
              <Text style={styles.hideBalanceText}>{hideBalance ? "Show balance" : "Hide balance"}</Text>
              <Text style={{ marginLeft: 6 }}>{hideBalance ? "🙈" : "👁️"}</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountsRow}>
            {accounts.length === 0 && !loading ? (
              <View style={{ padding: 20, alignItems: "center", width: "100%" }}>
                <Text style={{ color: "#888", fontSize: 14 }}>No accounts yet. Tap "Add account" to create one.</Text>
              </View>
            ) : (
              accounts.map((a) => {
                const walletDisabled = isWalletDisabled(a);
                const currencyCode = normalizeCcy(a.currencyCode);
                const hasPending = hasPendingForCurrency(currencyCode);

                const baseBalance = typeof a.balance === "number" ? a.balance : null;
                const displayBalance = baseBalance !== null ? getOptimisticBalance(baseBalance, currencyCode) : null;

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
                        balance: typeof a.balance === "number" ? a.balance : null,
                        flag: getFlagForCurrency(a.currencyCode),
                        currencyName: a.currency?.name || a.currencyCode,
                      });

                      router.push(`/wallet?accountData=${encodeURIComponent(accountData)}`);
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
                      ) : hasPending ? (
                        <View style={{ position: "absolute", top: 10, right: 10 }}>
                          <PendingBadge visible={true} label="Settling" size="small" variant="pill" />
                        </View>
                      ) : null}

                      <View style={styles.accountHeader}>
                        <Text style={[styles.flag, { color: "#fff" }]}>{getFlagForCurrency(a.currencyCode)}</Text>
                        <Text style={styles.accountLabelWhite}>{a.currencyCode}</Text>
                      </View>

                      <Text style={styles.accountAmountWhite}>{formatBalance(displayBalance)}</Text>

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
              onPress={() => (isKycApproved ? router.push("/sendmoney") : handleBlockedAction())}
              style={{ flex: 1 }}
            />
            <OutlineButton
              title={`+ Add Money`}
              onPress={() => (isKycApproved ? setSheetOpen(true) : handleBlockedAction())}
              style={{ flex: 1, marginLeft: 12 }}
            />
          </View>

          {kycStatus === "pending" && <VerifyEmailCard email={email} onPress={handleVerifyEmail} />}

          <Text style={[styles.sectionTitle, { marginTop: 18, paddingHorizontal: 16 }]}>Recent Recipients</Text>
          <View style={styles.recentRow}>
            {recentRecipients.map((r, idx) => {
              const initials = getInitials(r.accountName);
              const flag = r.destCurrency === "NGN" ? "🇳🇬" : "🇨🇦";

              return (
                <Pressable
                  key={`${r.destCurrency}-${r.bankCode}-${r.accountNumber}-${idx}`}
                  style={styles.recentCard}
                  onPress={() => {
                    if (!isKycApproved) return handleBlockedAction();

                    router.push({
                      pathname: "/sendmoney" as any,
                      params: {
                        recipient: JSON.stringify(r),
                        mode: "recent",
                      },
                    } as any);
                  }}
                >
                  <View style={styles.recentAvatarWrap}>
                    <View style={styles.recentAvatar}>
                      <Text style={{ fontWeight: "800", color: "#323232ff" }}>{initials}</Text>
                    </View>
                    <View style={styles.smallFlag}>
                      <Text>{flag}</Text>
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
              );
            })}

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
                            All rates shown are <Text style={styles.midMarketStrong}>mid-market rates</Text> (also known
                            as interbank rates). These represent the midpoint between buy and sell prices in the global
                            currency markets. Rates may differ slightly from Google or other sources which often display
                            retail rates with spreads.
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
          <Text style={{ textAlign: "center", color: "#888", padding: 20 }}>No accounts available. Create an account first.</Text>
        ) : (
          accounts.map((a) => {
            const walletDisabled = isWalletDisabled(a);

            return (
              <Pressable
                key={a.id}
                style={[styles.sheetRow, { opacity: walletDisabled ? 0.6 : 1 }]}
                onPress={() => {
                  if (walletDisabled) {
                    Alert.alert("Wallet Disabled", "This wallet has been disabled by an administrator.");
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
