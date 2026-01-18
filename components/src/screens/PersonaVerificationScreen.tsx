import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { WebView, WebViewMessageEvent, WebViewNavigation } from "react-native-webview";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPersonaInquiryStatus } from "@/api/config";
// Injected JS to listen for Persona hosted flow events
const PERSONA_BRIDGE_JS = `
  (function() {
    // Listen for Persona postMessage events
    window.addEventListener('message', function(event) {
      try {
        var data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        // Persona emits events like { type: 'persona', event: 'complete', ... }
        if (data && (data.type === 'persona' || data.source === 'persona')) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'persona_event',
            event: data.event || data.name || data.type,
            status: data.status,
            inquiryId: data.inquiryId
          }));
        }
        
        // Alternative format: { name: 'inquiry-complete', ... }
        if (data && data.name && data.name.includes('complete')) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'persona_event',
            event: 'complete',
            status: 'completed'
          }));
        }
      } catch(e) {}
    });
    
    // Also watch for URL hash changes (some flows use this)
    var lastHash = window.location.hash;
    setInterval(function() {
      if (window.location.hash !== lastHash) {
        lastHash = window.location.hash;
        if (lastHash.includes('complete') || lastHash.includes('success')) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'persona_event',
            event: 'complete',
            status: 'completed'
          }));
        }
      }
    }, 500);
    
    true;
  })();
`;
export default function PersonaVerificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    url: string;
    inquiryId: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const verificationUrl = params.url;
//   const inquiryId = "inq_vJ4TdTrgPYJxG5chpqsURsNrQaRt"; // Sample inquiry ID
  const inquiryId = params.inquiryId;
  const handleWebViewMessage = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log("[Persona] WebView message:", data);

      if (data.type === "persona_event") {
        if (
          data.event === "complete" ||
          data.event === "completed" ||
          data.status === "completed"
        ) {
          if (!completed) {
            setCompleted(true);
            await handleVerificationComplete();
          }
        } else if (
          data.event === "cancel" ||
          data.event === "cancelled" ||
          data.event === "fail" ||
          data.event === "failed"
        ) {
          Alert.alert(
            "Verification Cancelled",
            "You can try again later from the home screen.",
            [{ text: "OK", onPress: () => router.replace("/(tabs)") }]
          );
        }
      }
    } catch (e) {
      // Not JSON, ignore
    }
  };
  // Detect when Persona verification is complete by monitoring URL changes
  const handleNavigationChange = async (navState: WebViewNavigation) => {
    const { url } = navState;

    // Persona redirects to these patterns when verification is complete
    if (
      !completed &&
      (url.includes("/complete") ||
        url.includes("persona-complete") ||
        url.includes("status=completed") ||
        url.includes("inquiry-complete") ||
        url.includes("/done") ||
        url.includes("verification-complete"))
    ) {
      setCompleted(true);
      await handleVerificationComplete();
    }

    // Persona may also redirect on failure/cancel
    if (
      url.includes("/cancel") ||
      url.includes("status=failed") ||
      url.includes("status=expired")
    ) {
      Alert.alert(
        "Verification Cancelled",
        "You can try again later from the home screen.",
        [{ text: "OK", onPress: () => router.replace("/(tabs)") }]
      );
    }
  };

  const handleVerificationComplete = async () => {
    try {
      // Poll the backend to get the latest inquiry status
      if (inquiryId) {
        const statusResult = await getPersonaInquiryStatus(inquiryId);
        console.log("[Persona] Inquiry status after completion:", statusResult);

        // Update local storage to reflect pending KYC (admin will approve)
        const userInfoStr = await AsyncStorage.getItem("user_info");
        if (userInfoStr) {
          const userInfo = JSON.parse(userInfoStr);
          userInfo.kycStatus = "pending"; // Now waiting for admin approval
          await AsyncStorage.setItem("user_info", JSON.stringify(userInfo));
        }
      }

      Alert.alert(
        "Verification Submitted",
        "Your identity verification has been submitted for review. You'll be notified once approved.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      console.error("[Persona] Error checking completion status:", error);
      router.back();
      Alert.alert(
        "Verification Submitted",
        "Your verification has been submitted. You'll be notified of the result.",
        [{ text: "OK", onPress: () => router.replace("/(tabs)") }]
      );
    }
  };

  const handleClose = () => {
    Alert.alert(
      "Cancel Verification?",
      "Are you sure you want to cancel? You can resume verification later.",
      [
        { text: "Continue Verification", style: "cancel" },
        {
          text: "Cancel",
          style: "destructive",
          onPress: () => router.replace("/(tabs)"),
        },
      ]
    );
  };

  if (!verificationUrl) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
          <Text style={styles.errorText}>Verification URL not available</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace("/(tabs)")}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Identity Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading verification...</Text>
        </View>
      )}

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: verificationUrl }}
        style={[styles.webview, loading && { opacity: 0 }]}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={handleNavigationChange}
        onMessage={handleWebViewMessage}
        injectedJavaScript={PERSONA_BRIDGE_JS}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        // Enable camera access for selfie/ID scanning
        mediaCapturePermissionGrantType="grant"
        allowsFullscreenVideo={true}
        // Handle errors
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error("[Persona WebView] Error:", nativeEvent);
          Alert.alert(
            "Error",
            "Failed to load verification. Please try again.",
            [{ text: "OK", onPress: () => router.back() }]
          );
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error("[Persona WebView] HTTP Error:", nativeEvent.statusCode);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.text,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});