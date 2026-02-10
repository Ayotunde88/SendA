import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenShell from "../../../../../components/ScreenShell";
import { COLORS } from "../../../../../theme/colors";
import CountryFlag from "../../../../../components/CountryFlag";
import { API_BASE_URL } from "../../../../../api/config";

type UserAccount = {
  id: string;
  currencyCode: string;
  iban?: string;
  accountNumber?: string;
};

// Matches the actual backend response structure from get_user_limits_summary
type PeriodLimit = {
  used: number;
  limit: number;
  remaining: number;
};

type LimitInfo = {
  isActive?: boolean;
  daily?: PeriodLimit;
  weekly?: PeriodLimit;
  monthly?: PeriodLimit;
};

type LimitsData = {
  send?: LimitInfo;
  receive?: LimitInfo;
  currency?: string;
};

function normalizeCurrency(code: any) {
  return String(code || "").toUpperCase().trim();
}

function formatAmount(val: number | undefined | null, currency: string) {
  const num = Number(val);
  if (isNaN(num) || val === undefined || val === null) {
    return "—";
  }
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `${num}`;
  }
}

function LimitRow({
  label,
  limit,
  used,
  remaining,
  currency,
}: {
  label: string;
  limit: number;
  used: number;
  remaining: number;
  currency: string;
}) {
  const safeLimit = Number(limit) || 0;
  const safeUsed = Number(used) || 0;
  const safeRemaining = Number(remaining) || 0;
  const percent = safeLimit > 0 ? Math.min((safeUsed / safeLimit) * 100, 100) : 0;
  return (
    <View style={m.limitRow}>
      <Text style={m.limitLabel}>{label}</Text>
      <View style={m.limitValues}>
        <Text style={m.limitUsed}>
          {formatAmount(safeUsed, currency)} / {formatAmount(safeLimit, currency)}
        </Text>
        <Text style={m.limitRemaining}>
          {formatAmount(safeRemaining, currency)} left
        </Text>
      </View>
      <View style={m.progressBg}>
        <View style={[m.progressFill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}

function LimitSection({
  title,
  icon,
  data,
  currency,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  data?: LimitInfo;
  currency: string;
}) {
  if (!data) {
    return (
      <View style={m.section}>
        <View style={m.sectionHeader}>
          <Ionicons name={icon} size={18} color={COLORS.primary} />
          <Text style={m.sectionTitle}>{title}</Text>
        </View>
        <Text style={m.noData}>No limit configured</Text>
      </View>
    );
  }

  return (
    <View style={m.section}>
      <View style={m.sectionHeader}>
        <Ionicons name={icon} size={18} color={COLORS.primary} />
        <Text style={m.sectionTitle}>{title}</Text>
      </View>
      {data.daily && (
        <LimitRow
          label="Daily"
          limit={data.daily.limit}
          used={data.daily.used}
          remaining={data.daily.remaining}
          currency={currency}
        />
      )}
      {data.weekly && (
        <LimitRow
          label="Weekly"
          limit={data.weekly.limit}
          used={data.weekly.used}
          remaining={data.weekly.remaining}
          currency={currency}
        />
      )}
      {data.monthly && (
        <LimitRow
          label="Monthly"
          limit={data.monthly.limit}
          used={data.monthly.used}
          remaining={data.monthly.remaining}
          currency={currency}
        />
      )}
    </View>
  );
}

export default function AccountLimitsScreen() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<UserAccount[]>([]);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [limitsLoading, setLimitsLoading] = useState(false);
  const [limitsData, setLimitsData] = useState<LimitsData | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const phone = (await AsyncStorage.getItem("user_phone")) || "";
        
        // Try multiple cache key patterns (v2 is current, v1 is legacy fallback)
        let raw: string | null = null;
        
        if (phone) {
          // Try v2 first (current HomeScreen pattern)
          raw = await AsyncStorage.getItem(`cached_accounts_v2_${phone}`);
          // Fallback to v1 pattern
          if (!raw) {
            raw = await AsyncStorage.getItem(`cached_accounts_v1_${phone}`);
          }
        }
        // Fallback to non-scoped legacy keys
        if (!raw) {
          raw = await AsyncStorage.getItem("cached_accounts_v2");
        }
        if (!raw) {
          raw = await AsyncStorage.getItem("cached_accounts_v1");
        }
        
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) {
          setAccounts(
            parsed.map((a: any) => ({
              id: String(a.id || `${Date.now()}-${Math.random()}`),
              currencyCode: normalizeCurrency(a.currencyCode),
              iban: a.iban,
              accountNumber: a.accountNumber,
            }))
          );
        }
      } catch {
        setAccounts([]);
      }
    })();
  }, []);

  const visible = useMemo(
    () => accounts.filter((a) => normalizeCurrency(a.currencyCode)),
    [accounts]
  );

  const fetchLimits = async (currency: string) => {
    setLimitsLoading(true);
    setLimitsData(null);
    try {
      const phone = (await AsyncStorage.getItem("user_phone")) || "";
      if (!phone) {
        setLimitsData({ currency });
        return;
      }

      const url = `${API_BASE_URL}/limits/my-limits?phone=${encodeURIComponent(
        phone
      )}&currency=${encodeURIComponent(currency)}`;
      const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const json = await res.json();
      if (json.success && json.limits) {
        setLimitsData({
          send: json.limits.send,
          receive: json.limits.receive,
          currency,
        });
      } else {
        setLimitsData({ currency });
      }
    } catch (e) {
      console.log("Error fetching limits:", e);
      setLimitsData({ currency });
    } finally {
      setLimitsLoading(false);
    }
  };

  const handleAccountPress = (currency: string) => {
    setSelectedCurrency(currency);
    setModalVisible(true);
    fetchLimits(currency);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedCurrency("");
    setLimitsData(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScreenShell padded={false}>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={s.header}>
            <Pressable onPress={() => router.back()} style={s.backBtn}>
              <Ionicons name="arrow-back" size={20} color="#111827" />
            </Pressable>
            <Text style={s.headerTitle}>Account limits</Text>
            <View style={{ width: 40 }} />
          </View>

          <Text style={s.subtitle}>
            Choose account to see send and receive limit
          </Text>

          <View style={s.card}>
            {visible.length === 0 ? (
              <View style={{ padding: 16, alignItems: "center" }}>
                <Ionicons name="wallet-outline" size={28} color="#9CA3AF" />
                <Text
                  style={{
                    marginTop: 10,
                    color: "#6B7280",
                    fontWeight: "800",
                  }}
                >
                  No wallets found yet
                </Text>
              </View>
            ) : (
              visible.map((a, idx) => {
                const isLast = idx === visible.length - 1;
                return (
                  <Pressable
                    key={a.id}
                    style={[s.row, !isLast && s.divider]}
                    onPress={() => handleAccountPress(a.currencyCode)}
                  >
                    <View style={s.left}>
                      <CountryFlag currencyCode={a.currencyCode} size="md" />
                      <View style={{ marginLeft: 10 }}>
                        <Text style={s.title}>{a.currencyCode}</Text>
                        <Text style={s.sub}>
                          {a.iban
                            ? "IBAN, SWIFT/BIC"
                            : a.accountNumber
                            ? "Account number"
                            : "Account"}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </Pressable>
                );
              })
            )}
          </View>
        </ScrollView>
      </ScreenShell>

      {/* Limits Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View style={m.overlay}>
          <View style={m.modalContainer}>
            {/* Modal Header */}
            <View style={m.modalHeader}>
              <View style={m.headerLeft}>
                <CountryFlag currencyCode={selectedCurrency} size="lg" />
                <Text style={m.modalTitle}>{selectedCurrency} Limits</Text>
              </View>
              <Pressable onPress={closeModal} style={m.closeBtn}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </Pressable>
            </View>

            {/* Modal Body */}
            <ScrollView
              style={m.modalBody}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {limitsLoading ? (
                <View style={m.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={m.loadingText}>Loading limits...</Text>
                </View>
              ) : limitsData ? (
                <>
                  <LimitSection
                    title="Send Limits"
                    icon="arrow-up-circle-outline"
                    data={limitsData.send}
                    currency={selectedCurrency}
                  />
                  <LimitSection
                    title="Receive Limits"
                    icon="arrow-down-circle-outline"
                    data={limitsData.receive}
                    currency={selectedCurrency}
                  />

                  {/* Info Notice */}
                  <View style={m.notice}>
                    <Ionicons
                      name="information-circle-outline"
                      size={16}
                      color="#92400E"
                    />
                    <Text style={m.noticeText}>
                      Limits reset at midnight (daily), every Sunday (weekly), and
                      the 1st of each month (monthly).
                    </Text>
                  </View>
                </>
              ) : (
                <View style={m.errorContainer}>
                  <Ionicons name="warning-outline" size={32} color="#9CA3AF" />
                  <Text style={m.errorText}>Could not load limits</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  subtitle: {
    paddingHorizontal: 16,
    marginTop: 6,
    color: "#6B7280",
    fontWeight: "700",
    fontSize: 12,
  },
  card: {
    marginTop: 14,
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  divider: { borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  left: { flexDirection: "row", alignItems: "center" },
  title: { fontSize: 14, fontWeight: "900", color: "#111827" },
  sub: { marginTop: 2, fontSize: 12, fontWeight: "700", color: "#6B7280" },
});

const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingTop: 6,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
  },
  errorContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  errorText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },
  noData: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  limitRow: {
    marginBottom: 14,
  },
  limitLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#374151",
    marginBottom: 4,
  },
  limitValues: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  limitUsed: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  limitRemaining: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  progressBg: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  notice: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    color: "#92400E",
    lineHeight: 16,
  },
});
