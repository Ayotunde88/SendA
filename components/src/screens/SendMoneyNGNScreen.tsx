import React, { useState } from "react";
import { View, Text, TextInput } from "react-native";
import ScreenShell from "./../../ScreenShell";
import CurrencyPill from "./../../CurrencyPill";
import PrimaryButton from "./../../PrimaryButton";
import { styles } from "../../../theme/styles";
// import { useRouter } from "@/.expo/types/router";
import { useRouter } from "expo-router";


export default function SendMoneyNGNScreen() {
  const [amount, setAmount] = useState("1,000");
const router = useRouter();
  return (
    <ScreenShell>
      <View style={styles.sendCard}>
        <Text style={styles.fieldLabel}>You send</Text>
        <View style={styles.amountRow}>
          <TextInput value={amount} onChangeText={setAmount} keyboardType="number-pad" style={styles.amountInput} />
          <CurrencyPill flag="🇳🇬" code="NGN" onPress={() => {}} />
        </View>

        <View style={styles.ratePill}>
          <Text style={{ color: "#1E7E52", fontWeight: "800" }}>📈 1 NGN = 1 NGN</Text>
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Recipient gets</Text>
        <View style={styles.amountRow}>
          <TextInput value={amount} onChangeText={setAmount} keyboardType="number-pad" style={styles.amountInput} />
          <CurrencyPill flag="🇳🇬" code="NGN" onPress={() => {}} />
        </View>

        <View style={styles.payWithCard}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.flag}>🇳🇬</Text>
            <View style={{ marginLeft: 10 }}>
              <Text style={{ fontWeight: "800" }}>NGN balance</Text>
              <Text style={styles.muted}>11,795.00 NGN available</Text>
            </View>
          </View>

          <View style={styles.changeBtn}>
            <Text style={{ color: "#fff", fontWeight: "900" }}>Change</Text>
          </View>
        </View>

        <View style={styles.feesRow}>
          <Text style={styles.muted}>Transfer fees</Text>
          <Text style={styles.muted}>0.00 NGN</Text>
        </View>
        <View style={styles.feesRow}>
          <Text style={styles.muted}>We'll convert</Text>
          <Text style={styles.muted}>1,000.00 NGN</Text>
        </View>
      </View>

      <PrimaryButton title="Continue" onPress={() => router.push("/recipients")} />
    </ScreenShell>
  );
}
