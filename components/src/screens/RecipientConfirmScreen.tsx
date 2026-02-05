/**
 * RecipientConfirmScreen - Confirm and execute transfer to Flutterwave-supported countries or Interac (CAD)
 *
 * ✅ Update added from the other code:
 * - Interac security question + answer fields
 * - Validate Q&A before showing PIN modal
 * - Pass securityQuestion/securityAnswer to sendInteracPayout
 *
 * (Your original UI + otherstyles layout is preserved.)
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import ScreenShell from "../../../components/ScreenShell";
import PinVerificationModal from "../../../components/PinVerificationModal";
import { otherstyles } from "../../../theme/otherstyles";
import { styles } from "../../../theme/styles";
import {
  sendFlutterwave,
  getCurrencySymbol,
  COUNTRY_NAMES,
  CURRENCY_TO_COUNTRY,
} from "../../../api/flutterwave";
import { saveRecipientToDB } from "../../../api/sync";

import { sendInteracPayout } from "../../../api/paysafe";

interface RecipientData {
  accountName: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  currency: string;
  countryCode: string;
  isInterac?: boolean | string;
}

export default function RecipientConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    destCurrency: string;
    fromWalletId: string;
    fromCurrency: string;
    fromAmount: string;
    toAmount: string;
    rate?: string;
    recipient: string;
    mode: string;
  }>();

  const [userPhone, setUserPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  // ✅ Interac security Q&A state (NEW)
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");

  const recipient: RecipientData | null = useMemo(() => {
    try {
      return params.recipient ? (JSON.parse(params.recipient) as RecipientData) : null;
    } catch {
      return null;
    }
  }, [params.recipient]);

  // Detect Interac: check isInterac flag OR bankCode === "INTERAC"
  const isInterac = useMemo(() => {
    if (!recipient) return false;
    if (recipient.isInterac === true || recipient.isInterac === "true") return true;
    if (recipient.bankCode === "INTERAC") return true;
    return false;
  }, [recipient]);

  const destCurrency = (recipient?.currency || params.destCurrency || "NGN").toUpperCase();
  const countryCode = recipient?.countryCode || CURRENCY_TO_COUNTRY[destCurrency] || "NG";
  const countryName = isInterac ? "Canada" : COUNTRY_NAMES[countryCode] || countryCode;

  const symbol = getCurrencySymbol(destCurrency);
  const fromCurrency = (params.fromCurrency || "USD").toUpperCase();
  const fromSymbol = getCurrencySymbol(fromCurrency);

  const fromAmount = Number.parseFloat(params.fromAmount || "0") || 0;
  const toAmount = Number.parseFloat(params.toAmount || "0") || 0;

  const rate = params.rate ? Number.parseFloat(params.rate) : null;
  const showRate = !!rate && fromCurrency !== destCurrency;

  const formattedToAmount = useMemo(() => {
    return `${symbol}${toAmount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }, [symbol, toAmount]);

  const formattedFromAmount = useMemo(() => {
    return `${fromSymbol}${fromAmount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${fromCurrency}`;
  }, [fromSymbol, fromAmount, fromCurrency]);

  const formattedRate = useMemo(() => {
    if (!rate) return "";
    return `1 ${fromCurrency} = ${rate.toFixed(4)} ${destCurrency}`;
  }, [rate, fromCurrency, destCurrency]);

  useEffect(() => {
    AsyncStorage.getItem("user_phone").then((phone) => {
      if (phone) setUserPhone(phone);
    });
  }, []);

  const handleConfirmButtonPress = () => {
    if (!recipient || !userPhone) {
      Alert.alert("Error", "Missing recipient or user information");
      return;
    }

    // ✅ Validate Interac security Q&A before PIN modal (NEW)
    if (isInterac) {
      const q = securityQuestion.trim();
      const a = securityAnswer.trim();
      if (!q || q.length < 5) {
        Alert.alert("Security question required", "Please enter a security question (at least 5 characters).");
        return;
      }
      if (!a || a.length < 3) {
        Alert.alert("Security answer required", "Please enter a security answer (at least 3 characters).");
        return;
      }
    }

    setShowPinModal(true);
  };

  const handleConfirmSend = async () => {
    if (!recipient || !userPhone) {
      Alert.alert("Error", "Missing recipient or user information");
      return;
    }

    setSending(true);

    try {
      let response;

      if (isInterac) {
        // CAD via Interac e-Transfer (Paysafe)
        response = await sendInteracPayout({
          phone: userPhone,
          amount: toAmount,
          recipientEmail: recipient.accountNumber, // Email stored as accountNumber for Interac
          recipientName: recipient.accountName,
          message: `Transfer to ${recipient.accountName}`,
          // ✅ pass Q&A (NEW)
          securityQuestion: securityQuestion.trim(),
          securityAnswer: securityAnswer.trim(),
        });
      } else {
        // African currencies via Flutterwave
        response = await sendFlutterwave({
          phone: userPhone,
          amount: toAmount,
          currency: destCurrency,
          accountNumber: recipient.accountNumber,
          bankCode: recipient.bankCode,
          bankName: recipient.bankName,
          accountName: recipient.accountName,
          fromCurrency: params.fromCurrency,
          fromAmount: fromAmount,
          narration: `Transfer to ${recipient.accountName}`,
        });
      }

      if (response.success) {
        try {
          await saveRecipientToDB({
            phone: userPhone,
            accountName: recipient.accountName,
            accountNumber: recipient.accountNumber,
            bankCode: recipient.bankCode || (isInterac ? "INTERAC" : ""),
            bankName: recipient.bankName || (isInterac ? "Interac e-Transfer" : ""),
            currency: destCurrency,
            countryCode: isInterac ? "CA" : countryCode,
            isInterac: isInterac,
          });
          console.log("[RecipientConfirmScreen] Recipient saved successfully");
        } catch (saveError) {
          console.error("[RecipientConfirmScreen] Failed to save recipient:", saveError);
          // Don't block success - this is a background save
        }
        const successMessage = isInterac
          ? `An Interac e-Transfer of ${formattedToAmount} ${destCurrency} has been sent to ${recipient.accountNumber}`
          : `${formattedToAmount} ${destCurrency} has been sent to ${recipient.accountName}`;

        router.push({
          pathname: "/result",
          params: {
            type: "success",
            title: isInterac ? "Interac Transfer Sent" : "Transfer Successful",
            message: successMessage,
            primaryText: "Done",
            primaryRoute: "/(tabs)/",
            secondaryText: "Go to Home",
            secondaryRoute: "/(tabs)/",
          },
        });
      } else {
        const errorMessage = isInterac
          ? `Interac e-Transfer to ${recipient.accountNumber} could not be completed`
          : `${formattedToAmount} ${destCurrency} could not be sent to ${recipient.accountName}`;

        router.push({
          pathname: "/result",
          params: {
            type: "error",
            title: "Transfer Failed",
            message: response.message || errorMessage,
            primaryText: "Try Again",
            primaryRoute: "/(tabs)/",
            secondaryText: "Go to Home",
            secondaryRoute: "/(tabs)/",
          },
        });
      }
    } catch (error: any) {
      console.error("Transfer error:", error);
      Alert.alert("Transfer Failed", error?.message || "An error occurred. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (!recipient) {
    return (
      <ScreenShell>
        <View style={otherstyles.confirmInvalidWrap}>
          <Text style={otherstyles.confirmInvalidText}>Invalid recipient data</Text>
          <Pressable style={otherstyles.confirmInvalidBtn} onPress={() => router.back()}>
            <Text style={otherstyles.confirmInvalidBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </ScreenShell>
    );
  }

  // Display values for Interac vs Bank transfers
  const transferMethodLabel = isInterac ? "Interac e-Transfer" : "Bank Transfer";
  const accountFieldLabel = isInterac ? "Email address" : "Account number";
  const bankFieldLabel = isInterac ? "Transfer method" : "Bank";
  const bankFieldValue = isInterac ? "Interac e-Transfer" : recipient.bankName;

  // Notice text differs for Interac vs bank transfers
  const noticeTitle = isInterac ? "Interac e-Transfer" : "Transfer timeline";
  const noticeText = isInterac
    ? "The recipient will receive an email to accept the transfer. Funds are typically available within minutes once accepted."
    : "Fees may apply. Transfers typically arrive within 24 hours depending on the bank.";

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={otherstyles.confirmContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={otherstyles.confirmHeader}>
          <Pressable onPress={() => router.back()} style={otherstyles.backBtn}>
            <Text style={otherstyles.backIcon}>←</Text>
          </Pressable>

          <View style={otherstyles.confirmHeaderCenter}>
            <Text style={otherstyles.confirmTitle}>Confirm transfer</Text>
            <Text style={otherstyles.confirmSubtitle}>Review details before you send</Text>
          </View>

          <View style={otherstyles.confirmHeaderRight} />
        </View>

        {/* Big Amount Card */}
        <View style={otherstyles.confirmHeroCard}>
          <Text style={otherstyles.confirmHeroLabel}>Recipient gets</Text>

          <Text style={otherstyles.confirmHeroAmount} numberOfLines={1}>
            {formattedToAmount}
          </Text>

          <View style={otherstyles.confirmHeroMetaRow}>
            <View style={otherstyles.confirmHeroPill}>
              <Text style={otherstyles.confirmHeroPillText}>{destCurrency}</Text>
            </View>

            <View style={otherstyles.confirmHeroDot} />

            <Text style={otherstyles.confirmHeroMetaText}>
              {isInterac ? "Interac e-Transfer" : countryName}
            </Text>
          </View>
        </View>

        {/* Breakdown */}
        <View style={otherstyles.confirmCard}>
          <View style={otherstyles.confirmRow}>
            <Text style={otherstyles.confirmRowLabel}>You send</Text>
            <Text style={otherstyles.confirmRowValue}>{formattedFromAmount}</Text>
          </View>

          {showRate && (
            <>
              <View style={otherstyles.confirmDivider} />
              <View style={otherstyles.confirmRow}>
                <Text style={otherstyles.confirmRowLabel}>Exchange rate</Text>
                <Text style={otherstyles.confirmRowValueSmall}>{formattedRate}</Text>
              </View>
            </>
          )}

          <View style={otherstyles.confirmDivider} />
          <View style={otherstyles.confirmRow}>
            <Text style={otherstyles.confirmRowLabel}>Transfer method</Text>
            <Text style={otherstyles.confirmRowValueSmall}>{transferMethodLabel}</Text>
          </View>
        </View>

        {/* Recipient details */}
        <Text style={otherstyles.confirmSectionTitle}>Recipient details</Text>

        <View style={otherstyles.confirmCard}>
          <View style={otherstyles.confirmDetailBlock}>
            <Text style={otherstyles.confirmDetailLabel}>Recipient name</Text>
            <Text style={otherstyles.confirmDetailValue}>{recipient.accountName}</Text>
          </View>

          <View style={otherstyles.confirmDivider} />

          <View style={otherstyles.confirmDetailBlock}>
            <Text style={otherstyles.confirmDetailLabel}>{accountFieldLabel}</Text>
            <Text style={[otherstyles.confirmDetailValue, otherstyles.confirmMono]}>
              {recipient.accountNumber}
            </Text>
          </View>

          <View style={otherstyles.confirmDivider} />

          <View style={otherstyles.confirmDetailBlock}>
            <Text style={otherstyles.confirmDetailLabel}>{bankFieldLabel}</Text>
            <Text style={otherstyles.confirmDetailValue}>{bankFieldValue}</Text>
          </View>

          <View style={otherstyles.confirmDivider} />

          <View style={otherstyles.confirmDetailBlock}>
            <Text style={otherstyles.confirmDetailLabel}>Country</Text>
            <Text style={otherstyles.confirmDetailValue}>{countryName}</Text>
          </View>
        </View>

        {/* ✅ Interac Security Q&A (NEW, inserted using your existing design language) */}
        {isInterac && (
          <>
            <Text style={otherstyles.confirmSectionTitle}>Security question</Text>

            <View style={otherstyles.confirmCard}>
              <View style={otherstyles.confirmDetailBlock}>
                <Text style={otherstyles.confirmDetailLabel}>Security question</Text>
                <TextInput
                  value={securityQuestion}
                  onChangeText={setSecurityQuestion}
                  placeholder="e.g., What is your favourite colour?"
                  placeholderTextColor="#9CA3AF"
                  maxLength={100}
                  autoCapitalize="sentences"
                  style={[
                    otherstyles.confirmDetailValue,
                    {
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      borderRadius: 10,
                      backgroundColor: "#F9FAFB",
                      marginTop: 8,
                      fontFamily: Platform.OS === "ios" ? undefined : undefined,
                    },
                  ]}
                />
              </View>

              <View style={otherstyles.confirmDivider} />

              <View style={otherstyles.confirmDetailBlock}>
                <Text style={otherstyles.confirmDetailLabel}>Security answer</Text>
                <TextInput
                  value={securityAnswer}
                  onChangeText={setSecurityAnswer}
                  placeholder="e.g., Blue"
                  placeholderTextColor="#9CA3AF"
                  maxLength={50}
                  autoCapitalize="none"
                  style={[
                    otherstyles.confirmDetailValue,
                    {
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      borderRadius: 10,
                      backgroundColor: "#F9FAFB",
                      marginTop: 8,
                    },
                  ]}
                />
              </View>
            </View>
          </>
        )}

        {/* Notice */}
        <View style={otherstyles.confirmNotice}>
          <View style={otherstyles.confirmNoticeIconWrap}>
            <Text style={otherstyles.confirmNoticeIcon}>{isInterac ? "📧" : "ℹ️"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={otherstyles.confirmNoticeTitle}>{noticeTitle}</Text>
            <Text style={otherstyles.confirmNoticeText}>{noticeText}</Text>
          </View>
        </View>

        {/* CTA */}
        <Pressable
          style={[styles.primaryBtn, sending && styles.disabledBigBtn]}
          onPress={handleConfirmButtonPress}
          disabled={sending}
        >
          {sending ? (
            <View style={otherstyles.confirmPrimaryBtnInner}>
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: 10 }} />
              <Text style={otherstyles.confirmPrimaryBtnText}>Sending…</Text>
            </View>
          ) : (
            <Text style={otherstyles.confirmPrimaryBtnText}>
              {isInterac ? "Send Interac e-Transfer" : "Confirm & send"}
            </Text>
          )}
        </Pressable>

        <Pressable
          style={otherstyles.confirmCancelBtn}
          onPress={() => router.push("/(tabs)")}
          disabled={sending}
        >
          <Text style={otherstyles.confirmCancelText}>Cancel</Text>
        </Pressable>

        <View style={{ height: 18 }} />
      </ScrollView>

      {/* PIN Verification Modal */}
      <PinVerificationModal
        visible={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={handleConfirmSend}
        title={isInterac ? "Authorize Interac transfer" : "Authorize transfer"}
        subtitle="Enter your 4-digit PIN to confirm this transfer"
      />
    </ScreenShell>
  );
}
