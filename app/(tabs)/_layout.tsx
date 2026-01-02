import React from "react";
import { Tabs } from "expo-router";
import { View } from "react-native";
import { COLORS } from "../../theme/colors";
import { styles } from "../../theme/styles";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";

interface TabBarIconProps {
  name: string;
  focused: boolean;
  lib?: "fa" | "ion";
}

function TabBarIcon({ name, focused, lib = "fa" }: TabBarIconProps) {
  const color = focused ? COLORS.green : "#A3A3A3";
  const size = 22;

  if (lib === "ion") {
    return <Ionicons name={name} size={size} color={color} />;
  }

  return <FontAwesome6 name={name} size={size} color={color} />;
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
      {/* Home */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="house" focused={focused} />
          ),
        }}
      />

      {/* Transactions */}
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Transactions",
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="arrow-right-arrow-left" focused={focused} />
          ),
        }}
      />

      {/* Notification */}
      <Tabs.Screen
        name="notification"
        options={{
          title: "Notifications",
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="bell" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
