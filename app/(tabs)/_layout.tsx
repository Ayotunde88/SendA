import React from "react";
import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../../theme/colors";
import { styles } from "../../theme/styles";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { useNotificationContext } from "../../context/NotificationContext";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];
type FontAwesomeName = React.ComponentProps<typeof FontAwesome6>["name"];

interface TabBarIconProps {
  name: IoniconName | FontAwesomeName;
  focused: boolean;
  lib?: "fa" | "ion";
  badge?: number;
}

function TabBarIcon({ name, focused, lib = "fa", badge }: TabBarIconProps) {
  const color = focused ? COLORS.green : "#A3A3A3";
  const size = 22;

  const icon =
    lib === "ion" ? (
      <Ionicons name={name as IoniconName} size={size} color={color} />
    ) : (
      <FontAwesome6 name={name as FontAwesomeName} size={size} color={color} />
    );

  return (
    <View style={{ position: "relative" }}>
      {icon}
      {badge !== undefined && badge > 0 && (
        <View style={badgeStyles.badge}>
          <Text style={badgeStyles.badgeText}>
            {badge > 99 ? "99+" : badge}
          </Text>
        </View>
      )}
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    backgroundColor: COLORS.red || "#EF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
});

export default function TabsLayout() {
  const { unreadCount } = useNotificationContext();

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

      {/* Notifications */}
      <Tabs.Screen
        name="notification"
        options={{
          title: "Notifications",
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="bell" focused={focused} badge={unreadCount} />
          ),
        }}
      />


      {/* Referral */}
      <Tabs.Screen
        name="referral"
        options={{
          title: "Referral",
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="gift" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
