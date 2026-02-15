import React, { useCallback, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator, Modal, ScrollView, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Checkbox from "expo-checkbox";
import { router } from "expo-router";

import ScreenShell from "../../ScreenShell";
import { styles } from "../../../theme/styles";
import { COLORS } from "../../../theme/colors";
import CountryDropdown from "../../../components/CountryDropdown";
import { api, checkPhoneExists } from "../../../api/config";

const API_BASE_URL = Platform.OS === "android"
    ? process.env.EXPO_PUBLIC_API_BASE_URL_ANDROID
    : process.env.EXPO_PUBLIC_API_BASE_URL_IOS;; // ← update this

interface Country {
  code: string;
  name: string;
  symbol?: string;
  flag?: string;
  dialCode?: string;
}

interface LegalSection {
  id: string;
  title: string;
  content: string;
}

export default function GetStartedScreen() {
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<Country | null>(null);
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Legal modal state
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalTitle, setLegalTitle] = useState("");
  const [legalSections, setLegalSections] = useState<LegalSection[]>([]);
  const [legalMeta, setLegalMeta] = useState<any>({});
  const [legalLoading, setLegalLoading] = useState(false);

  const digitsOnly = useMemo(() => phone.replace(/\D/g, ""), [phone]);
  const fullPhone = useMemo(() => {
    if (!country) return "";
    return `${country.dialCode}${digitsOnly}`;
  }, [country, digitsOnly]);

  const isValidPhone = digitsOnly.length >= 7;
  const canContinue = !!country && isValidPhone && termsAccepted && !loading;

  const replacePlaceholders = (text: string, meta: any) => {
    return text
      .replace(/\{\{COMPANY\}\}/g, meta.companyName || "")
      .replace(/\{\{EMAIL\}\}/g, meta.supportEmail || "")
      .replace(/\{\{WEBSITE\}\}/g, meta.website || "")
      .replace(/\{\{DATE\}\}/g, meta.effectiveDate || "")
      .replace(/\{\{JURISDICTION\}\}/g, meta.jurisdiction || "");
  };

  const showLegalDocument = useCallback(async (docType: "terms" | "privacy") => {
    setLegalTitle(docType === "terms" ? "Terms & Conditions" : "Privacy Policy");
    setLegalSections([]);
    setLegalMeta({});
    setLegalModalVisible(true);
    setLegalLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/legal/${docType}`);
      const data = await res.json();
      if (data.success && data.document) {
        setLegalSections(data.document.sections || []);
        setLegalMeta(data.document.meta || {});
        setLegalTitle(data.document.title || legalTitle);
      }
    } catch {
      setLegalSections([{ id: "error", title: "Error", content: "Could not load document. Please try again later." }]);
    } finally {
      setLegalLoading(false);
    }
  }, []);

  const handleContinue = async () => {
    if (!canContinue) return;
    setLoading(true);
    try {
      const checkResult = await checkPhoneExists(fullPhone);
      if (checkResult?.exists) {
        Alert.alert("Account Exists", checkResult?.message || "This phone number is already registered. Please sign in instead.");
        return;
      }
      const result = await api.sendOtp(fullPhone);
      if (result?.success) {
        await AsyncStorage.setItem("user_phone", fullPhone);
        await AsyncStorage.setItem("user_country_code", country.code);
        await AsyncStorage.setItem("user_country_name", country.name);
        await AsyncStorage.setItem("user_country_flag", country.flag ?? "");
        router.push({
          pathname: "/verifynumber",
          params: { phone: fullPhone, requestId: result.request_id || result.requestId || "" },
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
      {/* Legal Document Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={legalModalVisible}
        onRequestClose={() => setLegalModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: 56,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: "#eee",
          }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a", flex: 1 }}>
              {legalTitle}
            </Text>
            <Pressable
              onPress={() => setLegalModalVisible(false)}
              style={{
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: "#f0f0f0", alignItems: "center", justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#666" }}>✕</Text>
            </Pressable>
          </View>

          {legalLoading ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator size="large" color={COLORS.green} />
              <Text style={{ marginTop: 12, color: "#999" }}>Loading...</Text>
            </View>
          ) : (
            <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16 }}>
              {legalSections.map((section) => (
                <View key={section.id} style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 17, fontWeight: "700", color: "#1a1a1a", marginBottom: 8 }}>
                    {section.title}
                  </Text>
                  <Text style={{ fontSize: 15, color: "#555", lineHeight: 23 }}>
                    {replacePlaceholders(section.content, legalMeta)}
                  </Text>
                </View>
              ))}
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
      </Modal>

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
          <Text style={{ marginRight: 8, fontWeight: "700" }}>{country?.dialCode || ""}</Text>
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
          alignItems: "flex-start",
          marginTop: 16,
          marginBottom: 18,
        }}
      >
        <Checkbox
          value={termsAccepted}
          onValueChange={setTermsAccepted}
          color={termsAccepted ? COLORS.green : undefined}
          style={{ marginRight: 10, marginTop: 2 }}
        />
        <Text style={{ flex: 1 }}>
          Agree to our{" "}
          <Text
            style={{ color: COLORS.green, fontWeight: "800" }}
            onPress={() => showLegalDocument("terms")}
          >
            Terms of Service
          </Text>{" "}
          and{" "}
          <Text
            style={{ color: COLORS.green, fontWeight: "800" }}
            onPress={() => showLegalDocument("privacy")}
          >
            Privacy Policy
          </Text>
          .
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
          <Text style={canContinue ? styles.primaryBtnText : { color: "#B3B3B3", fontWeight: "800", fontSize: 18 }}>
            Continue
          </Text>
        )}
      </Pressable>

      <Text style={styles.signInRow}>
        Have an account?{" "}
        <Text onPress={() => router.push("/login")} style={{ color: COLORS.green, fontWeight: "800" }}>
          Sign In
        </Text>
      </Text>
    </ScreenShell>
  );
}
