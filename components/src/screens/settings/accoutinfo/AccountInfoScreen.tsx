import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenShell from "../../../../../components/ScreenShell";
import { COLORS } from "../../../../../theme/colors";

function Item({
  icon,
  title,
  rightText,
  onPress,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  rightText?: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[s.item, !isLast && s.divider]}>
      <View style={s.itemLeft}>
        <View style={s.iconCircle}>
          <Ionicons name={icon} size={16} color={COLORS.primary} />
        </View>
        <Text style={s.itemTitle}>{title}</Text>
      </View>

      <View style={s.itemRight}>
        {!!rightText && <Text style={s.rightText}>{rightText}</Text>}
        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      </View>
    </Pressable>
  );
}

export default function AccountInformationScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScreenShell padded={false}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </Pressable>
          <Text style={s.headerTitle}>Account Information</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={s.card}>
          <Item
            icon="person-outline"
            title="Profile"
            onPress={() => router.push("/userdetails" as any)}
          />
          <Item
            icon="speedometer-outline"
            title="Account limits"
            onPress={() => router.push("/accountlimit" as any)}
          />
          {/* <Item
            icon="document-text-outline"
            title="Account statement"
            onPress={() => router.push("/accountstatement" as any)}
          />
          <Item
            icon="globe-outline"
            title="Language"
            rightText="English"
            onPress={() => router.push("/language" as any)}
            isLast
          /> */}
        </View>
      </ScreenShell>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
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
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },

  card: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  item: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  itemLeft: { flexDirection: "row", alignItems: "center" },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "rgba(22,163,74,0.10)",
    borderWidth: 1,
    borderColor: "rgba(22,163,74,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  itemTitle: { fontSize: 14, fontWeight: "900", color: "#111827" },
  itemRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  rightText: { fontSize: 13, fontWeight: "900", color: "#16A34A" },
});
