import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import ScreenShell from "./../../ScreenShell";
import CurrencyPill from "./../../CurrencyPill";
import { styles } from "../../../theme/styles";

export default function ConvertScreen() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  return (
    <ScreenShell>
      <Text style={styles.convertHint}>Convert money from one currency to another</Text>

      <View style={styles.convertBox}>
        <Text style={{ color: "#2E9E6A", fontWeight: "900" }}>You are converting</Text>
        <View style={styles.convertRow}>
          <TextInput
            value={from}
            onChangeText={setFrom}
            placeholder="0.00"
            keyboardType="decimal-pad"
            placeholderTextColor="#BDBDBD"
            style={[styles.amountInput, { fontSize: 28 }]}
          />
          <CurrencyPill flag="🇨🇦" code="CAD" onPress={() => {}} />
        </View>
        <Text style={styles.convertBalance}>Balance: 0.00 CAD</Text>
      </View>

      <View style={styles.convertMid}>
        <Text style={styles.muted}>〰︎</Text>
        <Text style={styles.muted}>1 CAD = 1061.0 NGN</Text>
        <Text style={styles.muted}>⚡ 3–5 minutes</Text>
      </View>

      <View style={styles.convertBox}>
        <Text style={{ color: "#2E9E6A", fontWeight: "900" }}>To</Text>
        <View style={styles.convertRow}>
          <TextInput
            value={to}
            onChangeText={setTo}
            placeholder="0.00"
            keyboardType="decimal-pad"
            placeholderTextColor="#BDBDBD"
            style={[styles.amountInput, { fontSize: 28 }]}
          />
          <CurrencyPill flag="🇳🇬" code="NGN" onPress={() => {}} />
        </View>
        <Text style={styles.convertBalance}>Balance: 11,795.00 NGN</Text>
      </View>

      <Pressable style={styles.disabledBigBtn}>
        <Text style={{ color: "#B3B3B3", fontWeight: "900", fontSize: 18 }}>Convert</Text>
      </Pressable>
    </ScreenShell>
  );
}
