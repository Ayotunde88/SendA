import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Checkbox from "expo-checkbox";
import { router } from "expo-router";

import ScreenShell from "../../ScreenShell";
import { styles } from "../../../theme/styles";
import { COLORS } from "../../../theme/colors";
import CountryDropdown from "../../../components/CountryDropdown";
import { api, checkPhoneExists } from "../../../api/config";

interface Country {
  code: string;
  name: string;
  symbol?: string;
  flag?: string;
  dialCode?: string;
}

export default function GetStartedScreen() {
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<Country | null>(null);
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const digitsOnly = useMemo(() => phone.replace(/\D/g, ""), [phone]);

  const fullPhone = useMemo(() => {
    if (!country) return "";
    // ensure dialCode already includes "+"
    return `${country.dialCode}${digitsOnly}`;
  }, [country, digitsOnly]);

  const isValidPhone = digitsOnly.length >= 7;
  const canContinue = !!country && isValidPhone && termsAccepted && !loading;

  const handleContinue = async () => {
    if (!canContinue) return;

    setLoading(true);
    try {
      // 1) check if phone exists
      const checkResult = await checkPhoneExists(fullPhone);

      if (checkResult?.exists) {
        Alert.alert(
          "Account Exists",
          checkResult?.message ||
            "This phone number is already registered. Please sign in instead."
        );
        return;
      }

      // 2) send OTP
      const result = await api.sendOtp(fullPhone);

      if (result?.success) {
        await AsyncStorage.setItem("user_phone", fullPhone);
        await AsyncStorage.setItem("user_country_code", country.code);
        await AsyncStorage.setItem("user_country_name", country.name);
        await AsyncStorage.setItem("user_country_flag", country.flag ?? "");

        router.push({
          pathname: "/verifynumber",
          params: {
            phone: fullPhone,
            requestId: result.request_id || result.requestId || "",
          },
        });
      } else {
        Alert.alert("Error", result?.message || "Failed to send OTP");
      }
    } catch (e) {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell>
      <View style={styles.getHelpPillWrap}>
        <Pressable style={styles.getHelpPill}>
          <Text style={{ color: COLORS.green, fontWeight: "800" }}>Get help</Text>
        </Pressable>
      </View>

      <Text style={styles.bigTitle}>Let's get started</Text>
      <Text style={[styles.muted, { marginTop: 4 }]}>
        Enter your phone number to set up your account
      </Text>

      <View style={styles.phoneRow}>
        <CountryDropdown value={country} onChange={setCountry} />

        <View style={styles.phoneInputBox}>
          <Text style={{ marginRight: 8, fontWeight: "700" }}>
            {country?.dialCode || ""}
          </Text>

          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={{ flex: 1, fontSize: 16 }}
            placeholder="Phone number"
            placeholderTextColor="#B3B3B3"
          />
        </View>
      </View>

      <Pressable
        onPress={() => setTermsAccepted((prev) => !prev)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: 16,
          marginBottom: 18,
        }}
      >
        <Checkbox
          value={termsAccepted}
          onValueChange={setTermsAccepted}
          color={termsAccepted ? COLORS.green : undefined}
          style={{ marginRight: 10 }}
        />

        <Text style={{ flex: 1 }}>
          Agree to our{" "}
          <Text style={{ color: COLORS.green, fontWeight: "800" }}>Terms of Service</Text>{" "}
          and{" "}
          <Text style={{ color: COLORS.green, fontWeight: "800" }}>Privacy Policy</Text>.
        </Text>
      </Pressable>

      <Pressable
        style={canContinue ? styles.primaryBtn : styles.disabledBigBtn}
        onPress={handleContinue}
        disabled={!canContinue}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text
            style={
              canContinue
                ? styles.primaryBtnText
                : { color: "#B3B3B3", fontWeight: "800", fontSize: 18 }
            }
          >
            Continue
          </Text>
        )}
      </Pressable>

      <Text style={styles.signInRow}>
        Have an account?{" "}
        <Text
          onPress={() => router.push("/login")}
          style={{ color: COLORS.green, fontWeight: "800" }}
        >
          Sign In
        </Text>
      </Text>
    </ScreenShell>
  );
}
