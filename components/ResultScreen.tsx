import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome6 } from "@expo/vector-icons";
import ScreenShell from "../components/ScreenShell";
import { styles } from "../theme/styles";
import { COLORS } from "../theme/colors";


interface ResultScreenParams {
  type: "success" | "error";
  title: string;
  message: string;
  primaryText: string;
  primaryRoute: string;
  secondaryText: string;
  secondaryRoute: string;
  details: string;
}

interface ResultScreenProps {
  params: ResultScreenParams;
}

export default function ResultScreen({ params }: ResultScreenProps) {
  const router = useRouter();
  const searchParams = useLocalSearchParams();

  // params come in as strings in expo-router
  const type = (searchParams.type || "success").toString(); // "success" | "error"
  const title = (searchParams.title || (type === "error" ? "Something went wrong" : "Success")).toString();
  const message = (searchParams.message || "").toString();

  // optional params
  const primaryText = (searchParams.primaryText || "Continue").toString();
  const primaryRoute = (searchParams.primaryRoute || "/(tabs)").toString(); // where the big button goes
  const secondaryText = (searchParams.secondaryText || "").toString(); // e.g., "View receipt"
  const secondaryRoute = (searchParams.secondaryRoute || "").toString();
  const details = (searchParams.details || "").toString(); // long text (optional)

  const ui = useMemo(() => {
    const isError = type === "error";
    return {
      isError,
      icon: isError ? "circle-exclamation" : "circle-check",
      accent: isError ? "#E25B5B" : COLORS.green,
      soft: isError ? "rgba(226,91,91,0.12)" : "rgba(25,149,95,0.12)",
      grad: isError
        ? (["#F8E7E7", "#F6F6F6"] as [string, string])
        : (["#E5F5ED", "#F6F6F6"] as [string, string]),
      subtitle:
        message || (isError ? "Please try again in a moment." : "Your request was completed successfully."),
    };
  }, [type, message]);

  const onPrimary = () => {
    // if they pass "back" or "pop" we can handle that too
    if (primaryRoute === "back") return router.back();
    if (primaryRoute === "pop") return router.dismiss ? router.dismiss() : router.back();
    // primaryRoute is a runtime string (from search params); cast to any to satisfy router.replace's stricter TypeScript union
    router.replace(primaryRoute as any);
  };

  const onSecondary = () => {
    if (!secondaryRoute) return;
    // secondaryRoute comes from search params (string); cast to any to satisfy router.push's stricter TypeScript union
    router.push(secondaryRoute as any);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F6F6" }}>
      <ScreenShell padded={false}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          {/* Header */}
          <View style={styles.resultHeader}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>
            <View style={{ flex: 1 }} />
          </View>

          {/* Card */}
          <View style={styles.resultWrap}>
            <LinearGradient
              colors={ui.grad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.resultCard}
            >
              <View style={[styles.resultIconRing, { backgroundColor: ui.soft }]}>
                <View style={[styles.resultIconInner, { borderColor: ui.soft }]}>
                  <FontAwesome6 name={ui.icon} size={44} color={ui.accent} />
                </View>
              </View>

              <Text style={styles.resultTitle}>{title}</Text>
              <Text style={styles.resultSubtitle}>{ui.subtitle}</Text>

              {!!details && (
                <View style={styles.resultDetailsBox}>
                  <Text style={styles.resultDetailsText}>{details}</Text>
                </View>
              )}

              {/* Actions */}
              <Pressable
                style={[
                  styles.resultPrimaryBtn,
                  { backgroundColor: ui.isError ? "#1E1E1E" : COLORS.green },
                ]}
                onPress={onPrimary}
              >
                <Text style={styles.resultPrimaryBtnText}>{primaryText}</Text>
              </Pressable>

              {!!secondaryText && !!secondaryRoute && (
                <Pressable style={styles.resultSecondaryBtn} onPress={onSecondary}>
                  <Text style={[styles.resultSecondaryText, { color: ui.accent }]}>
                    {secondaryText}
                  </Text>
                </Pressable>
              )}
            </LinearGradient>
          </View>

          {/* Bottom spacing */}
          <View style={{ height: 22 }} />
        </ScrollView>
      </ScreenShell>
    </SafeAreaView>
  );
}
