import React from "react";
import { View, Text, Pressable } from "react-native";
import ScreenShell from "./../../ScreenShell";
import { styles } from "../../../theme/styles";
import { router } from "expo-router";

export default function AddMoneyMethodsScreen() {
  return (
    <ScreenShell>
        <View style={styles.simpleHeader}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
            </Pressable>
            <View style={{ flex: 1 }} />
        </View>
      <Text style={[styles.bigTitle, { marginTop: 6 }]}>Add money from</Text>
      <Text style={[styles.muted, { marginTop: 8, fontWeight: "800" }]}>AVAILABLE METHODS</Text>

      <Pressable style={styles.methodCard}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={styles.methodIcon}>
            <Text style={{ fontWeight: "900" }}>INTERAC</Text>
          </View>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.methodTitle}>INTERAC e-Transfer®</Text>
            <Text style={styles.muted}>Deposit money with your linked INTERAC email from your bank.</Text>
          </View>
          <Text style={{ fontSize: 18, color: "#9A9A9A" }}>›</Text>
        </View>
      </Pressable>

      <Pressable style={styles.methodCard}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={[styles.methodIcon, { backgroundColor: "#EFEFEF" }]}>
            <Text style={{ fontWeight: "900" }}>Pay</Text>
          </View>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.methodTitle}>Apple Pay</Text>
            <Text style={styles.muted}>Pay directly with your Debit card on Apple Pay. It should arrive in seconds.</Text>
          </View>
          <Text style={{ fontSize: 18, color: "#9A9A9A" }}>›</Text>
        </View>
      </Pressable>
    </ScreenShell>
  );
}
