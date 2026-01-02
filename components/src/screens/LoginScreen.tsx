import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";

import ScreenShell from "./../../ScreenShell";
import CountryDropdown, { Country } from "../../../components/CountryDropdown";
import { styles } from "../../../theme/styles";
import { COLORS } from "../../../theme/colors";
import { api, checkPhoneExists, login } from "../../../api/config";

export default function LoginScreen() {
  const router = useRouter();

  const [country, setCountry] = useState<Country | null>(null);
  const [phone, setPhone] = useState("6138488385");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const canLogin = useMemo(() => {
    return phone.trim().length >= 6 && password.trim().length >= 4 && !loading;
  }, [phone, password, loading]);

  const handleLogin = async () => {
    if (!canLogin) return;

    const fullPhone = `${country?.dialCode ?? ""}${phone.trim()}`;
    setLoading(true);

    try {
      // Step 1: Check if user exists
      const checkResult = await checkPhoneExists(fullPhone);

      if (!checkResult.exists) {
        Alert.alert(
          "Account Not Found",
          "This phone number is not registered. Would you like to sign up?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Sign Up", onPress: () => router.push("/getstarted") },
          ]
        );
        setLoading(false);
        return;
      }

      // Step 2: Proceed with login
      const loginResult = await login(fullPhone, password);

      if (!loginResult.success) {
        Alert.alert("Login Failed", loginResult.message || "Invalid credentials");
        setLoading(false);
        return;
      }

      // Success - navigate to main app
      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell>
      <Text style={styles.bigTitle}>Login to your account</Text>

      {/* Phone number */}
      <Text style={[styles.fieldLabel, { marginTop: 22 }]}>Phone number</Text>

      <View style={styles.phoneRow}>
        <CountryDropdown value={country} onChange={setCountry} />

        <View style={styles.phoneInputBox}>
          <Text style={styles.dialCodeText}>{country?.dialCode ?? ""}</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={styles.phoneInput}
            placeholder="Phone number"
            placeholderTextColor="#9B9B9B"
          />
        </View>
      </View>

      {/* Password */}
      <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Password</Text>

      <View style={styles.passwordBox}>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPass}
          style={styles.passwordInput}
          placeholder=""
          placeholderTextColor="#9B9B9B"
        />

        <Pressable onPress={() => setShowPass((v) => !v)} style={styles.eyeBtn}>
          <Text style={styles.eyeIcon}>👁️</Text>
        </Pressable>
      </View>

      {/* Recover */}
      <View style={styles.recoverRow}>
        <Text style={styles.muted}>Trouble logging in? </Text>
        <Pressable onPress={() => router.push("/reset-password")}>
          <Text style={styles.recoverLink}>Recover your account</Text>
        </Pressable>
      </View>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Login button */}
      <Pressable
        style={canLogin ? styles.primaryBtn : styles.disabledBigBtn}
        onPress={handleLogin}
      >
        <Text style={canLogin ? styles.bigBtnText : styles.disabledBigBtnText}>
          {loading ? "Logging in..." : "Log in"}
        </Text>
      </Pressable>

      {/* Bottom sign up */}
      <View style={styles.bottomAuthRow}>
        <Text style={styles.muted}>Don't have an account? </Text>
        <Pressable onPress={() => router.push("/getstarted")}>
          <Text style={styles.authGreenLink}>Sign up</Text>
        </Pressable>
      </View>
    </ScreenShell>
  );
}
