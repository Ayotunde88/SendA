import React from "react";
import { Tabs } from "expo-router";
import { View, Text } from "react-native";
import { COLORS } from "../../theme/colors";
import { styles } from "../../theme/styles";
import { Stack } from "expo-router";
import { useFonts, Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";

interface TabIconProps {
  label: string;
  focused: boolean;
}
function TabIcon({ label, focused }: TabIconProps) {

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
  });

  if (!fontsLoaded) return null;
  return (
    <View style={[styles.tabIconDot, focused && { backgroundColor: COLORS.greenSoft }]}>
      <Text style={[styles.tabIconText, focused && { color: COLORS.green }]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarActiveTintColor: COLORS.green,
        tabBarInactiveTintColor: "#A3A3A3",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon label="⌂" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Transactions",
          tabBarIcon: ({ focused }) => <TabIcon label="⟂" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="referral"
        options={{
          title: "Referral",
          tabBarIcon: ({ focused }) => <TabIcon label="🎁" focused={focused} />,
        }}
      />
      {/* <Tabs.Screen
        name="help"
        options={{
          title: "Help",
          tabBarIcon: ({ focused }) => <TabIcon label="?" focused={focused} />,
        }}
      /> */}
    </Tabs>
  );
}
