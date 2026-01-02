// PinScreen.tsx
import React, { useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "../../../theme/colors";
import { styles } from "../../../theme/styles";
import { SafeAreaView } from "react-native-safe-area-context";

function DotRow({ count }: { count: number }) {
  return (
    <View style={styles.pinDotsRow}>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            styles.pinDot,
            i < count && { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
          ]}
        />
      ))}
    </View>
  );
}

export default function PinScreen() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submittingRef = useRef(false);

  const keys = useMemo(
    () => [
      ["1", "2", "3"],
      ["4", "5", "6"],
      ["7", "8", "9"],
      ["face", "0", "del"],
    ],
    []
  );

  async function handlePinComplete(firstPin: string) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError("");

    try {
      const phone = (await AsyncStorage.getItem("user_phone"))?.trim();
      if (!phone) {
        Alert.alert("Error", "Session expired. Please login again.");
        router.replace("/getstarted");
        return;
      }

      // Save first PIN for confirmation screen
      await AsyncStorage.setItem("pending_pin", firstPin);

      // Go confirm
      router.push("/verifypin"); // <-- update this path to your actual VerifyPinScreen route
    } catch (e: any) {
      setError(e?.message || "Failed to continue");
      setPin("");
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  function press(k: string) {
    if (loading || submittingRef.current) return;

    if (k === "del") {
      setError("");
      setPin((prev) => prev.slice(0, -1));
      return;
    }
    if (k === "face") return;
    if (!/^\d$/.test(k)) return;

    setError("");
    setPin((prev) => {
      if (prev.length >= 4) return prev;
      const next = prev + k;
      if (next.length === 4) void handlePinComplete(next);
      return next;
    });
  }

  const renderKey = (k: string) => {
    if (k === "face")
      return (
        <Pressable key={k} style={[styles.pinKey, loading && { opacity: 0.5 }]} onPress={() => press(k)}>
          <Ionicons name="scan-outline" size={24} color={COLORS.text} />
        </Pressable>
      );
    if (k === "del")
      return (
        <Pressable key={k} style={[styles.pinKey, loading && { opacity: 0.5 }]} onPress={() => press(k)}>
          <Ionicons name="backspace-outline" size={24} color={COLORS.text} />
        </Pressable>
      );

    return (
      <Pressable key={k} style={[styles.pinKey, loading && { opacity: 0.5 }]} onPress={() => press(k)}>
        <Text style={styles.pinKeyText}>{k}</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View>
        <View style={styles.pinHeader}>
          <Pressable style={styles.iconBtn} onPress={() => router.back()} disabled={loading}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </Pressable>
        </View>

        <View style={styles.pinTop}>
          <View style={styles.pinShield}>
            <Ionicons name="shield-checkmark-outline" size={28} color={COLORS.primary} />
          </View>

          <Text style={styles.pinTitle}>Create your PIN</Text>
          <DotRow count={pin.length} />

          {!!error && <Text style={styles.pinError}>{error}</Text>}
          {loading && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 16 }} />}
        </View>

        <View style={styles.pinPad}>
          {keys.map((row, rIdx) => (
            <View key={rIdx} style={styles.pinRow}>
              {row.map((k) => renderKey(k))}
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
