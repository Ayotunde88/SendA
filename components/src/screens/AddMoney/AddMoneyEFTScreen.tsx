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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ScreenShell from "../../../../components/ScreenShell";
import { styles } from "../../../../theme/styles";
import { router } from "expo-router";
import {
  fundWithEFT,
  isValidInstitutionNumber,
  isValidTransitNumber,
  isValidAccountNumber,
} from "../../../../api/paysafe";

export default function AddMoneyEFTScreen() {
  const [amount, setAmount] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [institutionNumber, setInstitutionNumber] = useState("");
  const [transitNumber, setTransitNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [userPhone, setUserPhone] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const ph = await AsyncStorage.getItem("user_phone");
        if (ph) setUserPhone(ph);
      } catch {
        // ignore loading phone errors
      }
    })();
  }, []);

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (!accountHolderName.trim()) {
      Alert.alert("Error", "Please enter the account holder name");
      return;
    }

    if (!isValidInstitutionNumber(institutionNumber)) {
      Alert.alert("Error", "Institution number must be 3 digits");
      return;
    }

    if (!isValidTransitNumber(transitNumber)) {
      Alert.alert("Error", "Transit number must be 5 digits");
      return;
    }

    if (!isValidAccountNumber(accountNumber)) {
      Alert.alert("Error", "Account number must be 5–12 digits");
      return;
    }

    setLoading(true);

    try {
      const result = await fundWithEFT({
        amount: parseFloat(amount),
        accountHolderName: accountHolderName.trim(),
        institutionNumber,
        transitNumber,
        accountNumber,
        phone: userPhone,
      });

      if (result.success) {
        Alert.alert(
          "EFT Deposit Initiated",
          `Your deposit of $${amount} CAD has been initiated. It will arrive in 1–3 business days.`,
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        Alert.alert("Error", result.message || "Failed to initiate EFT deposit");
      }
    } catch {
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
              <Text style={styles.title}>Add Money via EFT</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoText}>
              EFT (Electronic Funds Transfer) deposits typically take 1–3 business days to process.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Amount (CAD)</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Bank Account Details</Text>

            <Text style={styles.label}>Account Holder Name</Text>
            <TextInput
              style={styles.input}
              placeholder="John Doe"
              autoCapitalize="words"
              value={accountHolderName}
              onChangeText={setAccountHolderName}
            />

            <Text style={styles.label}>Institution Number (3 digits)</Text>
            <TextInput
              style={styles.input}
              placeholder="001"
              keyboardType="number-pad"
              value={institutionNumber}
              onChangeText={(text) =>
                setInstitutionNumber(text.replace(/\D/g, "").slice(0, 3))
              }
              maxLength={3}
            />

            <Text style={styles.label}>Transit Number (5 digits)</Text>
            <TextInput
              style={styles.input}
              placeholder="12345"
              keyboardType="number-pad"
              value={transitNumber}
              onChangeText={(text) =>
                setTransitNumber(text.replace(/\D/g, "").slice(0, 5))
              }
              maxLength={5}
            />

            <Text style={styles.label}>Account Number (5–12 digits)</Text>
            <TextInput
              style={styles.input}
              placeholder="1234567"
              keyboardType="number-pad"
              value={accountNumber}
              onChangeText={(text) =>
                setAccountNumber(text.replace(/\D/g, "").slice(0, 12))
              }
              maxLength={12}
            />
          </View>

          <Pressable
            style={[
              styles.primaryBtn,
              loading && styles.disabledBigBtn,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>
                Deposit ${amount || "0.00"} CAD
              </Text>
            )}
          </Pressable>

          <Text style={styles.secureText}>
            🔒 Your bank details are secured by Paysafe
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

