/**
 * RecipientConfirmScreen - Confirm and execute transfer to Flutterwave-supported countries
 * 
 * Handles the final confirmation and transfer execution for:
 * - NGN (Nigeria)
 * - GHS (Ghana)
 * - KES (Kenya)
 * - RWF (Rwanda)
 * - Other Flutterwave-supported currencies
 * 
 * Requires PIN verification before executing the transfer.
 */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Platform,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import ScreenShell from "../../../components/ScreenShell";
import PinVerificationModal from "../../../components/PinVerificationModal";
import { styles } from "../../../theme/styles";
import {
  sendFlutterwave,
  getCurrencySymbol,
  COUNTRY_NAMES,
  CURRENCY_TO_COUNTRY,
} from "../../../api/flutterwave";

interface RecipientData {
  accountName: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  currency: string;
  countryCode: string;
}

export default function RecipientConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    destCurrency: string;
    fromWalletId: string;
    fromCurrency: string;
    fromAmount: string;
    toAmount: string;
    rate?: string;
    recipient: string;
    mode: string;
  }>();

  const [userPhone, setUserPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  // Parse recipient data
  const recipient: RecipientData = params.recipient 
    ? JSON.parse(params.recipient) 
    : null;

  const destCurrency = recipient?.currency || params.destCurrency || "NGN";
  const countryCode = recipient?.countryCode || CURRENCY_TO_COUNTRY[destCurrency] || "NG";
  const countryName = COUNTRY_NAMES[countryCode] || countryCode;
  const symbol = getCurrencySymbol(destCurrency);
  const fromSymbol = getCurrencySymbol(params.fromCurrency || "USD");

  const fromAmount = parseFloat(params.fromAmount || "0");
  const toAmount = parseFloat(params.toAmount || "0");
  const rate = params.rate ? parseFloat(params.rate) : null;

  useEffect(() => {
    AsyncStorage.getItem("user_phone").then((phone) => {
      if (phone) setUserPhone(phone);
    });
  }, []);

  const handleConfirmButtonPress = () => {
    if (!recipient || !userPhone) {
      Alert.alert("Error", "Missing recipient or user information");
      return;
    }
    // Show PIN verification modal
    setShowPinModal(true);
  };

  const handleConfirmSend = async () => {
    if (!recipient || !userPhone) {
      Alert.alert("Error", "Missing recipient or user information");
      return;
    }

    setSending(true);

    try {
      const response = await sendFlutterwave({
        phone: userPhone,
        amount: toAmount,
        currency: destCurrency,
        accountNumber: recipient.accountNumber,
        bankCode: recipient.bankCode,
        bankName: recipient.bankName,
        accountName: recipient.accountName,
        fromCurrency: params.fromCurrency,
        fromAmount: fromAmount,
        narration: `Transfer to ${recipient.accountName}`,
      });

      if (response.success) {
        Alert.alert(
          "Transfer Successful",
          `${symbol}${toAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${destCurrency} has been sent to ${recipient.accountName}`,
          [
            {
              text: "Done",
              onPress: () => router.replace("/"),
            },
          ]
        );
      } else {
        Alert.alert(
          "Transfer Failed",
          response.message || "Failed to send money. Please try again."
        );
      }
    } catch (error: any) {
      console.error("Transfer error:", error);
      Alert.alert(
        "Transfer Failed",
        error?.message || "An error occurred. Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  if (!recipient) {
    return (
      <ScreenShell>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "#EF4444", fontSize: 16 }}>Invalid recipient data</Text>
          <Pressable
            style={{ marginTop: 20, padding: 12, backgroundColor: "#2E9E6A", borderRadius: 8 }}
            onPress={() => router.back()}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Go Back</Text>
          </Pressable>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      >
        {/* Header */}
        <View style={styles.simpleHeader}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#1F2937" }}>
            Confirm Transfer
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Transfer Summary */}
        <View
          style={{
            backgroundColor: "#ECFDF5",
            borderRadius: 16,
            padding: 20,
            marginTop: 20,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, color: "#065F46", marginBottom: 8 }}>
            Recipient gets
          </Text>
          <Text style={{ fontSize: 32, fontWeight: "800", color: "#065F46" }}>
            {symbol}{toAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text style={{ fontSize: 16, color: "#065F46", marginTop: 4 }}>
            {destCurrency}
          </Text>
        </View>

        {/* From Amount */}
        <View
          style={{
            backgroundColor: "#F9FAFB",
            borderRadius: 12,
            padding: 16,
            marginTop: 16,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, color: "#6B7280" }}>You send</Text>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#1F2937" }}>
            {fromSymbol}{fromAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {params.fromCurrency}
          </Text>
        </View>

        {/* Exchange Rate */}
        {rate && params.fromCurrency !== destCurrency && (
          <View
            style={{
              backgroundColor: "#F9FAFB",
              borderRadius: 12,
              padding: 16,
              marginTop: 8,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 14, color: "#6B7280" }}>Exchange rate</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#1F2937" }}>
              1 {params.fromCurrency} = {rate.toFixed(4)} {destCurrency}
            </Text>
          </View>
        )}

        {/* Recipient Details */}
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 12 }}>
            Recipient Details
          </Text>
          
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#F3F4F6",
              }}
            >
              <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
                Account Name
              </Text>
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937" }}>
                {recipient.accountName}
              </Text>
            </View>

            <View
              style={{
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#F3F4F6",
              }}
            >
              <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
                Account Number
              </Text>
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }}>
                {recipient.accountNumber}
              </Text>
            </View>

            <View
              style={{
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#F3F4F6",
              }}
            >
              <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
                Bank
              </Text>
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937" }}>
                {recipient.bankName}
              </Text>
            </View>

            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
                Country
              </Text>
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937" }}>
                {countryName}
              </Text>
            </View>
          </View>
        </View>

        {/* Fee Notice */}
        <View
          style={{
            backgroundColor: "#FEF3C7",
            borderRadius: 8,
            padding: 12,
            marginTop: 20,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, marginRight: 8 }}>ℹ️</Text>
          <Text style={{ fontSize: 13, color: "#92400E", flex: 1 }}>
            Transfer fees may apply. Funds typically arrive within 24 hours.
          </Text>
        </View>

        {/* Confirm Button */}
        <Pressable
          style={{
            backgroundColor: sending ? "#9CA3AF" : "#16A34A",
            borderRadius: 12,
            padding: 18,
            marginTop: 24,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
          }}
          onPress={handleConfirmButtonPress}
          disabled={sending}
        >
          {sending ? (
            <>
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
                Sending...
              </Text>
            </>
          ) : (
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
              Confirm & Send
            </Text>
          )}
        </Pressable>

        {/* Cancel */}
        <Pressable
          style={{
            padding: 16,
            marginTop: 12,
            alignItems: "center",
          }}
          onPress={() => router.back()}
          disabled={sending}
        >
          <Text style={{ color: "#6B7280", fontSize: 16, fontWeight: "600" }}>
            Cancel
          </Text>
        </Pressable>
      </ScrollView>

      {/* PIN Verification Modal */}
      <PinVerificationModal
        visible={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={handleConfirmSend}
        title="Authorize Transfer"
        subtitle="Enter your 4-digit PIN to confirm this transfer"
      />
    </ScreenShell>
  );
}