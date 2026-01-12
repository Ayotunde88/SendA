import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, Alert, Modal } from "react-native";
import { useRouter } from "expo-router";

import ScreenShell from "./../../ScreenShell";
import CountryDropdown, { Country } from "../../../components/CountryDropdown";
import { styles } from "../../../theme/styles";
import { COLORS } from "../../../theme/colors";
import { api, checkPhoneExists, login } from "../../../api/config";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen() {
  const router = useRouter();

  const [country, setCountry] = useState<Country | null>(null);
  const [phone, setPhone] = useState("6138488385");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suspendedModalVisible, setSuspendedModalVisible] = useState(false);

  const canLogin = useMemo(() => {
    return phone.trim().length >= 6 && password.trim().length >= 4 && !loading;
  }, [phone, password, loading]);

  const handleLogin = async () => {
    if (!canLogin) return;

    const fullPhone = `${country?.dialCode ?? ""}${phone.trim()}`;
    setLoading(true);

    try {
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

      const loginResult = await login(fullPhone, password);

      // Check if account is suspended
      if (loginResult.user?.status === 'suspended' || loginResult.suspended) {
        setSuspendedModalVisible(true);
        setLoading(false);
        return;
      }

      if (!loginResult.success) {
        Alert.alert("Login Failed", loginResult.message || "Invalid credentials");
        setLoading(false);
        return;
      }

      await AsyncStorage.setItem("user_phone", fullPhone);
      await AsyncStorage.setItem("auth_token", loginResult.auth_token || loginResult.accessToken || loginResult.token);

      if (loginResult.user) {
        await AsyncStorage.setItem("user_info", JSON.stringify(loginResult.user));
      }

      router.replace("/(tabs)");
    } catch (error: any) {
      // Check if error indicates suspension
      if (error.message?.toLowerCase().includes('suspended')) {
        setSuspendedModalVisible(true);
      } else {
        Alert.alert("Error", error.message || "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell>
      {/* Suspended Account Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={suspendedModalVisible}
        onRequestClose={() => setSuspendedModalVisible(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 24,
            marginHorizontal: 32,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}>
            <Text style={{
              fontSize: 48,
              marginBottom: 16,
            }}>🚫</Text>
            <Text style={{
              fontSize: 20,
              fontWeight: '700',
              color: '#1a1a1a',
              textAlign: 'center',
              marginBottom: 12,
            }}>Account Suspended</Text>
            <Text style={{
              fontSize: 15,
              color: '#666',
              textAlign: 'center',
              lineHeight: 22,
              marginBottom: 24,
            }}>
              Your account has been suspended. Please contact support for assistance.
            </Text>
            <Pressable
              style={{
                backgroundColor: COLORS.primary,
                paddingVertical: 14,
                paddingHorizontal: 32,
                borderRadius: 12,
                width: '100%',
              }}
              onPress={() => setSuspendedModalVisible(false)}
            >
              <Text style={{
                color: '#fff',
                fontSize: 16,
                fontWeight: '600',
                textAlign: 'center',
              }}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Text style={styles.bigTitle}>Login to your account</Text>

      {/* ... rest of the existing JSX remains the same ... */}
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

      <View style={styles.recoverRow}>
        <Text style={styles.muted}>Trouble logging in? </Text>
        <Pressable onPress={() => router.push("/reset-password")}>
          <Text style={styles.recoverLink}>Recover your account</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }} />

      <Pressable
        style={canLogin ? styles.primaryBtn : styles.disabledBigBtn}
        onPress={handleLogin}
      >
        <Text style={canLogin ? styles.bigBtnText : styles.disabledBigBtnText}>
          {loading ? "Logging in..." : "Log in"}
        </Text>
      </Pressable>

      <View style={styles.bottomAuthRow}>
        <Text style={styles.muted}>Don't have an account? </Text>
        <Pressable onPress={() => router.push("/getstarted")}>
          <Text style={styles.authGreenLink}>Sign up</Text>
        </Pressable>
      </View>
    </ScreenShell>
  );
}
