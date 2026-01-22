import {
    RateAlert,
    deleteRateAlert,
    getExchangeRates,
    getPublicCurrencies,
    getRateAlerts,
    updateRateAlert,
} from "@/api/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenShell from "../../../components/ScreenShell";
import { COLORS } from "../../../theme/colors";
import { styles } from "../../../theme/styles";
import CreateRateAlertSheet from "../../CreateRateAlertSheet";

// Fallback flags for common currencies (used only if backend doesn't provide)
const FALLBACK_FLAGS: Record<string, string> = {
  USD: "🇺🇸", CAD: "🇨🇦", GBP: "🇬🇧", EUR: "🇪🇺", NGN: "🇳🇬", GHS: "🇬🇭",
  KES: "🇰🇪", RWF: "🇷🇼", UGX: "🇺🇬", TZS: "🇹🇿", ZMW: "🇿🇲", XOF: "🇸🇳",
  XAF: "🇨🇲", ZAR: "🇿🇦", AED: "🇦🇪", INR: "🇮🇳", JPY: "🇯🇵", CNY: "🇨🇳",
  AUD: "🇦🇺", NZD: "🇳🇿", CHF: "🇨🇭", SGD: "🇸🇬", HKD: "🇭🇰", MXN: "🇲🇽", BRL: "🇧🇷",
};

type PublicCurrency = {
  code: string;
  name?: string;
  flag?: string;
  countryCode?: string;
  enabled?: boolean;
};

type CurrencyPair = {
  from: string;
  to: string;
  fromFlag: string;
  toFlag: string;
};

type LiveRate = {
  from: string;
  to: string;
  rate: number;
  change?: string;
};

type TabType = "active" | "history";

