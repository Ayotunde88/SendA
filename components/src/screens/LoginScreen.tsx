import React, { useMemo, useState, useCallback } from "react";
import { View, Text, TextInput, Pressable, Alert, Modal, ScrollView, ActivityIndicator, Platform } from "react-native";
import { useRouter } from "expo-router";

import ScreenShell from "./../../ScreenShell";
import CountryDropdown, { Country } from "../../../components/CountryDropdown";
import { styles } from "../../../theme/styles";
import { COLORS } from "../../../theme/colors";
import { api, checkPhoneExists, login } from "../../../api/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { Ionicons } from "@expo/vector-icons";

// Update this to your actual API base URL
const API_BASE_URL = Platform.OS === "android"
    ? process.env.EXPO_PUBLIC_API_BASE_URL_ANDROID
    : process.env.EXPO_PUBLIC_API_BASE_URL_IOS;;

export default function LoginScreen() {
  const router = useRouter();

  const [country, setCountry] = useState<Country | null>(null);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioType, setBioType] = useState<string | null>(null);
  const [suspendedModalVisible, setSuspendedModalVisible] = useState(false);

  // Legal document modal state
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalModalTitle, setLegalModalTitle] = useState("");
  const [legalSections, setLegalSections] = useState<any[]>([]);
  const [legalMeta, setLegalMeta] = useState<any>({});
  const [legalLoading, setLegalLoading] = useState(false);

  const canLogin = useMemo(() => {
    return phone.trim().length >= 6 && password.trim().length >= 4 && !loading;
  }, [phone, password, loading]);

  // Fetch and show legal document
  const showLegalDocument = useCallback(async (docType: "terms" | "privacy") => {
    setLegalLoading(true);
    setLegalModalVisible(true);
    setLegalModalTitle(docType === "terms" ? "Terms and Conditions" : "Privacy Policy");
    setLegalSections([]);

    try {
      const res = await fetch(`${API_BASE_URL}/legal/${docType}`);
      const data = await res.json();

      if (data.success && data.document) {
        setLegalSections(data.document.sections);
        setLegalMeta(data.document.meta || {});
        setLegalModalTitle(data.document.title || legalModalTitle);
      }
    } catch (e) {
      console.error("Failed to load legal document:", e);
      Alert.alert("Error", "Could not load document. Please try again.");
      setLegalModalVisible(false);
    } finally {
      setLegalLoading(false);
    }
  }, []);

  const replacePlaceholders = (text: string) => {
    return text
      .replace(/\{\{COMPANY\}\}/g, legalMeta.companyName || "Exxsend")
      .replace(/\{\{WEBSITE\}\}/g, legalMeta.website || "www.exxsend.com")
      .replace(/\{\{EMAIL\}\}/g, legalMeta.supportEmail || "support@exxsend.com");
  };

  const handleLogin = async () => {
    // ... keep existing handleLogin code exactly as-is ...
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
      if (error.message?.toLowerCase().includes('suspended')) {
        setSuspendedModalVisible(true);
      } else {
        Alert.alert("Error", error.message || "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    // ... keep existing biometric code exactly as-is ...
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Login with ${bioType}`,
        fallbackLabel: "Use password",
      });

      if (!result.success) return;

      const savedPhone = await AsyncStorage.getItem("user_phone");
      const savedToken = await AsyncStorage.getItem("auth_token");

      if (!savedPhone || !savedToken) {
        Alert.alert("Session expired. Please login with password.");
        return;
      }

      router.replace("/(tabs)");
    } catch {
      Alert.alert("Biometric authentication failed");
    }
  };

  return (
    <ScreenShell>
      {/* Suspended Account Modal - keep existing code */}
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
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🚫</Text>
            <Text style={{
              fontSize: 20, fontWeight: '700', color: '#1a1a1a',
              textAlign: 'center', marginBottom: 12,
            }}>Account Suspended</Text>
            <Text style={{
              fontSize: 15, color: '#666', textAlign: 'center',
              lineHeight: 22, marginBottom: 24,
            }}>
              Your account has been suspended. Please contact support for assistance.
            </Text>
            <Pressable
              style={{
                backgroundColor: COLORS.primary, paddingVertical: 14,
                paddingHorizontal: 32, borderRadius: 12, width: '100%',
              }}
              onPress={() => setSuspendedModalVisible(false)}
            >
              <Text style={{
                color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center',
              }}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ===== LEGAL DOCUMENT MODAL ===== */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={legalModalVisible}
        onRequestClose={() => setLegalModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          {/* Modal Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingTop: 56,
            paddingHorizontal: 20,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#eee',
            backgroundColor: '#fafafa',
          }}>
            <Pressable
              onPress={() => setLegalModalVisible(false)}
              style={{ padding: 4, marginRight: 12 }}
            >
              <Ionicons name="close" size={24} color="#333" />
            </Pressable>
            <Text style={{
              fontSize: 18, fontWeight: '700', color: '#1a1a1a', flex: 1,
            }}>
              {legalModalTitle}
            </Text>
          </View>

          {/* Modal Content */}
          {legalLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={{ marginTop: 12, color: '#999', fontSize: 14 }}>
                Loading...
              </Text>
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
              showsVerticalScrollIndicator
            >
              {/* Effective date */}
              {legalMeta.effectiveDate && (
                <Text style={{
                  fontSize: 13, color: '#999', marginBottom: 20,
                }}>
                  Effective Date: {legalMeta.effectiveDate}
                </Text>
              )}

              {legalSections.map((section: any, index: number) => (
                <View key={section.id || index} style={{ marginBottom: 24 }}>
                  <Text style={{
                    fontSize: 16, fontWeight: '700', color: '#1a1a1a',
                    marginBottom: 8,
                  }}>
                    {section.title}
                  </Text>
                  <Text style={{
                    fontSize: 14, color: '#555', lineHeight: 22,
                  }}>
                    {replacePlaceholders(section.content)}
                  </Text>
                </View>
              ))}

              {/* Footer */}
              <View style={{
                marginTop: 20, paddingTop: 20,
                borderTopWidth: 1, borderTopColor: '#eee',
              }}>
                <Text style={{ fontSize: 12, color: '#bbb', textAlign: 'center' }}>
                  © {new Date().getFullYear()} {legalMeta.companyName || 'Exxsend'}. All rights reserved.
                </Text>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      <Text style={styles.bigTitle}>Login to your account</Text>

      {/* ... keep all existing form fields exactly as-is ... */}
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

      {/* ===== TERMS & PRIVACY LINKS ===== */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        flexWrap: 'wrap',
      }}>
        <Text style={{ fontSize: 12, color: '#999' }}>By logging in, you agree to our </Text>
        <Pressable onPress={() => showLegalDocument("terms")}>
          <Text style={{ fontSize: 12, color: COLORS.primary, fontWeight: '600' }}>
            Terms & Conditions
          </Text>
        </Pressable>
        <Text style={{ fontSize: 12, color: '#999' }}> and </Text>
        <Pressable onPress={() => showLegalDocument("privacy")}>
          <Text style={{ fontSize: 12, color: COLORS.primary, fontWeight: '600' }}>
            Privacy Policy
          </Text>
        </Pressable>
      </View>

      {/* Biometric Option */}
      {bioAvailable && (
        <Pressable
          onPress={handleBiometricLogin}
          style={{
            marginTop: 18, flexDirection: "row",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Ionicons name="finger-print-outline" size={20} color={COLORS.primary} />
          <Text style={{ marginLeft: 8, color: COLORS.primary, fontWeight: "700" }}>
            Login with {bioType}
          </Text>
        </Pressable>
      )}

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
