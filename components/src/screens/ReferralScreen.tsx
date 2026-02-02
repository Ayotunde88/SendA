import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, ScrollView, Share, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { styles } from "../../../theme/styles";
import { getMyReferralCode } from "../../../api/config";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../theme/colors";
import * as Clipboard from "expo-clipboard";

export default function ReferralScreen() {
  const router = useRouter();
  const [referralCode, setReferralCode] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchReferralData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        setLoading(false);
        return;
      }

      const result = await getMyReferralCode(token);

      if (result.success) {
        setReferralCode(result.referral_code || "");
        setReferralLink(result.referral_link || "");
      }
    } catch (error) {
      console.error("Failed to fetch referral data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferralData();
  }, [fetchReferralData]);

  const handleCopyLink = async () => {
    if (referralLink) {
      await Clipboard.setStringAsync(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (!referralCode || !referralLink) return;

    try {
      await Share.share({
        message: `Join me on Exxsend and get started with easy money transfers! Use my referral code: ${referralCode}\n\n${referralLink}`,
        title: "Invite Friends to Exxsend",
      });
    } catch (error: any) {
      if (error.message !== "User did not share") {
        console.error("Share error:", error);
      }
    }
  };

  const handleSkip = () => {
    router.push("/globalaccount");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView>
        <View style={styles.shell}>
          {/* Top row */}
          <View style={styles.topRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backIcon}>✕</Text>
            </Pressable>
            <View />
          </View>

          {/* Header */}
          <Text style={styles.welcomeTiny}>WELCOME 🎉</Text>
          <Text style={[styles.bigTitle, { marginTop: 10 }]}>Invite friends & earn rewards</Text>

          {/* How it works card */}
          <View style={[styles.refHowCard, { marginTop: 18 }]}>
            <View style={styles.refHowHeader}>
              <View style={styles.refHowIconCircle}>
                <Ionicons name="gift-outline" size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.refHowTitle}>How it works</Text>
            </View>

            <View style={styles.refStepRow}>
              <View style={styles.refStepBadge}>
                <Text style={styles.refStepBadgeText}>1</Text>
              </View>
              <Text style={styles.refStepText}>
                Share your referral link with friends.
              </Text>
            </View>

            <View style={styles.refStepRow}>
              <View style={styles.refStepBadge}>
                <Text style={styles.refStepBadgeText}>2</Text>
              </View>
              <Text style={styles.refStepText}>
                When they make their first deposit.
              </Text>
            </View>

            <View style={styles.refStepRow}>
              <View style={styles.refStepBadge}>
                <Text style={styles.refStepBadgeText}>3</Text>
              </View>
              <Text style={styles.refStepText}>
                You earn a 3% cash bonus!
              </Text>
            </View>

            <View style={styles.refRuleDivider} />

            {/* Rules */}
            <View style={styles.refRuleRow}>
              <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.primary} />
              <Text style={styles.refRuleText}>You can only use one referral code per account.</Text>
            </View>

            <View style={styles.refRuleRow}>
              <Ionicons name="wallet-outline" size={18} color={COLORS.primary} />
              <Text style={styles.refRuleText}>
                The bonus applies only to their first deposit.
              </Text>
            </View>
          </View>

          {/* Referral Link Display */}
          <Text style={[styles.label, { marginTop: 18 }]}>Your Referral Link</Text>
          {loading ? (
            <View style={[styles.inputBox, { justifyContent: "center", alignItems: "center", paddingVertical: 16 }]}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : (
            <Pressable onPress={handleCopyLink} style={styles.inputBox}>
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text 
                  style={[styles.input, { flex: 1, color: referralLink ? COLORS.text : "#B8B8B8" }]} 
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {referralLink || "Loading..."}
                </Text>
                <View style={{ marginLeft: 8, padding: 4 }}>
                  <Ionicons 
                    name={copied ? "checkmark-circle" : "copy-outline"} 
                    size={20} 
                    color={copied ? "#22c55e" : COLORS.primary} 
                  />
                </View>
              </View>
            </Pressable>
          )}
          {copied && (
            <Text style={{ color: "#22c55e", fontSize: 12, marginTop: 4 }}>Copied to clipboard!</Text>
          )}

          {/* Referral Code Display */}
          <Text style={[styles.label, { marginTop: 14 }]}>Your Referral Code</Text>
          <View style={styles.inputBox}>
            <Text style={[styles.input, { color: referralCode ? COLORS.text : "#B8B8B8", letterSpacing: 2 }]}>
              {loading ? "Loading..." : (referralCode || "------")}
            </Text>
          </View>

          {/* Share Button */}
          <Pressable
            style={[styles.outlineBtn, { marginTop: 18, opacity: loading || !referralLink ? 0.6 : 1 }]}
            onPress={handleShare}
            disabled={loading || !referralLink}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Ionicons name="share-social-outline" size={20} color={COLORS.primary} />
              <Text style={styles.outlineBtnText}>Share Your Referral Link</Text>
            </View>
          </Pressable>

          {/* Skip */}
          {/* <Pressable style={[styles.outlineBtn, { marginTop: 14 }]} onPress={handleSkip}>
            <Text style={styles.outlineBtnText}>Continue to App</Text>
          </Pressable> */}

          <View style={{ flex: 1 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}