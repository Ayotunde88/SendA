import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { getUserProfile } from "../../../../../api/config";
import { COLORS } from "../../../../../theme/colors";
import { styles } from "../../../../../theme/styles";

interface MenuRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  title: string;
  subtitle?: string;
  color?: string;
  onPress?: () => void;
}

function MenuRow({
  icon,
  iconBg,
  title,
  subtitle,
  color,
  onPress,
}: MenuRowProps) {
  return (
    <Pressable style={local.menuRow} onPress={onPress}>
      <View style={[local.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={COLORS.primary} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[local.menuTitle, color && { color }]}>{title}</Text>
        {!!subtitle && (
          <Text style={local.menuSubtitle}>{subtitle}</Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();

  const [userInfo, setUserInfo] = useState<{
    fullName: string;
    email: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user_info");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setUserInfo({
            fullName:
              `${parsed.firstName || ""} ${parsed.lastName || ""}`.trim() ||
              "User",
            email: parsed.email || "",
          });
        }

        const phone = await AsyncStorage.getItem("user_phone");
        if (phone) {
          const result = await getUserProfile(phone);
          if (result.success && result.user) {
            const { firstName, lastName, email } = result.user;
            setUserInfo({
              fullName:
                `${firstName || ""} ${lastName || ""}`.trim() || "User",
              email: email || "",
            });
          }
        }
      } catch (e) {
        console.log("Profile load error:", e);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, []);

  const logout = useCallback(async () => {
    try {
      await AsyncStorage.clear();
    } catch (e) {
      console.log("Logout error:", e);
    } finally {
      router.replace("/login");
    }
  }, [router]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={styles.shell}>
        {/* Header */}
        <View style={local.header}>
          <Pressable onPress={() => router.back()} style={local.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </Pressable>
          <Text style={local.headerTitle}>Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Avatar Section */}
        <View style={local.profileHeader}>
          <View style={local.avatarCircle}>
            <Ionicons name="person" size={32} color="#fff" />
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={local.name}>
                  {userInfo?.fullName || "User"}
                </Text>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={COLORS.primary}
                  style={{ marginLeft: 6 }}
                />
              </View>
              <Text style={local.email}>{userInfo?.email}</Text>
            </>
          )}
        </View>

        {/* Menu Card */}
        <View style={local.card}>
          <MenuRow
            icon="person-outline"
            iconBg="rgba(22,163,74,0.10)"
            title="Account information"
            subtitle="Information about your account"
            onPress={() => router.push("/accountInfo")}
          />

          <MenuRow
            icon="headset-outline"
            iconBg="rgba(59,130,246,0.10)"
            title="Help and support"
            subtitle="Need help? We've got you."
            onPress={() => router.push("/support")}
          />

          <MenuRow
            icon="shield-checkmark-outline"
            iconBg="rgba(107,114,128,0.10)"
            title="Security and privacy"
            subtitle="Keep your account safe"
            onPress={() => router.push("/securityprivacy")}
          />

          <MenuRow
            icon="notifications-outline"
            iconBg="rgba(168,85,247,0.10)"
            title="Notification preferences"
            subtitle="Manage your notifications"
          />

          <MenuRow
            icon="information-circle-outline"
            iconBg="rgba(14,165,233,0.10)"
            title="About"
            subtitle="Information about your app"
          />
        </View>

        {/* Logout */}
        <Pressable style={local.logoutRow} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color="#E11D48" />
          <Text style={local.logoutText}>Log out</Text>
        </Pressable>

        <View style={{ flex: 1 }} />

        <Text style={local.versionText}>Version 5.15.0</Text>
      </View>
    </SafeAreaView>
  );
}

const local = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    fontWeight: "900",
    fontSize: 16,
    color: "#111827",
  },
  profileHeader: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  email: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    overflow: "hidden",
    marginHorizontal: 16,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },
  menuSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 3,
  },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    marginHorizontal: 16,
    marginTop: 20,
  },
  logoutText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: "900",
    color: "#E11D48",
  },
  versionText: {
    textAlign: "center",
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 12,
  },
});