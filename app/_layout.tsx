import React, { useEffect, useMemo, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { COLORS } from "../theme/colors";
import { useFonts, Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NotificationProvider } from "../context/NotificationContext";

function RootLayoutContent() {
  const router = useRouter();
  const segments = useSegments();
  const [authChecked, setAuthChecked] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
  });

  // ✅ Any screens you want accessible without token
  // Add BOTH spellings if you ever used a different file name previously.
  const publicScreens = useMemo(
    () =>
      new Set([
        // "login",
        // "getstarted",
        // "resetpassword",
        // "verifynumber",
        // "verifyphonenumber", // optional safety if you used this name anywhere
        // "setpin",
        // "basicinfo",
        // "protectpassword",
        // "globalaccount",
        // "networkerrorstate",
      ]),
    []
  );

  useEffect(() => {
    if (!fontsLoaded) return;

    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem("auth_token");

        // segments examples:
        // ["(tabs)"]
        // ["(auth)", "getstarted"]
        // ["(auth)", "verifynumber"]
        // ["withdraw"] etc
        const first = String(segments?.[0] ?? "");
        const leaf = String(segments?.[segments.length - 1] ?? "");

        // ✅ If you are using a route group for auth like "(auth)", allow that group too
        const isAuthGroup = first === "(auth)";

        // ✅ Allow if current route is public (we check leaf, not only first/second)
        // const isPublic = publicScreens.has(leaf) || publicScreens.has(first);

        // ✅ If not authenticated, block access to private routes
        // Choose where you want unauth users to land:
        // - "/getstarted" if you want onboarding first
        // - "/login" if you want login first
        // if (!token && !(isPublic || isAuthGroup)) {
        //   router.replace("/login");
        // }

        setAuthChecked(true);
      } catch (e) {
        // If AsyncStorage fails, treat as logged out
        router.replace("/getstarted");
        setAuthChecked(true);
      }
    };

    checkAuth();
    // IMPORTANT: segments changes during navigation — that's fine now because leaf detection is correct
  }, [fontsLoaded, segments, router, publicScreens]);

  if (!fontsLoaded || !authChecked) return null;

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: COLORS.bg },
        contentStyle: { backgroundColor: COLORS.bg },
        headerTitleStyle: { fontWeight: "900" },
        headerShown: false,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="networkerrorstate" options={{ title: "Network Error", headerShown: false }} />
      <Stack.Screen name="getstarted" options={{ title: "Get Started", headerShown: false }} />
      <Stack.Screen name="login" />
      <Stack.Screen name="resetpassword" options={{ title: "Reset Password" }} />
      <Stack.Screen name="profile" options={{ title: "Profile" }} />
      <Stack.Screen name="bank-details" options={{ title: "Bank Details" }} />
      <Stack.Screen name="basicinfo" options={{ title: "Basic Information" }} />
      <Stack.Screen name="personaverification" options={{ title: "Identity Verification" }} />
      <Stack.Screen name="addaccount" options={{ title: "Add Account" }} />
      <Stack.Screen name="globalaccount" options={{ title: "Global Account" }} />
      <Stack.Screen name="security-privacy" options={{ title: "Security and Privacy" }} />
      <Stack.Screen name="setpin" options={{ title: "Set Transaction PIN" }} />
      <Stack.Screen name="get-help" options={{ title: "Get Help" }} />
      <Stack.Screen name="protectpassword" options={{ title: "Protect Password" }} />
      <Stack.Screen name="verifynumber" options={{ title: "Verify Number" }} />
      <Stack.Screen name="transaction-pin" options={{ title: "Transaction PIN" }} />
      <Stack.Screen name="wallet" options={{ title: "" }} />
      <Stack.Screen name="ngn-wallet" options={{ title: "" }} />
      <Stack.Screen name="send-money" options={{ title: "Send money" }} />
      <Stack.Screen name="add-money-methods" options={{ title: "" }} />
      <Stack.Screen name="addmoneycard" options={{ title: "Add Money" }} />
      <Stack.Screen name="addmoneyeft" options={{ title: "Add Money via EFT" }} />
      <Stack.Screen name="addmoneyinterac" options={{ title: "Add Money via Interac" }} />
      <Stack.Screen name="convert" options={{ title: "Convert" }} />
      <Stack.Screen name="referral" options={{ title: "Referral" }} />
      <Stack.Screen name="withdraw" options={{ title: "Withdraw" }} />

      <Stack.Screen name="exchangerates" options={{ title: "Exchange Rates" }} />
      <Stack.Screen name="ratealerts" options={{ title: "Rate Alerts" }} />
      <Stack.Screen name="all-transactions" options={{ title: "Transactions" }} />
      <Stack.Screen name="transactiondetail/[reference]" options={{ title: "Transaction Details" }} />
      <Stack.Screen name="send-money-ngn" options={{ title: "Send money" }} />
      <Stack.Screen name="recipients" options={{ title: "" }} />
      <Stack.Screen name="recipient-details" options={{ title: "" }} />
      <Stack.Screen name="review-details" options={{ title: "" }} />
      <Stack.Screen name="fraud-aware" options={{ title: "" }} />
      <Stack.Screen name="pin" options={{ title: "" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <NotificationProvider>
      <RootLayoutContent />
    </NotificationProvider>
  );
}
