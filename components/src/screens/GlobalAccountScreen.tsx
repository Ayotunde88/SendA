import React, { useState } from "react";
import { View, Text, Image, Pressable, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { styles } from "../../../theme/styles";
import { completeOnboarding } from "../../../api/config";

export default function GlobalAccountScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const phone = await AsyncStorage.getItem("user_phone");
      if (!phone) {
        Alert.alert("Error", "Phone number not found");
        return;
      }
      const result = await completeOnboarding(phone);
      if (result.success) {
        // Save auth token for future API calls
        if (result.token) {
          await AsyncStorage.setItem("auth_token", result.token);
        }
        // Navigate to home screen
        router.replace("/");
      } else {
        Alert.alert("Error", result.message || "Failed to complete onboarding");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} bounces={false}>
        {/* Top hero image */}
        <View style={styles.globalHeroWrap}>
          {/* <Image
            source={require("../../../assets/images/global-account-hero.png")}
            style={styles.globalHero}
            resizeMode="cover"
          /> */}
        </View>

        {/* White content area */}
        <View style={styles.globalCard}>
          <Text style={styles.globalTitle}>Get Paid from Anywhere!</Text>

          <View style={styles.globalRow}>
            <Text style={styles.globalIcon}>🪐</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.globalRowTitle}>Collect Payments Globally</Text>
              <Text style={styles.globalRowSub}>
                Receive salaries or payments in USD, CAD, GBP, or EUR—fast and hassle-free
              </Text>
            </View>
          </View>

          <View style={styles.globalRow}>
            <Text style={styles.globalIcon}>🔁</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.globalRowTitle}>Swap Currencies Instantly</Text>
              <Text style={styles.globalRowSub}>
                Convert between foreign and local currencies with great rates.
              </Text>
            </View>
          </View>

          <View style={styles.globalRow}>
            <Text style={styles.globalIcon}>💰</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.globalRowTitle}>Hold & Manage Multiple Currencies:</Text>
              <Text style={styles.globalRowSub}>
                Keep your money in USD, CAD, GBP, or EUR and spend when you're ready.
              </Text>
            </View>
          </View>

          <View style={styles.globalRow}>
            <Text style={styles.globalIcon}>🛡️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.globalRowTitle}>Safe & Effortless:</Text>
              <Text style={styles.globalRowSub}>
                Bank-level security with a smooth, easy-to-use experience.
              </Text>
            </View>
          </View>

          <Pressable
            style={[styles.primaryBtn, { marginTop: 18, opacity: loading ? 0.6 : 1 }]}
            onPress={handleVerify}
            disabled={loading}
          >
            <Text style={styles.primaryBtnText}>
              {loading ? "Completing..." : "Verify your account"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
