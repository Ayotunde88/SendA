/**
 * PinVerificationModal - Reusable PIN verification modal for transaction authorization
 * 
 * Usage:
 * <PinVerificationModal
 *   visible={showPinModal}
 *   onClose={() => setShowPinModal(false)}
 *   onSuccess={() => handleConfirmedAction()}
 *   title="Enter PIN to confirm"
 * />
 */
import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../theme/colors";
import { verifyPin } from "../api/config";

interface PinVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
}

function DotRow({ count, error }: { count: number; error: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 24 }}>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            borderWidth: 2,
            borderColor: error ? "#EF4444" : i < count ? COLORS.primary : "#D1D5DB",
            backgroundColor: i < count ? (error ? "#EF4444" : COLORS.primary) : "transparent",
          }}
        />
      ))}
    </View>
  );
}

export default function PinVerificationModal({
  visible,
  onClose,
  onSuccess,
  title = "Enter your PIN",
  subtitle = "Enter your 4-digit PIN to authorize this transaction",
}: PinVerificationModalProps) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submittingRef = useRef(false);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setPin("");
      setError("");
      setLoading(false);
      submittingRef.current = false;
    }
  }, [visible]);

  const keys = useMemo(
    () => [
      ["1", "2", "3"],
      ["4", "5", "6"],
      ["7", "8", "9"],
      ["", "0", "del"],
    ],
    []
  );

  async function handlePinComplete(enteredPin: string) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError("");

    try {
      const phone = (await AsyncStorage.getItem("user_phone"))?.trim();
      if (!phone) {
        setError("Session expired. Please login again.");
        setPin("");
        return;
      }

      const response = await verifyPin(phone, enteredPin);

      if (response?.success) {
        onSuccess();
        onClose();
      } else {
        setError(response?.message || "Incorrect PIN. Try again.");
        setPin("");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to verify PIN");
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
    if (k === "") return;
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
    if (k === "") {
      return <View key="empty" style={{ width: 72, height: 72 }} />;
    }

    if (k === "del") {
      return (
        <Pressable
          key={k}
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#F3F4F6",
            opacity: loading ? 0.5 : 1,
          }}
          onPress={() => press(k)}
          disabled={loading}
        >
          <Ionicons name="backspace-outline" size={24} color={COLORS.text || "#1F2937"} />
        </Pressable>
      );
    }

    return (
      <Pressable
        key={k}
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F3F4F6",
          opacity: loading ? 0.5 : 1,
        }}
        onPress={() => press(k)}
        disabled={loading}
      >
        <Text style={{ fontSize: 28, fontWeight: "600", color: COLORS.text || "#1F2937" }}>
          {k}
        </Text>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: 40,
            paddingTop: 20,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 20,
              marginBottom: 20,
            }}
          >
            <View style={{ width: 40 }} />
            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: "#ECFDF5",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Ionicons name="shield-checkmark-outline" size={28} color={COLORS.primary} />
              </View>
              <Text style={{ fontSize: 20, fontWeight: "700", color: "#1F2937", textAlign: "center" }}>
                {title}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#6B7280",
                  textAlign: "center",
                  marginTop: 4,
                  paddingHorizontal: 20,
                }}
              >
                {subtitle}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              disabled={loading}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "#F3F4F6",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="close" size={20} color="#6B7280" />
            </Pressable>
          </View>

          {/* PIN Dots */}
          <DotRow count={pin.length} error={!!error} />

          {/* Error Message */}
          {!!error && (
            <Text
              style={{
                color: "#EF4444",
                textAlign: "center",
                marginTop: 12,
                fontSize: 14,
                fontWeight: "500",
              }}
            >
              {error}
            </Text>
          )}

          {/* Loading Indicator */}
          {loading && (
            <ActivityIndicator
              size="small"
              color={COLORS.primary}
              style={{ marginTop: 16 }}
            />
          )}

          {/* PIN Pad */}
          <View style={{ marginTop: 32, paddingHorizontal: 40 }}>
            {keys.map((row, rIdx) => (
              <View
                key={rIdx}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                {row.map((k) => renderKey(k))}
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}