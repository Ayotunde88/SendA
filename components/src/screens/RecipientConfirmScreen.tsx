import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import ScreenShell from "../../../components/ScreenShell";
import type { SavedRecipient } from "./RecipientSelectScreen";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function RecipientConfirmScreen() {
  const params = useLocalSearchParams<{
    destCurrency: "NGN" | "CAD";
    fromWalletId: string;
    fromCurrency: string;
    fromAmount: string;
    toAmount: string;
    rate?: string;
    recipient: string; // JSON
    mode?: "saved" | "new";
  }>();

  const recipient = useMemo(() => {
    try {
      return JSON.parse(params.recipient) as SavedRecipient;
    } catch {
      return null;
    }
  }, [params.recipient]);

  if (!recipient) {
    return (
      <ScreenShell>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text>Recipient not found</Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 10 }}>
            <Text style={{ color: "#16A34A", fontWeight: "800" }}>Go back</Text>
          </Pressable>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <View style={{ flex: 1, backgroundColor: "#00000030" }}>
        {/* sheet */}
        <View
          style={{
            marginTop: "auto",
            backgroundColor: "#fff",
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            paddingHorizontal: 18,
            paddingTop: 14,
            paddingBottom: 26,
          }}
        >
          <Pressable onPress={() => router.back()} style={{ paddingVertical: 4 }}>
            <Text style={{ fontSize: 24 }}>✕</Text>
          </Pressable>

          <View style={{ alignItems: "center", marginTop: 10 }}>
            <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: "#3B2A12", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900" }}>{getInitials(recipient.accountName)}</Text>
            </View>

            <Text style={{ marginTop: 18, fontSize: 18, fontWeight: "900" }}>
              Confirm recipient details
            </Text>

            <View
              style={{
                marginTop: 16,
                width: "100%",
                borderRadius: 14,
                backgroundColor: "#F5F5F5",
                paddingVertical: 14,
                paddingHorizontal: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "900", textAlign: "center" }}>
                {recipient.accountName}
              </Text>
              <Text style={{ marginTop: 6, color: "#6B7280", fontWeight: "700" }}>
                {recipient.bankName}, {recipient.accountNumber}
              </Text>
            </View>

            <Text style={{ marginTop: 18, textAlign: "center", color: "#6B7280", fontWeight: "700" }}>
              Please confirm the recipient's details before you continue
            </Text>

            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/transferconfirm",
                  params: {
                    ...params,
                  },
                } as any)
              }
              style={{
                marginTop: 18,
                width: "100%",
                height: 56,
                borderRadius: 28,
                backgroundColor: "#059669",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "900" }}>Continue</Text>
            </Pressable>

            <Pressable
              onPress={() => router.back()}
              style={{
                marginTop: 12,
                width: "100%",
                height: 56,
                borderRadius: 28,
                borderWidth: 2,
                borderColor: "#059669",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#059669", fontSize: 16, fontWeight: "900" }}>Edit details</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScreenShell>
  );
}
