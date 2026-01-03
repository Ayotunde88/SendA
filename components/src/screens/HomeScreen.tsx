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
import { sendEmailOtp, getUserProfile, getUserAccounts, getCountries, getExchangeRates } from "@/api/config";

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

const HIDE_BALANCE_KEY = "hide_balance_preference";

export default function HomeScreen() {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [flagsByCurrency, setFlagsByCurrency] = useState<Record<string, string>>({});
  const [displayRates, setDisplayRates] = useState<DisplayRate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(true);

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
      }

      // 1) Fetch countries/currencies from backend for flags
      let flagsMap: Record<string, string> = {};

      try {
        const countriesData: Country[] = await getCountries();
        for (const c of countriesData || []) {
          const key = (c.code || "").toUpperCase().trim();
          if (key) {
            flagsMap[key] = c.flag || "";
          }
        }
        setFlagsByCurrency(flagsMap);
      } catch (e) {
        console.log("Failed to load countries/flags:", e);
        setFlagsByCurrency({});
      }

      let userAccounts: UserAccount[] = [];
      let userHomeCurrency = "";

      if (phone) {
        // 2) Fetch latest profile (KYC + home currency from backend)
        const res = await getUserProfile(phone);
        if (res.success && res.user) {
          setKycStatus(res.user.kycStatus);

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
          setAccounts(userAccounts);
        } else {
          setAccounts([]);
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

  // Calculate total balance converted to home currency
  const totalBalance = useMemo(() => {
    if (!homeCurrency || accounts.length === 0) return 0;

    let total = 0;

    for (const account of accounts) {
      const balance = typeof account.balance === "number" ? account.balance : 0;
      const accountCurrency = (account.currencyCode || "").toUpperCase().trim();

      if (accountCurrency === homeCurrency) {
        total += balance;
      } else {
        const directRate = displayRates.find(
          (r) => r.from === accountCurrency && r.to === homeCurrency
        );

        if (directRate && directRate.numericRate > 0) {
          total += balance * directRate.numericRate;
        } else {
          const reverseRate = displayRates.find(
            (r) => r.from === homeCurrency && r.to === accountCurrency
          );

          if (reverseRate && reverseRate.numericRate > 0) {
            total += balance / reverseRate.numericRate;
          }
        }
      }
    }

    return total;
  }, [accounts, displayRates, homeCurrency]);

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
    return flagsByCurrency[key] || "";
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

            {/* Total Balance - Converted to Home Currency */}
            <View style={{ marginLeft: 12 }}>
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
              accounts.map((a) => (
                <Pressable
                  key={a.id}
                  onPress={() => {
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
                      a.currencyCode === "CAD"
                        ? ["#3c3b3bff", "#3c3b3b"]
                        : ["#19955f", "#19955f"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.accountCardGradient}
                  >
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
              ))
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

            <View style={styles.fxFooter}>
              <Text style={styles.fxFooterText}>Last updated: just now</Text>
            </View>
          </View>
        </ScrollView>
      </ScreenShell>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <Text style={styles.sheetTitle}>Add money to</Text>

        {accounts.length === 0 ? (
          <Text style={{ textAlign: "center", color: "#888", padding: 20 }}>
            No accounts available. Create an account first.
          </Text>
        ) : (
          accounts.map((a) => (
            <Pressable
              key={a.id}
              style={styles.sheetRow}
              onPress={() => {
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
          ))
        )}
      </BottomSheet>
    </SafeAreaView>
  );
}
