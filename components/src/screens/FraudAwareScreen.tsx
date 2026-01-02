import React from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { COLORS } from "../../../theme/colors";
import { styles } from "../../../theme/styles";

export default function FraudAwareScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={styles.flowHeader}>
        <Pressable style={styles.iconBtn}>
          <Text style={styles.iconBtnText}>←</Text>
        </Pressable>

        <Text style={styles.flowHeaderTitle}>Stay fraud aware</Text>

        <View style={{ width: 38 }} />
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
        <View style={styles.warnTriangle}>
          <Text style={{ fontSize: 22 }}>❗</Text>
        </View>

        <Text style={styles.warnTitle}>Could someone be trying{"\n"}to scam you?</Text>

        <View style={styles.warnCard}>
          <Text style={styles.warnStop}>Stop if:</Text>

          {[
            "You're told your account is at risk and asked to send money quickly.",
            "The recipient has offered you a deal which sounds too good to be true",
            "You haven't confirmed who you're sending money to. If you met them online or were given new account details, call to verify. Fraudsters often pose as loved ones.",
            "You found an investment online and haven't confirmed who's behind it. Investment scams are on the rise.",
          ].map((t, i) => (
            <View key={i} style={styles.warnRow}>
              <Text style={styles.warnX}>✕</Text>
              <Text style={styles.warnText}>{t}</Text>
            </View>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Text style={{ fontWeight: "800", color: COLORS.muted }}>
            ⓘ Only continue if you understand this and are sure you are acting of your own free will.
          </Text>
        </View>

        <Pressable style={[styles.primaryBtn, { marginTop: 14 }]} onPress={() => router.push("/pin")}>
          <Text style={styles.primaryBtnText}>Continue</Text>
        </Pressable>

        <Pressable style={[styles.outlineBtn, { marginTop: 12 }]}>
          <Text style={styles.outlineBtnText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}
