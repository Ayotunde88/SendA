import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, TextInput, Keyboard, Alert, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { styles } from "../../../theme/styles";
import { api } from "../../../api/config";
import { SafeAreaView } from "react-native-safe-area-context";

const OTP_LEN = 6;

export default function VerifyNumberScreen() {
  const router = useRouter();
  const { phone, requestId } = useLocalSearchParams<{ phone: string; requestId: string }>();
  const inputRef = useRef<TextInput | null>(null);

  const [code, setCode] = useState("");
  const [focused, setFocused] = useState(false);
  const [seconds, setSeconds] = useState(60);
  const [loading, setLoading] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState(requestId);

  const canContinue = code.length === OTP_LEN && !loading;

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  const mmss = useMemo(() => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? `0${m}` : m}:${s < 10 ? `0${s}` : s}`;
  }, [seconds]);

  const focusInput = () => inputRef.current?.focus();

  const onChange = (txt: string) => {
    const clean = txt.replace(/\D/g, "").slice(0, OTP_LEN);
    setCode(clean);
  };

  const handleResend = async () => {
    if (seconds > 0 || loading) return;
    
    setLoading(true);
    try {
      const result = await api.sendOtp(phone || "");
      if (result.success) {
        setCurrentRequestId(result.request_id);
        setSeconds(60);
        setCode("");
        Alert.alert("Success", "New code sent!");
      } else {
        Alert.alert("Error", result.message || "Failed to resend");
      }
    } catch {
      Alert.alert("Error", "Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!canContinue || !currentRequestId) return;

    setLoading(true);
    try {
      const result = await api.verifyOtp(currentRequestId, code);

      if (result.success) {
        router.replace({
          pathname: "/pin",
          params: { phone, verified: "true" },
        });
      } else {
        Alert.alert("Invalid Code", result.message || "Please check and try again");
        setCode("");
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>

        <View style={styles.shell} onStartShouldSetResponder={() => true} onResponderRelease={Keyboard.dismiss}>
        <View style={styles.topRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
            </Pressable>
            <Pressable style={styles.getHelpPill}>
            <Text style={styles.getHelpPillText}>Get help</Text>
            </Pressable>
        </View>

        <Text style={[styles.bigTitle, { marginTop: 18 }]}>Verify your number</Text>
        <Text style={[styles.muted, { marginTop: 10, lineHeight: 22 }]}>
            Enter the 6-digit code sent to {phone}
        </Text>

        <Pressable onPress={focusInput} style={styles.otpRow}>
            {Array.from({ length: OTP_LEN }).map((_, i) => {
            const char = code[i] || "";
            const isActive = focused && i === code.length;
            return (
                <View
                key={i}
                style={[
                    styles.otpBox,
                    isActive ? styles.otpBoxActive : null,
                    !focused && i === 0 && code.length === 0 ? styles.otpBoxActive : null,
                ]}
                >
                <Text style={styles.otpChar}>{char}</Text>
                </View>
            );
            })}
            <TextInput
            ref={inputRef}
            value={code}
            onChangeText={onChange}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoFocus
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={styles.otpHiddenInput}
            />
        </Pressable>

        <Pressable onPress={handleResend} disabled={seconds > 0}>
            <Text style={[styles.muted, { marginTop: 16, fontWeight: "800" }]}>
            Didn't receive it?{" "}
            <Text style={{ color: seconds > 0 ? "#1E1E1E" : "#00C853", fontWeight: "900" }}>
                {seconds > 0 ? `Retry in ${mmss}` : "Resend now"}
            </Text>
            </Text>
        </Pressable>

        <View style={{ marginTop: 24 }} />

        <Pressable
            style={canContinue ? styles.primaryBtn : styles.disabledBigBtn}
            onPress={handleVerify}
            disabled={!canContinue}
        >
            {loading ? (
            <ActivityIndicator color="#fff" />
            ) : (
            <Text style={canContinue ? styles.primaryBtnText : styles.disabledBigBtnText}>
                Continue
            </Text>
            )}
        </Pressable>
        </View>
    </SafeAreaView>
  );
}
