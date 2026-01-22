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
import { fundWithCard } from "../../../../api/paysafe";

export default function AddMoneyCardScreen() {
  const [amount, setAmount] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [loading, setLoading] = useState(false);
  
  // User info for linking transaction
  const [userPhone, setUserPhone] = useState("");
  const [userEmail, setUserEmail] = useState("");

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
          if (userInfo.email) setUserEmail(userInfo.email);
          // Pre-fill cardholder name if available
          const fullName = [userInfo.firstName || userInfo.first_name, userInfo.lastName || userInfo.last_name]
            .filter(Boolean).join(" ").trim();
          if (fullName && !cardholderName) setCardholderName(fullName);
        } catch (e) {
          console.error("[AddMoneyCard] Failed to parse user_info:", e);
        }
      }
    };
    loadUserInfo();
  }, []);

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, "").slice(0, 16);
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, "$1 ");
    return formatted;
  };

  const handleSubmit = async () => {
    if (!userPhone) {
      Alert.alert("Error", "User session not found. Please log in again.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }
    if (cardNumber.replace(/\s/g, "").length < 15) {
      Alert.alert("Error", "Please enter a valid card number");
      return;
    }
    if (!expiryMonth || !expiryYear) {
      Alert.alert("Error", "Please enter card expiry date");
      return;
    }
    if (cvv.length < 3) {
      Alert.alert("Error", "Please enter a valid CVV");
      return;
    }
    if (!cardholderName.trim()) {
      Alert.alert("Error", "Please enter the cardholder name");
      return;
    }

    setLoading(true);
    try {
      const result = await fundWithCard({
        amount: parseFloat(amount),
        cardNumber: cardNumber.replace(/\s/g, ""),
        expiryMonth: parseInt(expiryMonth),
        expiryYear: parseInt(expiryYear),
        cvv,
        cardholderName: cardholderName.trim(),
        phone: userPhone,
        email: userEmail || undefined,
      });

      if (result.success) {
        Alert.alert(
          "Success",
          `$${amount} has been added to your account.`,
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        Alert.alert("Error", result.message || "Failed to process payment");
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
              <Text style={styles.title}>Add Money with Card</Text>
            </View>
          </View>

          <View style={cardstyles.card}>
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
            <Text style={styles.sectionTitle}>Card Details</Text>

            <Text style={styles.label}>Card Number</Text>
            <TextInput
              style={styles.input}
              placeholder="1234 5678 9012 3456"
              keyboardType="number-pad"
              value={cardNumber}
              onChangeText={(text) => setCardNumber(formatCardNumber(text))}
              maxLength={19}
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Expiry Month</Text>
                <TextInput
                  style={styles.input}
                  placeholder="MM"
                  keyboardType="number-pad"
                  value={expiryMonth}
                  onChangeText={(text) => setExpiryMonth(text.slice(0, 2))}
                  maxLength={2}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.label}>Expiry Year</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YY"
                  keyboardType="number-pad"
                  value={expiryYear}
                  onChangeText={(text) => setExpiryYear(text.slice(0, 2))}
                  maxLength={2}
                />
              </View>
            </View>

            <Text style={styles.label}>CVV</Text>
            <TextInput
              style={[styles.input, { width: 100 }]}
              placeholder="123"
              keyboardType="number-pad"
              secureTextEntry
              value={cvv}
              onChangeText={(text) => setCvv(text.slice(0, 4))}
              maxLength={4}
            />

            <Text style={styles.label}>Cardholder Name</Text>
            <TextInput
              style={styles.input}
              placeholder="John Doe"
              autoCapitalize="words"
              value={cardholderName}
              onChangeText={setCardholderName}
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
                Add ${amount || "0.00"} CAD
              </Text>
            )}
          </Pressable>

          <Text style={styles.secureText}>
            🔒 Your payment is secured by Paysafe
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const cardstyles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
});
