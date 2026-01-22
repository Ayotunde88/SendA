import React from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { styles } from "../../../theme/styles";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";

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
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.profileName}>Ayotunde Balogun</Text>
              <Text style={styles.greenCheck}> ✓</Text>
            </View>
            <Text style={styles.profileEmail}>ayotundebalogun2@gmail.com</Text>
          </View>
        </View>

        {/* menu */}
        <MenuRow
          iconBg="#EFE7DD"
          icon="👤"
          title="Account information"
          subtitle="Information about your account"
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