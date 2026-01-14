import React, { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { COLORS } from "../theme/colors";
import { useFonts, Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [authChecked, setAuthChecked] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem("auth_token");

        // segments could be ["(tabs)"] or ["(auth)","verifynumber"] etc.
        const first = String(segments?.[0] ?? "");
        const second = String(segments?.[1] ?? "");

        // ✅ Any screens you want accessible without token
        const publicScreens = new Set([
          "login",
          "getstarted",
          "resetpassword",
          "verifynumber",
          "setpin",
          "basicinfo",
          "protectpassword",
          "globalaccount",
        ]);

        // // ✅ Allow if current route is public (either in first or second segment)
        const isPublic = publicScreens.has(first) || publicScreens.has(second);

        // ✅ If you are using a route group for auth like "(auth)", allow that group too
        const isAuthGroup = first === "(auth)";

        // If not authenticated, block access to private routes
        if (!token && !(isPublic || isAuthGroup)) {
          router.replace("/login");
        }

        setAuthChecked(true);
      } catch (e) {
        router.replace("/login");
        setAuthChecked(true);
      }
    };

    if (fontsLoaded) checkAuth();
  }, [fontsLoaded, segments, router]);

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
      <Stack.Screen name="getstarted" options={{ title: "Get Started", headerShown: false }} />
      <Stack.Screen name="login" />
      <Stack.Screen name="resetpassword" options={{ title: "Reset Password" }} />
      <Stack.Screen name="profile" options={{ title: "Profile" }} />
      <Stack.Screen name="bank-details" options={{ title: "Bank Details" }} />
      <Stack.Screen name="basicinfo" options={{ title: "Basic Information" }} />
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
      <Stack.Screen name="convert" options={{ title: "Convert" }} />
      <Stack.Screen name="exchangerates" options={{ title: "Exchange Rates" }} />
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