export default function RateAlertsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<RateAlert[]>([]);
  const [liveRates, setLiveRates] = useState<Map<string, LiveRate>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("active");
  
  // Dynamic currencies from backend
  const [currencies, setCurrencies] = useState<PublicCurrency[]>([]);
  const [currencyFlags, setCurrencyFlags] = useState<Record<string, string>>({});

  // Alert creation sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedPair, setSelectedPair] = useState<{
    from: string;
    to: string;
    fromFlag: string;
    toFlag: string;
    rate: number;
  } | null>(null);

  // Get flag for a currency code with fallback
  const getFlagForCurrency = useCallback(
    (code: string) => {
      const key = code.toUpperCase().trim();
      return currencyFlags[key] || FALLBACK_FLAGS[key] || "🏳️";
    },
    [currencyFlags]
  );

  // Load enabled currencies from backend
  const loadCurrencies = useCallback(async () => {
    try {
      const data = await getPublicCurrencies(false); // Only enabled currencies
      setCurrencies(data);
      
      // Build flags map
      const flagsMap: Record<string, string> = {};
      for (const c of data || []) {
        const code = (c.code || "").toUpperCase().trim();
        const flag = (c.flag || "").trim();
        if (code && flag) {
          flagsMap[code] = flag;
        }
      }
      setCurrencyFlags(flagsMap);
    } catch (e) {
      console.log("Failed to load currencies:", e);
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    try {
      const phone = await AsyncStorage.getItem("user_phone");
      if (!phone) return;

      const res = await getRateAlerts(phone);
      if (res.success) {
        setAlerts(res.alerts);
      }
    } catch (e) {
      console.log("Failed to load alerts:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadLiveRates = useCallback(async () => {
    try {
      const phone = await AsyncStorage.getItem("user_phone");
      if (!phone) return;
      const res = await getExchangeRates(phone);
      if (res.success && res.rates) {
        const rateMap = new Map<string, LiveRate>();
        res.rates.forEach((r: any) => {
          const key = `${r.from_currency || r.from}-${r.to_currency || r.to}`;
          rateMap.set(key, {
            from: r.from_currency || r.from,
            to: r.to_currency || r.to,
            rate: r.rate,
            change: r.change,
          });
        });
        setLiveRates(rateMap);
      }
    } catch (e) {
      console.log("Failed to load live rates:", e);
    }
  }, []);

  useEffect(() => {
    loadCurrencies();
    loadAlerts();
    loadLiveRates();
  }, [loadCurrencies, loadAlerts, loadLiveRates]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCurrencies();
    loadAlerts();
    loadLiveRates();
  }, [loadCurrencies, loadAlerts, loadLiveRates]);

  // Generate popular pairs from enabled currencies dynamically
  const popularPairs: CurrencyPair[] = useMemo(() => {
    if (currencies.length < 2) return [];
    
    const enabledCodes = currencies.map((c) => c.code.toUpperCase());
    const pairs: CurrencyPair[] = [];
    
    // Create pairs prioritizing common base currencies (USD, GBP, EUR)
    const priorityBases = ["USD", "GBP", "EUR", "CAD"];
    const targets = enabledCodes.filter((c) => !priorityBases.includes(c));
    
    // First: Priority base -> Other enabled currencies
    for (const base of priorityBases) {
      if (!enabledCodes.includes(base)) continue;
      for (const target of targets) {
        if (pairs.length >= 8) break;
        pairs.push({
          from: base,
          to: target,
          fromFlag: getFlagForCurrency(base),
          toFlag: getFlagForCurrency(target),
        });
      }
      if (pairs.length >= 8) break;
    }
    
    // Then: Pairs between priority bases
    for (let i = 0; i < priorityBases.length && pairs.length < 10; i++) {
      for (let j = i + 1; j < priorityBases.length && pairs.length < 10; j++) {
        const from = priorityBases[i];
        const to = priorityBases[j];
        if (enabledCodes.includes(from) && enabledCodes.includes(to)) {
          pairs.push({
            from,
            to,
            fromFlag: getFlagForCurrency(from),
            toFlag: getFlagForCurrency(to),
          });
        }
      }
    }
    
    return pairs.slice(0, 10); // Limit to 10 pairs
  }, [currencies, getFlagForCurrency]);

  const handleToggleAlert = async (alert: RateAlert) => {
    const res = await updateRateAlert(alert.id as any, { is_active: !alert.is_active });
    if (res.success) {
      setAlerts((prev) =>
        prev.map((a) => (a.id === alert.id ? { ...a, is_active: !a.is_active } : a))
      );
    }
  };

  const handleDeleteAlert = (alert: RateAlert) => {
    Alert.alert("Delete Alert", `Remove alert for ${alert.fromCurrency}/${alert.toCurrency as any}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const res = await deleteRateAlert(alert.id as any);
          if (res.success) {
            setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
          }
        },
      },
    ]);
  };

  const openCreateSheet = (pair: CurrencyPair) => {
    const key = `${pair.from}-${pair.to}`;
    const liveRate = liveRates.get(key);
    setSelectedPair({
      from: pair.from,
      to: pair.to,
      fromFlag: pair.fromFlag,
      toFlag: pair.toFlag,
      rate: liveRate?.rate || 1,
    });
    setSheetOpen(true);
  };

  const handleAlertCreated = () => {
    loadAlerts();
  };

  // Filter and sort alerts
    const activeAlerts = useMemo(
      () => alerts.filter((a) => a.is_active),
      [alerts]
    );
  
    const historyAlerts = useMemo(
      () =>
        alerts
          .filter((a) => !a.is_active || (a.trigger_count ?? 0) > 0)
          .sort((a, b) => {
            const dateA = a.triggered_at ? new Date(a.triggered_at).getTime() : 0;
            const dateB = b.triggered_at ? new Date(b.triggered_at).getTime() : 0;
            return dateB - dateA;
          }),
      [alerts]
    );
  
    const filteredAlerts = useMemo(() => {
      const list = activeTab === "active" ? activeAlerts : historyAlerts;
      if (!searchQuery.trim()) return list;
      const q = searchQuery.toLowerCase();
      return list.filter(
        (a) =>
          (a.from_currency ?? "").toLowerCase().includes(q) ||
          (a.to_currency ?? "").toLowerCase().includes(q)
      );
    }, [activeTab, activeAlerts, historyAlerts, searchQuery]);
  
    const getLiveRateForAlert = (alert: RateAlert) => {
      const key = `${alert.from_currency}-${alert.to_currency}`;
      return liveRates.get(key);
    };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScreenShell padded={false}>
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Rate Alerts</Text>
              <Text style={styles.subtitle}>
                {alerts.length} alert{alerts.length !== 1 ? "s" : ""} • {activeAlerts.length} active
              </Text>
            </View>
          </View>

          {/* Quick Create Section */}
          <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
            <Text style={localStyles.sectionLabel}>Quick Create Alert</Text>
            {popularPairs.length === 0 ? (
              <View style={{ paddingVertical: 16, alignItems: "center" }}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={{ color: COLORS.muted, marginTop: 8, fontSize: 12 }}>
                  Loading currencies...
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 8 }}
              >
                {popularPairs.map((pair, idx) => {
                  const key = `${pair.from}-${pair.to}`;
                  const liveRate = liveRates.get(key);
                  const isPositive = (liveRate?.change || "").startsWith("+");

                  return (
                    <Pressable
                      key={idx}
                      onPress={() => openCreateSheet(pair)}
                      style={localStyles.quickPairCard}
                    >
                      <View style={localStyles.quickPairFlags}>
                        <Text style={{ fontSize: 20 }}>{pair.fromFlag}</Text>
                        <Text style={{ fontSize: 12, marginHorizontal: 4, color: COLORS.muted }}>→</Text>
                        <Text style={{ fontSize: 20 }}>{pair.toFlag}</Text>
                      </View>
                      <Text style={localStyles.quickPairCode}>
                        {pair.from}/{pair.to}
                      </Text>
                      {liveRate ? (
                        <Text style={localStyles.quickPairRate}>
                          {liveRate.rate.toFixed(4)}
                        </Text>
                      ) : (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      )}
                    {liveRate?.change && (
                      <View
                        style={[
                          localStyles.changePill,
                          { backgroundColor: isPositive ? COLORS.greenLight : COLORS.errorLight },
                        ]}
                      >
                        <Text
                          style={[
                            localStyles.changeText,
                            { color: isPositive ? COLORS.green : COLORS.error },
                          ]}
                        >
                          {liveRate.change}
                        </Text>
                      </View>
                    )}
                    <View style={localStyles.addBadge}>
                      <Text style={{ color: COLORS.primary, fontWeight: "700", fontSize: 16 }}>+</Text>
                    </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Search & Tabs */}
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <View style={localStyles.searchContainer}>
              <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by currency..."
                placeholderTextColor={COLORS.muted}
                style={localStyles.searchInput}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")}>
                  <Text style={{ fontSize: 16, color: COLORS.muted }}>✕</Text>
                </Pressable>
              )}
            </View>

            {/* Tab Selector */}
            <View style={localStyles.tabContainer}>
              <Pressable
                onPress={() => setActiveTab("active")}
                style={[
                  localStyles.tab,
                  activeTab === "active" && localStyles.tabActive,
                ]}
              >
                <Text
                  style={[
                    localStyles.tabText,
                    activeTab === "active" && localStyles.tabTextActive,
                  ]}
                >
                  Active ({activeAlerts.length})
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab("history")}
                style={[
                  localStyles.tab,
                  activeTab === "history" && localStyles.tabActive,
                ]}
              >
                <Text
                  style={[
                    localStyles.tabText,
                    activeTab === "history" && localStyles.tabTextActive,
                  ]}
                >
                  History ({historyAlerts.length})
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Content */}
          {loading ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : filteredAlerts.length === 0 ? (
            <View style={localStyles.emptyState}>
              <View style={localStyles.emptyIcon}>
                <Text style={{ fontSize: 40 }}>{activeTab === "active" ? "🔔" : "📊"}</Text>
              </View>
              <Text style={localStyles.emptyTitle}>
                {activeTab === "active" ? "No active alerts" : "No alert history"}
              </Text>
              <Text style={localStyles.emptySubtitle}>
                {activeTab === "active"
                  ? "Tap a currency pair above to create your first alert"
                  : "Triggered alerts will appear here"}
              </Text>
              {activeTab === "active" && (
                <Pressable
                  onPress={() => router.push("/exchangerates")}
                  style={localStyles.emptyButton}
                >
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Browse All Rates</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={{ marginTop: 16 }}>
              {filteredAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  liveRate={getLiveRateForAlert(alert)}
                  onToggle={() => handleToggleAlert(alert)}
                  onDelete={() => handleDeleteAlert(alert)}
                  showHistory={activeTab === "history"}
                  fromFlag={getFlagForCurrency(alert.from_currency || "")}
                  toFlag={getFlagForCurrency(alert.to_currency || "")}
                />
              ))}
            </View>
          )}

          {/* Stats Summary */}
          {alerts.length > 0 && (
            <View style={localStyles.statsContainer}>
              <View style={localStyles.statBox}>
                <Text style={localStyles.statValue}>{alerts.length}</Text>
                <Text style={localStyles.statLabel}>Total Alerts</Text>
              </View>
              <View style={localStyles.statBox}>
                <Text style={[localStyles.statValue, { color: COLORS.primary }]}>
                  {activeAlerts.length}
                </Text>
                <Text style={localStyles.statLabel}>Active</Text>
              </View>
              <View style={localStyles.statBox}>
                <Text style={[localStyles.statValue, { color: COLORS.accent }]}>
                  {alerts.reduce((sum, a) => sum + a.triggerCount, 0)}
                </Text>
                <Text style={localStyles.statLabel}>Triggered</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Floating Create Button */}
        <Pressable
          onPress={() => router.push("/exchangerates")}
          style={localStyles.fab}
        >
          <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>+</Text>
        </Pressable>

        {/* Create Alert Sheet */}
        {selectedPair && (
          <CreateRateAlertSheet
            open={sheetOpen}
            onClose={() => {
              setSheetOpen(false);
              setSelectedPair(null);
            }}
            fromCurrency={selectedPair.from}
            toCurrency={selectedPair.to}
            currentRate={selectedPair.rate}
            fromFlag={selectedPair.fromFlag}
            toFlag={selectedPair.toFlag}
            onSuccess={handleAlertCreated}
          />
        )}
      </ScreenShell>
    </SafeAreaView>
  );
}

// Enhanced Alert Card Component
function AlertCard({
  alert,
  liveRate,
  onToggle,
  onDelete,
  showHistory,
  fromFlag,
  toFlag,
}: {
  alert: RateAlert;
  liveRate?: LiveRate;
  onToggle: () => void;
  onDelete: () => void;
  showHistory: boolean;
  fromFlag: string;
  toFlag: string;
}) {
  const directionIcon = alert.direction === "above" ? "📈" : "📉";
  const directionText = alert.direction === "above" ? "Above" : "Below";
  const currentRate = liveRate?.rate;
  
  // Calculate distance to target (guard against undefined target_rate)
  const distancePercent =
    currentRate && typeof alert.target_rate === "number"
      ? (((alert.target_rate - currentRate) / currentRate) * 100).toFixed(2)
      : null;
  const isClose =
    distancePercent !== null &&
    !Number.isNaN(parseFloat(distancePercent)) &&
    Math.abs(parseFloat(distancePercent)) < 2;

  return (
    <View style={[localStyles.alertCard, !alert.is_active && localStyles.alertCardInactive]}>
      {/* Header Row */}
      <View style={localStyles.alertHeader}>
        <View style={localStyles.alertPair}>
          <View style={{ flexDirection: "row", marginRight: 8 }}>
            <Text style={{ fontSize: 18 }}>{fromFlag}</Text>
            <Text style={{ fontSize: 18, marginLeft: -4 }}>{toFlag}</Text>
          </View>
          <View>
            <Text style={localStyles.alertPairText}>
              {alert.from_currency}/{alert.to_currency}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2, flexWrap: "wrap", gap: 4 }}>
              <View style={[
                localStyles.directionBadge,
                { backgroundColor: alert.direction === "above" ? COLORS.greenLight : COLORS.errorLight }
              ]}>
                <Text style={[
                  localStyles.directionText,
                  { color: alert.direction === "above" ? COLORS.green : COLORS.error }
                ]}>
                  {directionIcon} {directionText}
                </Text>
              </View>
              {alert.is_recurring && (
                <View style={localStyles.recurringBadge}>
                  <Text style={localStyles.recurringText}>🔄 RECURRING</Text>
                </View>
              )}
              {isClose && alert.is_active && (
                <View style={localStyles.closeBadge}>
                  <Text style={localStyles.closeText}>⚡ CLOSE</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Toggle Switch */}
        <Pressable onPress={onToggle} style={localStyles.toggleContainer}>
          <View
            style={[
              localStyles.toggle,
              { backgroundColor: alert.is_active ? COLORS.primary : COLORS.border },
            ]}
          >
            <View
              style={[
                localStyles.toggleThumb,
                { alignSelf: alert.is_active ? "flex-end" : "flex-start" },
              ]}
            />
          </View>
        </Pressable>
      </View>

      {/* Rate Info */}
      <View style={localStyles.rateInfoContainer}>
        <View style={localStyles.rateInfoBox}>
          <Text style={localStyles.rateLabel}>Target Rate</Text>
          <Text style={localStyles.rateValue}>
            {directionText} {typeof alert.target_rate === "number" ? alert.target_rate.toFixed(4) : "—"}
          </Text>
        </View>
        {currentRate && (
          <View style={localStyles.rateInfoBox}>
            <Text style={localStyles.rateLabel}>Current Rate</Text>
            <Text style={localStyles.rateValue}>{currentRate.toFixed(4)}</Text>
          </View>
        )}
        {distancePercent && (
          <View style={localStyles.rateInfoBox}>
            <Text style={localStyles.rateLabel}>Distance</Text>
            <Text
              style={[
                localStyles.rateValue,
                {
                  color: parseFloat(distancePercent) > 0 ? COLORS.green : COLORS.error,
                },
              ]}
            >
              {parseFloat(distancePercent) > 0 ? "+" : ""}
              {distancePercent}%
            </Text>
          </View>
        )}
      </View>

      {/* History Info */}
      {showHistory && (alert.trigger_count ?? 0) > 0 && (
        <View style={localStyles.historyInfo}>
          <Text style={localStyles.historyText}>
            🔔 Triggered {alert.trigger_count} time{(alert.trigger_count ?? 0) !== 1 ? "s" : ""}
          </Text>
          {alert.triggered_at && (
            <Text style={localStyles.historyDate}>
              Last: {new Date(alert.triggered_at).toLocaleDateString()}
            </Text>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={localStyles.alertActions}>
        <Pressable onPress={onDelete} style={localStyles.deleteBtn}>
          <Text style={{ fontSize: 14 }}>🗑️</Text>
          <Text style={localStyles.deleteBtnText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

const localStyles = {
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: COLORS.textSecondary,
    marginBottom: 4,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  quickPairCard: {
    width: 120,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center" as const,
    position: "relative" as const,
  },
  quickPairFlags: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 8,
  },
  quickPairCode: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: COLORS.text,
    marginBottom: 4,
  },
  quickPairRate: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "600" as const,
  },
  changePill: {
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  changeText: {
    fontSize: 11,
    fontWeight: "700" as const,
  },
  addBadge: {
    position: "absolute" as const,
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(46, 158, 106, 0.15)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 2,
    borderColor: "#fff",
  },
  searchContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: COLORS.bgTertiary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  tabContainer: {
    flexDirection: "row" as const,
    marginTop: 16,
    backgroundColor: COLORS.bgTertiary,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center" as const,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: COLORS.muted,
  },
  tabTextActive: {
    color: COLORS.text,
    fontWeight: "700" as const,
  },
  emptyState: {
    padding: 40,
    alignItems: "center" as const,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.bgTertiary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: COLORS.muted,
    textAlign: "center" as const,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  alertCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  alertCardInactive: {
    opacity: 0.6,
    backgroundColor: COLORS.bgTertiary,
  },
  alertHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    marginBottom: 12,
  },
  alertPair: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  alertPairText: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: COLORS.text,
  },
  directionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  directionText: {
    fontSize: 10,
    fontWeight: "700" as const,
  },
  recurringBadge: {
    backgroundColor: "rgba(46, 158, 106, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recurringText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: COLORS.primary,
  },
  closeBadge: {
    backgroundColor: COLORS.errorLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  closeText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: COLORS.error,
  },
  toggleContainer: {
    padding: 4,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: "center" as const,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  rateInfoContainer: {
    flexDirection: "row" as const,
    backgroundColor: COLORS.bgTertiary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  rateInfoBox: {
    flex: 1,
  },
  rateLabel: {
    fontSize: 11,
    color: COLORS.muted,
    marginBottom: 2,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  rateValue: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: COLORS.text,
  },
  historyInfo: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    marginBottom: 12,
  },
  historyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "600" as const,
  },
  historyDate: {
    fontSize: 12,
    color: COLORS.muted,
  },
  alertActions: {
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
  },
  deleteBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.errorLight,
  },
  deleteBtnText: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: "600" as const,
    color: COLORS.error,
  },
  statsContainer: {
    flexDirection: "row" as const,
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: COLORS.bgTertiary,
    borderRadius: 16,
    padding: 16,
  },
  statBox: {
    flex: 1,
    alignItems: "center" as const,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
  fab: {
    position: "absolute" as const,
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
};
