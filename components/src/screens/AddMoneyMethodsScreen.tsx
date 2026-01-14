import React from "react";
import { View, Text, Pressable, Platform, Image } from "react-native";
import ScreenShell from "./../../ScreenShell";
import { styles } from "../../../theme/styles";
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
            {/* <Text style={styles.subtitle}>Convert money from one currency to another</Text> */}
          </View>
        </View>
      <Text style={[styles.muted, { marginTop: 8, fontWeight: "800" }]}>AVAILABLE METHODS</Text>

      <Pressable style={styles.methodCard}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={styles.methodIcon}>
            <Text style={{ fontWeight: "600" }}>INTERAC</Text>
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
          {Platform.OS === "ios" ? (
            <View style={[styles.methodIcon, { backgroundColor: "#EFEFEF" }]}>
              <Text style={{ fontWeight: "600" }}><Image source={require("./../../../assets/images/icons/apple-pay.png")} /></Text>
            </View>
          ) : <View style={[styles.methodIcon, { backgroundColor: "#EFEFEF" }]}>
              <Text style={{ fontWeight: "600" }}><Image source={require("./../../../assets/images/icons/google-pay.png")} /></Text>
            </View>}
          <View style={{ marginLeft: 12, flex: 1 }}>
            {Platform.OS=='ios'? <Text style={styles.methodTitle}>Apple Pay</Text> :
            <Text style={styles.methodTitle}>Google Pay</Text>}
            <Text style={styles.muted}>Pay directly with your Debit card on {Platform.OS=='ios'? 'Apple Pay' : 'Google Pay'}. It should arrive in seconds.</Text>
          </View>
          <Text style={{ fontSize: 18, color: "#9A9A9A" }}>›</Text>
        </View>
      </Pressable>
    </ScreenShell>
  );
}
