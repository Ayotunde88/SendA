import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { getRateAlerts, deleteRateAlert, updateRateAlert, RateAlert } from "@/api/config";
import ScreenShell from "../../../components/ScreenShell";
import { styles } from "../../../theme/styles";
import { COLORS } from "../../../theme/colors";

export default function RateAlertsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<RateAlert[]>([]);

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

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAlerts();
  }, [loadAlerts]);

  const handleToggleAlert = async (alert: RateAlert) => {
    const res = await updateRateAlert(alert.id, { is_active: !alert.isActive });
    if (res.success) {
      setAlerts((prev) =>
        prev.map((a) => (a.id === alert.id ? { ...a, isActive: !a.isActive } : a))
      );
    }
  };

  const handleDeleteAlert = (alert: RateAlert) => {
    Alert.alert("Delete Alert", `Remove alert for ${alert.fromCurrency}/${alert.toCurrency}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const res = await deleteRateAlert(alert.id);
          if (res.success) {
            setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
          }
        },
      },
    ]);
  };

  const activeAlerts = alerts.filter((a) => a.isActive);
  const inactiveAlerts = alerts.filter((a) => !a.isActive);

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
              <Text style={styles.title}>Rate Alerts</Text>
              <Text style={styles.subtitle}>Get notified when rates hit your target</Text>
            </View>
          </View>

          {/* Content */}
          {loading ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : alerts.length === 0 ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>🔔</Text>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 8 }}>
                No rate alerts yet
              </Text>
              <Text style={{ color: "#6b7280", textAlign: "center", marginBottom: 24 }}>
                Set alerts on the Exchange Rates screen to get notified when rates reach your target.
              </Text>
              <Pressable
                onPress={() => router.push("/exchangerates")}
                style={[styles.primaryBtn, { paddingHorizontal: 24 }]}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>View Exchange Rates</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {activeAlerts.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text style={[styles.sectionTitle, { paddingHorizontal: 16, marginBottom: 8 }]}>
                    Active Alerts ({activeAlerts.length})
                  </Text>
                  {activeAlerts.map((alert) => (
                    <AlertRow
                      key={alert.id}
                      alert={alert}
                      onToggle={() => handleToggleAlert(alert)}
                      onDelete={() => handleDeleteAlert(alert)}
                    />
                  ))}
                </View>
              )}

              {inactiveAlerts.length > 0 && (
                <View style={{ marginTop: 24 }}>
                  <Text style={[styles.sectionTitle, { paddingHorizontal: 16, marginBottom: 8, color: "#9ca3af" }]}>
                    Triggered / Inactive ({inactiveAlerts.length})
                  </Text>
                  {inactiveAlerts.map((alert) => (
                    <AlertRow
                      key={alert.id}
                      alert={alert}
                      onToggle={() => handleToggleAlert(alert)}
                      onDelete={() => handleDeleteAlert(alert)}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </ScreenShell>
    </SafeAreaView>
  );
}

function AlertRow({
  alert,
  onToggle,
  onDelete,
}: {
  alert: RateAlert;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const directionIcon = alert.direction === "above" ? "📈" : "📉";
  const directionText = alert.direction === "above" ? "Above" : "Below";

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: alert.isActive ? "#e5e7eb" : "#f3f4f6",
        opacity: alert.isActive ? 1 : 0.7,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>{directionIcon}</Text>
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>
              {alert.fromCurrency}/{alert.toCurrency}
            </Text>
            {alert.isRecurring && (
              <View
                style={{
                  marginLeft: 8,
                  backgroundColor: "rgba(25,149,95,0.1)",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: "700", color: "#19955f" }}>RECURRING</Text>
              </View>
            )}
          </View>
          <Text style={{ color: "#6b7280", fontSize: 14 }}>
            {directionText} {alert.targetRate.toFixed(4)}
          </Text>
          {alert.triggerCount > 0 && (
            <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>
              Triggered {alert.triggerCount}x
            </Text>
          )}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable
            onPress={onToggle}
            style={{
              width: 50,
              height: 28,
              borderRadius: 14,
              backgroundColor: alert.isActive ? "#19955f" : "#d1d5db",
              justifyContent: "center",
              padding: 2,
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: "#fff",
                alignSelf: alert.isActive ? "flex-end" : "flex-start",
              }}
            />
          </Pressable>
          <Pressable onPress={onDelete} style={{ marginLeft: 12, padding: 8 }}>
            <Text style={{ fontSize: 18 }}>🗑️</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}