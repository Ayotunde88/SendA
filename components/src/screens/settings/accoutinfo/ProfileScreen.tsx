import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { styles } from "../../../../../theme/styles";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { getUserProfile } from "../../../../../api/config";

interface MenuRowProps {
  iconBg: string;
  icon: string;
  title: string;
  subtitle: string;
  right?: React.ReactNode;
  color?: string;
  onPress?: () => void;
}

function MenuRow({ iconBg, icon, title, subtitle, right, color, onPress }: MenuRowProps) {
  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <View style={[styles.menuIconWrap, { backgroundColor: iconBg }]}>
        <Text style={styles.menuIcon}>{icon}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[styles.menuTitle, color ? { color } : null]}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>

      {right || <Text style={styles.chev}>›</Text>}
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
        // First try to get from local storage (fast)
        const storedUser = await AsyncStorage.getItem("user_info");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setUserInfo({
            fullName: `${parsed.firstName || ''} ${parsed.lastName || ''}`.trim() || 'User',
            email: parsed.email || '',
          });
        }

        // Then fetch fresh data from backend
        const phone = await AsyncStorage.getItem("user_phone");
        if (phone) {
          const result = await getUserProfile(phone);
          if (result.success && result.user) {
            const { firstName, lastName, email } = result.user;
            setUserInfo({
              fullName: `${firstName || ''} ${lastName || ''}`.trim() || 'User',
              email: email || '',
            });
          }
        }
      } catch (e) {
        console.log("Error loading user profile:", e);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, []);

  const logout = async () => {
    try {
      // 🔥 Clear ALL user + session + cached app data
      await AsyncStorage.multiRemove([
        // Auth & user identity
        "auth_token",
        "user_phone",
        "user_info",
        "user_address",
        "user_country_code",
        "user_country_name",
        "user_country_flag",

        // App preferences
        "hide_balance_preference",
        
        // Recipients cache
        "saved_ngn_recipients",
        "recent_recipients",
        "recent_recipients_v1",
        "saved_recipients",

        // Wallet & account caches (from HomeScreen)
        "cached_accounts_v1",
        "cached_total_balance_v1",
        "cached_flags_v1",

        // Synced wallet caches (from useSyncedWallets hook)
        "synced_wallets_v1",
        "synced_total_v1",

        // Transaction caches (from useSyncedTransactions hook)
        "synced_transactions_v1",

        // Pending settlements cache
        "pending_settlements_v1",

        // Region caches (country-specific)
        "regions_canada",
        "regions_united states",
        "regions_mexico",
      ]);

      // Optional: double check token is gone (for debugging)
      const token = await AsyncStorage.getItem("auth_token");
      console.log("Token after logout (should be null):", token);
    } catch (e) {
      console.log("❌ Error during logout:", e);
    } finally {
      // 🚨 VERY IMPORTANT:
      // replace() prevents user from going back into app
      router.replace("/login");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.shell}>
        {/* top back */}
        <View style={styles.profileTopBar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
        </View>

        {/* banner */}
        <View style={styles.banner}>
          <View style={styles.bannerArt} />
        </View>

        {/* avatar + name */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarCircle}>
              <Text style={{ fontSize: 26 }}>🙂</Text>
            </View>
            <View style={styles.avatarPlus}>
              <Text style={{ fontWeight: "900" }}>＋</Text>
            </View>
          </View>

          <View style={{ alignItems: "center" }}>
            {loading ? (
              <ActivityIndicator size="small" color="#6B7280" />
            ) : (
              <>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={styles.profileName}>{userInfo?.fullName || 'User'}</Text>
                  <Text style={styles.greenCheck}> ✓</Text>
                </View>
                <Text style={styles.profileEmail}>{userInfo?.email || ''}</Text>
              </>
            )}
          </View>
        </View>

        {/* menu */}
        <MenuRow
          iconBg="#EFE7DD"
          icon="👤"
          title="Account information"
          subtitle="Information about your account"
          onPress={() => router.push("/accountInfo")}
        />

        <MenuRow
          iconBg="#F4F1D7"
          icon="🎧"
          title="Help and support"
          subtitle="Need help? We've got you."
        />

        <MenuRow
          iconBg="#EAEAEA"
          icon="🔒"
          title="Security and privacy"
          subtitle="Keep your account safe"
          onPress={() => router.push("/securityprivacy")}
        />

        <MenuRow
          iconBg="#DDF2E6"
          icon="🔔"
          title="Notification preferences"
          subtitle="Manage your notifications and messages"
        />

        <MenuRow
          iconBg="#E6DDF2"
          icon="🏢"
          title="About"
          subtitle="Information about LemFi"
        />

        <MenuRow
          iconBg="#F0F0F0"
          icon="🚫"
          title="Log out"
          subtitle=""
          color="#E24A4A"
          onPress={logout}
        />

        <View style={{ flex: 1 }} />

        <Text style={styles.versionText}>Version 5.15.0</Text>
      </View>
    </SafeAreaView>
  );
}
