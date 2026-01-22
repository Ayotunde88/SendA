import React, { useState } from "react";
import { View, Text, Pressable, TextInput, ActivityIndicator, Switch } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createRateAlert } from "@/api/config";
import BottomSheet from "./BottomSheet";
import { COLORS } from "../theme/colors";

type Props = {
  open: boolean;
  onClose: () => void;
  fromCurrency: string;
  toCurrency: string;
  currentRate: number;
  fromFlag?: string;
  toFlag?: string;
  onSuccess?: () => void;
};

export default function CreateRateAlertSheet({
  open,
  onClose,
  fromCurrency,
  toCurrency,
  currentRate,
  fromFlag = "",
  toFlag = "",
  onSuccess,
}: Props) {
  const [targetRate, setTargetRate] = useState(currentRate.toFixed(4));
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [isRecurring, setIsRecurring] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    const rate = parseFloat(targetRate);
    if (!rate || rate <= 0) {
      setError("Please enter a valid target rate");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const phone = await AsyncStorage.getItem("user_phone");
      if (!phone) {
        setError("User not found");
        setLoading(false);
        return;
      }

      const res = await createRateAlert({
        phone,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        target_rate: rate,
        direction,
        is_recurring: isRecurring,
      });

      if (res.success) {
        onSuccess?.();
        onClose();
        // Reset state
        setTargetRate(currentRate.toFixed(4));
        setDirection("above");
        setIsRecurring(false);
      } else {
        setError(res.message || "Failed to create alert");
      }
    } catch (e) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827", marginBottom: 4 }}>
        Set Rate Alert
      </Text>
      <Text style={{ color: "#6b7280", marginBottom: 20 }}>
        Get notified when the rate hits your target
      </Text>

      {/* Currency Pair */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <Text style={{ fontSize: 24 }}>{fromFlag}</Text>
        <Text style={{ fontSize: 18, fontWeight: "800", marginHorizontal: 8 }}>
          {fromCurrency} → {toCurrency}
        </Text>
        <Text style={{ fontSize: 24 }}>{toFlag}</Text>
      </View>

      {/* Current Rate */}
      <View
        style={{
          backgroundColor: "#f3f4f6",
          borderRadius: 10,
          padding: 12,
          marginBottom: 16,
        }}
      >
        <Text style={{ color: "#6b7280", fontSize: 12, marginBottom: 4 }}>Current Rate</Text>
        <Text style={{ color: "#111827", fontSize: 18, fontWeight: "700" }}>
          1 {fromCurrency} = {currentRate.toFixed(4)} {toCurrency}
        </Text>
      </View>

      {/* Target Rate Input */}
      <Text style={{ fontWeight: "700", color: "#111827", marginBottom: 8 }}>Target Rate</Text>
      <TextInput
        value={targetRate}
        onChangeText={setTargetRate}
        keyboardType="decimal-pad"
        placeholder="Enter target rate"
        style={{
          borderWidth: 1,
          borderColor: "#e5e7eb",
          borderRadius: 10,
          padding: 14,
          fontSize: 18,
          fontWeight: "700",
          marginBottom: 16,
        }}
      />

      {/* Direction Toggle */}
      <Text style={{ fontWeight: "700", color: "#111827", marginBottom: 8 }}>Alert When Rate</Text>
      <View style={{ flexDirection: "row", marginBottom: 16 }}>
        <Pressable
          onPress={() => setDirection("above")}
          style={{
            flex: 1,
            paddingVertical: 12,
            borderRadius: 8,
            backgroundColor: direction === "above" ? "rgba(25,149,95,0.15)" : "#f3f4f6",
            borderWidth: 2,
            borderColor: direction === "above" ? "#19955f" : "transparent",
            alignItems: "center",
            marginRight: 8,
          }}
        >
          <Text style={{ fontSize: 18, marginBottom: 4 }}>📈</Text>
          <Text style={{ fontWeight: "700", color: direction === "above" ? "#19955f" : "#6b7280" }}>
            Goes Above
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setDirection("below")}
          style={{
            flex: 1,
            paddingVertical: 12,
            borderRadius: 8,
            backgroundColor: direction === "below" ? "rgba(239,68,68,0.15)" : "#f3f4f6",
            borderWidth: 2,
            borderColor: direction === "below" ? "#ef4444" : "transparent",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 18, marginBottom: 4 }}>📉</Text>
          <Text style={{ fontWeight: "700", color: direction === "below" ? "#ef4444" : "#6b7280" }}>
            Drops Below
          </Text>
        </Pressable>
      </View>

      {/* Recurring Toggle */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingVertical: 12,
          borderTopWidth: 1,
          borderTopColor: "#f3f4f6",
          marginBottom: 16,
        }}
      >
        <View>
          <Text style={{ fontWeight: "700", color: "#111827" }}>Recurring Alert</Text>
          <Text style={{ color: "#6b7280", fontSize: 12 }}>Keep alerting each time target is hit</Text>
        </View>
        <Switch
          value={isRecurring}
          onValueChange={setIsRecurring}
          trackColor={{ false: "#d1d5db", true: "#19955f" }}
          thumbColor="#fff"
        />
      </View>

      {/* Error */}
      {error ? (
        <Text style={{ color: "#ef4444", marginBottom: 12, textAlign: "center" }}>{error}</Text>
      ) : null}

      {/* Create Button */}
      <Pressable
        onPress={handleCreate}
        disabled={loading}
        style={{
          backgroundColor: COLORS.primary,
          paddingVertical: 16,
          borderRadius: 12,
          alignItems: "center",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Create Alert</Text>
        )}
      </Pressable>
    </BottomSheet>
  );
}
