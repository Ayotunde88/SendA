import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import ScreenShell from "../../../../components/ScreenShell";
import { styles } from "../../../../theme/styles";
import { router } from "expo-router";

export default function AddMoneyMethodsScreen() {
  return (
    <ScreenShell>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Add Money</Text>
        </View>
      </View>

      <Text style={[styles.muted, { marginTop: 8, fontWeight: "800" }]}>
        AVAILABLE METHODS
      </Text>

      {/* Credit/Debit Card - Paysafe */}
      <Pressable 
        style={styles.methodCard}
        onPress={() => router.push('/addmoneycard')}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={[localStyles.methodIcon, { backgroundColor: "#4F46E5" }]}>
            <Text style={{ fontSize: 20 }}>💳</Text>
          </View>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.methodTitle}>Credit / Debit Card</Text>
            <Text style={styles.muted}>
              Add money instantly using Visa, Mastercard or American Express.
            </Text>
          </View>
          <Text style={{ fontSize: 18, color: "#9A9A9A" }}>›</Text>
        </View>
      </Pressable>

      {/* Interac - For Canadians */}
      <Pressable 
        style={styles.methodCard}
        onPress={() => router.push('/addmoneyinterac')}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={[localStyles.methodIcon, { backgroundColor: "#FFD700" }]}>
            <Text style={{ fontWeight: "700", fontSize: 10, color: "#000" }}>INTERAC</Text>
          </View>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.methodTitle}>INTERAC e-Transfer®</Text>
            <Text style={styles.muted}>
              For Canadians. Deposit money via e-Transfer from your bank.
            </Text>
          </View>
          <Text style={{ fontSize: 18, color: "#9A9A9A" }}>›</Text>
        </View>
      </Pressable>

      {/* EFT Bank Transfer - Worldwide */}
      <Pressable 
        style={styles.methodCard}
        onPress={() => router.push('/addmoneyeft')}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={[localStyles.methodIcon, { backgroundColor: "#16A34A" }]}>
            <Text style={{ fontSize: 20 }}>🏦</Text>
          </View>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.methodTitle}>Bank Transfer (EFT)</Text>
            <Text style={styles.muted}>
              Deposit via bank transfer. Available worldwide. Takes 1-3 business days.
            </Text>
          </View>
          <Text style={{ fontSize: 18, color: "#9A9A9A" }}>›</Text>
        </View>
      </Pressable>
    </ScreenShell>
  );
}

const localStyles = StyleSheet.create({
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});