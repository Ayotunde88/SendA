import React from "react";
import { View, Text, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { COLORS } from "../../../theme/colors";
import { styles } from "../../../theme/styles";

function Header() {
  return (
    <View style={styles.flowHeader}>
      <Pressable style={styles.iconBtn}>
        <Text style={styles.iconBtnText}>←</Text>
      </Pressable>

      <Text style={styles.flowHeaderTitle}>Review details</Text>

      <Pressable style={styles.iconBtn}>
        <Text style={styles.iconBtnText}>?</Text>
      </Pressable>
    </View>
  );
}

export default function ReviewDetailsScreen() {
  const router = useRouter();
  const { name, bank, account } = useLocalSearchParams();

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <Header />

      <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
        <View style={styles.reviewTopIcons}>
          <View style={styles.reviewFlagCircle}>
            <Text>🇳🇬</Text>
          </View>
          <Text style={{ fontWeight: "900", marginHorizontal: 10 }}>→</Text>
          <View style={styles.reviewAvatarSmall}>
            <Text style={{ color: "#fff", fontWeight: "900" }}>AB</Text>
          </View>
        </View>

        <Text style={styles.reviewSmall}>You're sending</Text>
        <Text style={styles.reviewBig}>1,000.00 NGN</Text>
        <Text style={styles.reviewTo}>
          to <Text style={{ fontWeight: "900" }}>{name || "Ayotunde Kehinde Balogun"}</Text>
        </Text>

        <View style={styles.hr} />

        <Text style={styles.reviewSection}>Paying with</Text>
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

        <View style={styles.reviewCard}>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewKey}>Bank name</Text>
            <Text style={styles.reviewVal}>{bank || "Access Bank Nigeria"}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewKey}>Account number</Text>
            <Text style={styles.reviewVal}>{account || "0761010148"}</Text>
          </View>
        </View>

        <View style={styles.reviewCard}>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewKey}>Saved with points</Text>
            <Text style={styles.reviewVal}>0.00 pts</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewKey}>You'll pay</Text>
            <Text style={styles.reviewVal}>1,000.00 NGN</Text>
          </View>

          <View style={styles.reviewDivider} />

          <View style={styles.reviewRow}>
            <Text style={styles.reviewKey}>Transfer fees</Text>
            <Text style={styles.reviewVal}>0.00 NGN</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewKey}>We'll convert</Text>
            <Text style={styles.reviewVal}>1,000.00 NGN</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewKey}>Exchange rate</Text>
            <Text style={styles.reviewVal}>1 NGN = 1 NGN</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewKey}>Recipient gets</Text>
            <Text style={styles.reviewVal}>1,000.00 NGN</Text>
          </View>
        </View>

        <View style={styles.deliveryPill}>
          <Text style={{ color: "#2A2A2A", fontWeight: "800" }}>
            ⚡ Typically delivered within 1 minute
          </Text>
        </View>

        <Pressable style={[styles.primaryBtn, { marginTop: 12 }]} onPress={() => router.push("/fraudaware")}>
          <Text style={styles.primaryBtnText}>Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}
