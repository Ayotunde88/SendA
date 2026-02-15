import React, { useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenShell from "../../../../components/ScreenShell";
import { COLORS } from "../../../../theme/colors";

const SUPPORT_PHONE = "+1-800-555-1234";
const SUPPORT_CHAT_URL = "https://example.com/support/chat";

export default function SupportScreen() {
  const router = useRouter();

  const handleCallPress = useCallback(() => {
    Alert.alert(
      "Call Support",
      `Would you like to call ${SUPPORT_PHONE}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Call",
          onPress: async () => {
            const tel = `tel:${SUPPORT_PHONE.replace(/[^+\d]/g, "")}`;
            try {
              const canOpen = await Linking.canOpenURL(tel);
              if (canOpen) {
                await Linking.openURL(tel);
              } else {
                Alert.alert(
                  "Cannot Call",
                  "Your device cannot make phone calls from this app."
                );
              }
            } catch {
              Alert.alert("Error", "Unable to start the call.");
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, []);

  const handleChatPress = useCallback(async () => {
    try {
      // If you have an in-app chat screen
      router.push("/chatsupport");
    } catch {
      try {
        const canOpen = await Linking.canOpenURL(SUPPORT_CHAT_URL);
        if (canOpen) {
          await Linking.openURL(SUPPORT_CHAT_URL);
        } else {
          Alert.alert("Error", "Unable to open chat.");
        }
      } catch {
        Alert.alert("Error", "Unable to open chat.");
      }
    }
  }, [router]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScreenShell padded={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </Pressable>

          <Text style={styles.headerTitle}>Support</Text>

          <View style={{ width: 40 }} />
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          <Text style={styles.title}>Need help?</Text>
          <Text style={styles.subtitle}>
            Chat with a customer representative or call us directly.
          </Text>

          <View style={styles.card}>
            {/* Chat Option */}
            <Pressable
              style={[styles.option, styles.divider]}
              onPress={handleChatPress}
            >
              <View style={styles.iconCircle}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={18}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>Chat with Support</Text>
                <Text style={styles.optionSubtitle}>
                  Connect with a representative
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color="#9CA3AF"
              />
            </Pressable>

            {/* Call Option */}
            <Pressable style={styles.option} onPress={handleCallPress}>
              <View style={styles.iconCircle}>
                <Ionicons
                  name="call-outline"
                  size={18}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>Call Support</Text>
                <Text style={styles.optionSubtitle}>
                  {SUPPORT_PHONE}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color="#9CA3AF"
              />
            </Pressable>
          </View>
        </View>
      </ScreenShell>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },

  title: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "600",
    color: "#111827",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 16,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 16,
  },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(22,163,74,0.10)",
    borderWidth: 1,
    borderColor: "rgba(22,163,74,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  optionTextWrap: {
    flex: 1,
  },

  optionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },

  optionSubtitle: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
});