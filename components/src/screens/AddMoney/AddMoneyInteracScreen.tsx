import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ScreenShell from "../../../../components/ScreenShell";
import { styles } from "../../../../theme/styles";
import { router } from "expo-router";
import { submitInteracDeposit } from "../../../../api/paysafe";
import CountryFlag from "../../../../components/CountryFlag";
export default function AddMoneyInteracScreen() {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  
  // User info
  const [userPhone, setUserPhone] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const loadUserInfo = async () => {
      const [phone, storedUser] = await Promise.all([
        AsyncStorage.getItem("user_phone"),
        AsyncStorage.getItem("user_info"),
      ]);
      if (phone) setUserPhone(phone);
      if (storedUser) {
        try {
          const userInfo = JSON.parse(storedUser);
          if (userInfo.email) {
            setUserEmail(userInfo.email);
          }
          const fullName = [userInfo.firstName || userInfo.first_name, userInfo.lastName || userInfo.last_name]
            .filter(Boolean).join(" ").trim();
          if (fullName) setUserName(fullName);
        } catch (e) {
          console.error("[AddMoneyInterac] Failed to parse user_info:", e);
        }
      }
    };
    loadUserInfo();
  }, []);

  const handleDeposit = async () => {
    if (!userPhone) {
      Alert.alert("Error", "User session not found. Please log in again.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please enter the amount to deposit");
      return;
    }
    if (!userEmail.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const result = await submitInteracDeposit({
        amount: parseFloat(amount),
        phone: userPhone,
        email: userEmail.trim(),
        name: userName.trim() || "Customer",
      });

      if (result.success) {
        // If there's a redirect URL, open it for user to complete in their banking app
        if (result.redirectUrl) {
          Alert.alert(
            "Complete Transfer",
            "You'll be redirected to your banking app to complete the Interac e-Transfer.",
            [
              {
                text: "Continue",
                onPress: () => {
                  Linking.openURL(result.redirectUrl!).catch(() => {
                    Alert.alert(
                      "Deposit Initiated",
                      `Your Interac deposit of $${amount} CAD has been initiated. Complete the transfer via your banking app.`,
                      [{ text: "OK", onPress: () => router.back() }]
                    );
                  });
                  router.back();
                },
              },
            ]
          );
        } else {
          Alert.alert(
            "Deposit Initiated",
            result.message || `Your Interac deposit of $${amount} CAD has been initiated. Complete the transfer via your banking app.`,
            [{ text: "OK", onPress: () => router.back() }]
          );
        }
      } else {
        Alert.alert("Error", result.message || "Failed to initiate deposit");
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>INTERAC e-Transfer®</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>🇨🇦</Text>
            <CountryFlag countryCode="CA" size="md" style={{ marginRight: 12 }} />
            <Text style={styles.infoText}>
              Instant deposits from your Canadian bank account. You'll complete the transfer in your banking app.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>How it works</Text>
            
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Enter amount & confirm</Text>
                <Text style={styles.stepDesc}>Specify how much CAD you want to deposit</Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Complete in your bank</Text>
                <Text style={styles.stepDesc}>You'll be redirected to authorize the transfer</Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Funds credited instantly</Text>
                <Text style={styles.stepDesc}>Your wallet is updated once transfer completes</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Amount to Deposit (CAD)</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            <Text style={styles.label}>Your Email</Text>
            <TextInput
              style={styles.input}
              placeholder="email@example.com"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              value={userEmail}
              onChangeText={setUserEmail}
            />
            <Text style={styles.hint}>
              This email will receive the Interac transfer request
            </Text>
          </View>

          <Pressable
            style={[
              styles.primaryBtn,
              loading && styles.disabledBigBtn,
            ]}
            onPress={handleDeposit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>
                Deposit via Interac
              </Text>
            )}
          </Pressable>

          <Text style={styles.secureText}>
            🔒 Secured by Paysafe • Interac e-Transfer®
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}