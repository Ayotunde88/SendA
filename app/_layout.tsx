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
      const token = await AsyncStorage.getItem("auth_token");
      const firstSegment = segments[0];
      
      // Auth screens that don't require login
      const authScreens = ["login", "get-started", "verifynumber", "setpin", "basicinfo", "protectpassword", "globalaccount"];
      const isAuthScreen = authScreens.includes(firstSegment as string);

      if (!token && !isAuthScreen) {
        router.replace("/login");
      }
      
      setAuthChecked(true);
    };

    if (fontsLoaded) {
      checkAuth();
    }
  }, [fontsLoaded, segments]);

  if (!fontsLoaded || !authChecked) return null;

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: COLORS.bg },
        contentStyle: { backgroundColor: COLORS.bg },
        headerTitleStyle: { fontWeight: "900" },
        headerShown: false
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="get-started" options={{ title: "Get Started", headerShown: false }} />
      <Stack.Screen name="login" />
      <Stack.Screen name="reset-password" options={{ title: "Reset Password" }} />
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
      <Stack.Screen name="all-transactions" options={{ title: "Transactions" }} />
      <Stack.Screen name="send-money-ngn" options={{ title: "Send money" }} />
      <Stack.Screen name="recipients" options={{ title: "" }} />
      <Stack.Screen name="recipient-details" options={{ title: "" }} />
      <Stack.Screen name="review-details" options={{ title: "" }} />
      <Stack.Screen name="fraud-aware" options={{ title: "" }} />
      <Stack.Screen name="pin" options={{ title: "" }} />
    </Stack>
  );
}
