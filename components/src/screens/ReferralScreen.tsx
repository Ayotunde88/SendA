import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Image, Alert } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { styles } from "../../../theme/styles";
import { applyReferralCode } from "../../../api/config";

export default function ReferralScreen() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleApplyCode = async () => {
    if (!code.trim() || loading) return;
    setLoading(true);
    try {
      const phone = await AsyncStorage.getItem("user_phone");
      if (!phone) {
        Alert.alert("Error", "Phone number not found");
        return;
      }
      const result = await applyReferralCode(phone, code.trim());
      if (result.success) {
        Alert.alert("Success", "Referral code applied!", [
          { text: "OK", onPress: () => router.push("/globalaccount") },
        ]);
      } else {
        Alert.alert("Error", result.message || "Invalid referral code");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.push("/globalaccount");
  };

  return (
    <View style={styles.shell}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>✕</Text>
        </Pressable>
        <View />
      </View>

      <Text style={styles.welcomeTiny}>WELCOME 🎉</Text>

      <Text style={[styles.bigTitle, { marginTop: 10 }]}>
        Do you have a referral code?
      </Text>

      <Text style={[styles.muted, { marginTop: 8, lineHeight: 22 }]}>
        Enter your referral/invite code to earn cashback on your first qualifying transaction.
      </Text>

      <Text style={[styles.label, { marginTop: 18 }]}>Referral Code (Optional)</Text>
      <View style={styles.inputBox}>
        <TextInput
          value={code}
          onChangeText={setCode}
          style={styles.input}
          placeholder="xxxxxxx"
          placeholderTextColor="#B8B8B8"
          autoCapitalize="characters"
        />
      </View>

      <Pressable
        style={[
          styles.primaryBtn,
          { marginTop: 18, opacity: loading || !code.trim() ? 0.6 : 1 },
        ]}
        onPress={handleApplyCode}
        disabled={loading || !code.trim()}
      >
        <Text style={styles.primaryBtnText}>
          {loading ? "Applying..." : "Apply Code"}
        </Text>
      </Pressable>

      <Pressable style={[styles.outlineBtn, { marginTop: 14 }]} onPress={handleSkip}>
        <Text style={styles.outlineBtnText}>I don't have a code</Text>
      </Pressable>

      <View style={{ flex: 1 }} />

      {/* Illustration - put your image here */}
      {/* <Image
        source={require("../../../assets/images/referral-illustration.png")}
        style={styles.referralIllustration}
        resizeMode="contain"
      /> */}
    </View>
  );
}
