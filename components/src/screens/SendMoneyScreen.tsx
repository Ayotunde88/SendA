import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import ScreenShell from "./../../ScreenShell";
import CurrencyPill from "./../../CurrencyPill";
import { styles } from "../../../theme/styles";
import { COLORS } from "../../../theme/colors";

export default function SendMoneyScreen() {
  const [send, setSend] = useState("");
  const [receive, setReceive] = useState("");

  return (
    <ScreenShell>
      <View style={styles.noticePill}>
        <Text style={{ color: COLORS.muted }}>
          🪙 No rewards when sending below <Text style={{ fontWeight: "800" }}>50.00 CAD</Text>
        </Text>
      </View>

      <View style={styles.sendCard}>
        <Text style={styles.fieldLabel}>You send</Text>
        <View style={styles.amountRow}>
          <TextInput
            value={send}
            onChangeText={setSend}
            placeholder="0.00"
            keyboardType="decimal-pad"
            placeholderTextColor="#BDBDBD"
            style={styles.amountInput}
          />
          <CurrencyPill flag="🇨🇦" code="CAD" onPress={() => {}} />
        </View>

        <View style={styles.ratePill}>
          <Text style={{ color: COLORS.greenDark, fontWeight: "800" }}>📈 1 CAD = 1061 NGN</Text>
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Recipient gets</Text>
        <View style={styles.amountRow}>
          <TextInput
            value={receive}
            onChangeText={setReceive}
            placeholder="0.00"
            keyboardType="decimal-pad"
            placeholderTextColor="#BDBDBD"
            style={styles.amountInput}
          />
          <CurrencyPill flag="🇳🇬" code="NGN" onPress={() => {}} />
        </View>
      </View>

      <View style={styles.payWithCard}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={styles.flag}>🇨🇦</Text>
          <View style={{ marginLeft: 10 }}>
            <Text style={{ fontWeight: "800" }}>CAD balance</Text>
            <Text style={styles.muted}>0.00 CAD available</Text>
          </View>
        </View>

        <Pressable style={styles.changeBtn}>
          <Text style={{ color: "#fff", fontWeight: "900" }}>Change</Text>
        </Pressable>
      </View>

      <Pressable style={styles.disabledContinue}>
        <Text style={{ color: "#AFAFAF", fontWeight: "800" }}>Continue</Text>
      </Pressable>
      <Text style={styles.bottomHint}>ⓘ Enter amount to continue</Text>
    </ScreenShell>
  );
}
