import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  TextInput,
  Keyboard,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import ScreenShell from "../../../../components/ScreenShell";
import { styles } from "../../../../theme/styles";
import { COLORS } from "../../../../theme/colors";
import { resendEmailOtp, verifyEmailOtp } from "@/api/config";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CODE_LEN = 6;
const RESEND_SECONDS = 45;

export default function CheckEmailCodeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [emailVerified, setEmailVerified] = useState(false);
  // ✅ email from params can be string | string[] | undefined
  const email = useMemo(() => {
    const e = params.email;
    if (Array.isArray(e)) return e[0] ?? "";
    return (e as string) ?? "";
  }, [params.email]);

  const [code, setCode] = useState<string[]>(Array(CODE_LEN).fill(""));
  const [submitting, setSubmitting] = useState(false);

  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const canResend = secondsLeft === 0;

  const inputsRef = useRef<Array<TextInput | null>>([]);

  const codeValue = useMemo(() => code.join(""), [code]);

  // ✅ FIX: never use codeValue.includes("") (always true)
  const canContinue = useMemo(() => {
    return code.every((d) => d !== "") && codeValue.length === CODE_LEN && !submitting;
  }, [code, codeValue, submitting]);

  // Countdown timer
  useEffect(() => {
    if (secondsLeft === 0) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const focusIndex = (i: number) => {
    inputsRef.current[i]?.focus?.();
  };

  const onChangeDigit = (text: string, i: number) => {
    const digit = text.replace(/\D/g, "").slice(-1); // keep last digit only

    const next = [...code];
    next[i] = digit;
    setCode(next);

    if (digit && i < CODE_LEN - 1) {
      focusIndex(i + 1);
    }
    if (digit && i === CODE_LEN - 1) {
      Keyboard.dismiss();
    }
  };

  const onKeyPress = (e: any, i: number) => {
    if (e.nativeEvent.key === "Backspace") {
      if (code[i]) {
        const next = [...code];
        next[i] = "";
        setCode(next);
        return;
      }
      if (!code[i] && i > 0) {
        const next = [...code];
        next[i - 1] = "";
        setCode(next);
        focusIndex(i - 1);
      }
    }
  };

  const getErrorMessage = (err: any) => {
    // Axios-like
    if (err?.response?.data?.message) return err.response.data.message;
    if (err?.response?.data?.error) return err.response.data.error;

    // Fetch-like / generic
    if (err?.message) return err.message;
    return "Something went wrong. Please try again.";
  };

  const handleContinue = async () => {
    if (!canContinue) return;

    // extra guard
    if (!email) {
      console.log("Missing email in route params");
      return;
    }

    setSubmitting(true);
    try {
      await verifyEmailOtp(email, codeValue);
      console.log("Verify email OTP:", { email, code: codeValue });

      router.replace("/homeaddress");

      setEmailVerified(true);
      await AsyncStorage.setItem("email_verified", emailVerified.toString());
    } catch (err: any) {
      console.log(getErrorMessage(err));

      setCode(Array(CODE_LEN).fill(""));
      focusIndex(0);
    } finally {
      setSubmitting(false);
    }
  };

  const resendCode = async () => {
    if (!canResend) return;

    if (!email) {
      console.log("Missing email in route params");
      return;
    }

    setSubmitting(true);
    try {
      await resendEmailOtp(email);
      console.log("Resend email code:", email);

      setSecondsLeft(RESEND_SECONDS);
      setCode(Array(CODE_LEN).fill(""));
      focusIndex(0);
    } catch (err: any) {
      console.log(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const mmss = (s: number) => {
    const m = Math.floor(s / 60);
    const ss = String(s % 60).padStart(2, "0");
    return `${m}:${ss}`;
  };

  return (
    <ScreenShell>
      {/* Top row: back + get help */}
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>

        <Pressable style={styles.getHelpPill}>
          <Text style={styles.getHelpText}>Get help</Text>
        </Pressable>
      </View>

      {/* Icon */}
      <View style={styles.centerIconWrap}>
        <Image
          source={require("../../../../assets/images/icons/verify_email.png")}
          style={styles.centerIcon}
          resizeMode="contain"
        />
      </View>

      {/* Title */}
      <Text style={styles.checkEmailTitle}>Verify your email</Text>

      <Text style={styles.checkEmailSub}>Enter the 6-digit code sent to</Text>
      <Text style={styles.checkEmailEmail}>{email}</Text>

      {/* Code inputs */}
      <View style={styles.otpRow}>
        {Array.from({ length: CODE_LEN }).map((_, i) => {
          const firstEmptyIndex = code.findIndex((d) => d === "");
          const isActive = i === (firstEmptyIndex === -1 ? CODE_LEN - 1 : firstEmptyIndex);
          const filled = !!code[i];

          return (
            <TextInput
              key={i}
              ref={(r) => {
                inputsRef.current[i] = r;
              }}
              value={code[i]}
              onChangeText={(t) => onChangeDigit(t, i)}
              onKeyPress={(e) => onKeyPress(e, i)}
              keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
              returnKeyType="done"
              maxLength={1}
              style={[
                styles.otpBox,
                isActive && styles.otpBoxActive,
                filled && styles.otpBoxFilled,
              ]}
              placeholder=""
              selectionColor={COLORS?.green ?? "#2D9D62"}
              // ✅ helps iOS OTP autofill
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
            />
          );
        })}
      </View>

      {/* Resend row */}
      <View style={{ marginTop: 14 }}>
        {canResend ? (
          <Pressable onPress={resendCode} disabled={submitting}>
            <Text style={styles.resendText}>
              Didn’t receive it? <Text style={styles.resendLink}>Resend code</Text>
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.resendText}>
            Didn’t receive it? Retry in{" "}
            <Text style={styles.resendTimer}>{mmss(secondsLeft)}</Text>
          </Text>
        )}
      </View>

      {/* Continue button */}
      <View style={{ marginTop: 24 }}>
        <Pressable
          style={canContinue ? styles.primaryBtn : styles.disabledBigBtn}
          onPress={handleContinue}
          disabled={!canContinue}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={canContinue ? styles.primaryBtnText : styles.disabledBigBtnText}>
              Continue
            </Text>
          )}
        </Pressable>
      </View>
    </ScreenShell>
  );
}
