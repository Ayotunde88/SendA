import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Switch,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "../../../../theme/colors";

interface RowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
}

function Row({ icon, label, onPress, right, danger }: RowProps) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.iconWrap}>
          <Ionicons
            name={icon}
            size={18}
            color={danger ? "#EF4444" : COLORS.primary}
          />
        </View>
        <Text style={[styles.label, danger && { color: "#EF4444" }]}>
          {label}
        </Text>
      </View>

      {right}
    </Pressable>
  );
}

export default function SecurityPrivacyScreen() {
  const router = useRouter();

  const [bioEnabled, setBioEnabled] = useState(false);
  const [hideBalance, setHideBalance] = useState(false);
  const [bioType, setBioType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /* ---------------- INIT ---------------- */

  useEffect(() => {
    (async () => {
      try {
        const savedBio = await AsyncStorage.getItem("biometric_enabled");
        const savedHide = await AsyncStorage.getItem("hide_balance_preference");

        setBioEnabled(savedBio === "true");
        setHideBalance(savedHide === "true");

        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();

        if (compatible && enrolled) {
          const types =
            await LocalAuthentication.supportedAuthenticationTypesAsync();

          if (
            types.includes(
              LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
            )
          ) {
            setBioType("Face ID");
          } else if (
            types.includes(
              LocalAuthentication.AuthenticationType.FINGERPRINT
            )
          ) {
            setBioType("Touch ID");
          } else {
            setBioType("Biometric");
          }
        }
      } catch (e) {
        console.log("Init error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------------- BIOMETRIC TOGGLE ---------------- */

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: `Authenticate to enable ${bioType}`,
          fallbackLabel: "Use Passcode",
          disableDeviceFallback: false,
        });

        if (result.success) {
          await AsyncStorage.setItem("biometric_enabled", "true");
          setBioEnabled(true);
        } else {
          Alert.alert("Authentication failed");
        }
      } catch {
        Alert.alert("Biometric authentication unavailable");
      }
    } else {
      await AsyncStorage.setItem("biometric_enabled", "false");
      setBioEnabled(false);
    }
  };

  /* ---------------- HIDE BALANCE ---------------- */

  const handleHideBalanceToggle = async (value: boolean) => {
    setHideBalance(value);
    await AsyncStorage.setItem(
      "hide_balance_preference",
      value ? "true" : "false"
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </Pressable>

        <Text style={styles.headerTitle}>Security and privacy</Text>

        <View style={{ width: 40 }} />
      </View>

      {/* Card */}
      <View style={styles.card}>
        <Row
          icon="lock-closed-outline"
          label="Reset Password"
          onPress={() => router.push("/reset-password")}
          right={<Ionicons name="chevron-forward" size={18} color="#9CA3AF" />}
        />

        <View style={styles.divider} />

        <Row
          icon="key-outline"
          label="Transaction PIN"
          right={<Ionicons name="chevron-forward" size={18} color="#9CA3AF" />}
        />

        <View style={styles.divider} />

        {bioType && (
          <>
            <Row
              icon="finger-print-outline"
              label={`Enable ${bioType}`}
              right={
                <Switch
                  value={bioEnabled}
                  onValueChange={handleBiometricToggle}
                  trackColor={{ true: COLORS.primary }}
                />
              }
            />
            <View style={styles.divider} />
          </>
        )}

        <Row
          icon="shield-checkmark-outline"
          label="View Privacy Settings"
          right={<Ionicons name="chevron-forward" size={18} color="#9CA3AF" />}
        />

        <View style={styles.divider} />

        <Row
          icon="eye-off-outline"
          label="Hide Balance"
          right={
            <Switch
              value={hideBalance}
              onValueChange={handleHideBalanceToggle}
              trackColor={{ true: COLORS.primary }}
            />
          }
        />
      </View>
    </SafeAreaView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
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
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    marginTop: 12,
    overflow: "hidden",
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  divider: {
    height: 1,
    backgroundColor: "#EEF2F7",
    marginLeft: 62,
  },
});