/**
 * RecipientConfirmScreen - Confirm and execute transfer to Flutterwave-supported countries
 *
 * Fintech UI:
 * - Clean header row
 * - Big “Recipient gets” amount card
 * - Breakdown rows (You send, rate)
 * - Recipient details card
 * - Info notice card
 * - Primary CTA + secondary cancel
 * - PIN modal for authorization
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Platform,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import ScreenShell from "../../../components/ScreenShell";
import PinVerificationModal from "../../../components/PinVerificationModal";
import { otherstyles } from "../../../theme/otherstyles";
import { styles } from "../../../theme/styles";
import { COLORS } from "../../../theme/colors";
import {
  sendFlutterwave,
  getCurrencySymbol,
  COUNTRY_NAMES,
  CURRENCY_TO_COUNTRY,
} from "../../../api/flutterwave";

interface RecipientData {
  accountName: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  currency: string;
  countryCode: string;
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

  const recipient: RecipientData | null = useMemo(() => {
    try {
      return params.recipient ? (JSON.parse(params.recipient) as RecipientData) : null;
    } catch {
      return null;
    }
  }, [params.recipient]);

  const destCurrency = (recipient?.currency || params.destCurrency || "NGN").toUpperCase();
  const countryCode =
    recipient?.countryCode ||
    CURRENCY_TO_COUNTRY[destCurrency] ||
    "NG";

  const countryName = COUNTRY_NAMES[countryCode] || countryCode;

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
    setShowPinModal(true);
  };

  const handleConfirmSend = async () => {
    if (!recipient || !userPhone) {
      Alert.alert("Error", "Missing recipient or user information");
      return;
    }

    setSending(true);

    try {
      const response = await sendFlutterwave({
        phone: userPhone,
        amount: toAmount,
        currency: destCurrency,
        accountNumber: recipient.accountNumber,
        bankCode: recipient.bankCode,
        bankName: recipient.bankName,
        accountName: recipient.accountName,
        fromCurrency,
        fromAmount,
        narration: `Transfer to ${recipient.accountName}`,
      });

      if (response.success) {
        router.push({
        pathname: "/result",
        params: {
          type: "success",
          title: "Transfer Successful",
          message: `${formattedToAmount} ${destCurrency} has been sent to ${recipient.accountName}`,
          primaryText: "Done",
          primaryRoute: "back",
          secondaryText: "View transaction",
          secondaryRoute: "/sendmoney",
        },
      });
      } else {
        Alert.alert("Transfer Failed", response.message || "Failed to send money. Please try again.");
        router.push({
        pathname: "/result",
        params: {
          type: "Failure",
          title: "Transfer Failed",
          message: `${formattedToAmount} ${destCurrency} could not be sent to ${recipient.accountName}`,
          primaryText: "Try Again",
          primaryRoute: "/sendmoney",
          secondaryText: "View transaction",
          secondaryRoute: "/sendmoney",
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

  return (
    <ScreenShell padded={false}>
      <ScrollView
        contentContainerStyle={otherstyles.confirmContainer}
        showsVerticalScrollIndicator={false}
      >
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
              {countryName}
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
        </View>

        {/* Recipient details */}
        <Text style={otherstyles.confirmSectionTitle}>Recipient details</Text>

        <View style={otherstyles.confirmCard}>
          <View style={otherstyles.confirmDetailBlock}>
            <Text style={otherstyles.confirmDetailLabel}>Account name</Text>
            <Text style={otherstyles.confirmDetailValue}>{recipient.accountName}</Text>
          </View>

          <View style={otherstyles.confirmDivider} />

          <View style={otherstyles.confirmDetailBlock}>
            <Text style={otherstyles.confirmDetailLabel}>Account number</Text>
            <Text style={[otherstyles.confirmDetailValue, otherstyles.confirmMono]}>
              {recipient.accountNumber}
            </Text>
          </View>

          <View style={otherstyles.confirmDivider} />

          <View style={otherstyles.confirmDetailBlock}>
            <Text style={otherstyles.confirmDetailLabel}>Bank</Text>
            <Text style={otherstyles.confirmDetailValue}>{recipient.bankName}</Text>
          </View>

          <View style={otherstyles.confirmDivider} />

          <View style={otherstyles.confirmDetailBlock}>
            <Text style={otherstyles.confirmDetailLabel}>Country</Text>
            <Text style={otherstyles.confirmDetailValue}>{countryName}</Text>
          </View>
        </View>

        {/* Notice */}
        <View style={otherstyles.confirmNotice}>
          <View style={otherstyles.confirmNoticeIconWrap}>
            <Text style={otherstyles.confirmNoticeIcon}>ℹ️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={otherstyles.confirmNoticeTitle}>Transfer timeline</Text>
            <Text style={otherstyles.confirmNoticeText}>
              Fees may apply. Transfers typically arrive within 24 hours depending on the bank.
            </Text>
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
            <Text style={otherstyles.confirmPrimaryBtnText}>Confirm & send</Text>
          )}
        </Pressable>

        <Pressable
          style={otherstyles.confirmCancelBtn}
          onPress={() => router.back()}
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
        title="Authorize transfer"
        subtitle="Enter your 4-digit PIN to confirm this transfer"
      />
    </ScreenShell>
  );
}
