import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../../../theme/colors";
import { getUserProfile } from "../../../../../api/config";

type ProfileInfo = {
  fullName?: string;
  dob?: string;
  street?: string;
  buildingOrHouse?: string;
  apartment?: string;
  unit?: string;
  city?: string;
  province?: string;
  email?: string;
  phone?: string;
  country?: string;
  postalCode?: string;
};

function safeStr(v: any) {
  const s = String(v ?? "").trim();
  return s;
}

// Extract leading number from street address (e.g., "601 Queen Elizabeth Way" → "601")
function extractLeadingNumber(str: string): string {
  const match = str.match(/^(\d+)/);
  return match ? match[1] : "";
}

function Row({
  icon,
  label,
  value,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={[s.row, !isLast && s.rowDivider]}>
      <View style={s.rowLeft}>
        <View style={s.iconCircle}>
          <Ionicons name={icon} size={16} color={COLORS.primary} />
        </View>
        <Text style={s.rowLabel}>{label}</Text>
      </View>
      <Text style={s.rowValue} numberOfLines={1}>
        {value || "—"}
      </Text>
    </View>
  );
}

export default function UserDetailsScreen() {
  const router = useRouter();
  const [info, setInfo] = useState<ProfileInfo>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Load from both user_info and user_address caches
        const [rawUserInfo, rawAddress, phone] = await Promise.all([
          AsyncStorage.getItem("user_info"),
          AsyncStorage.getItem("user_address"),
          AsyncStorage.getItem("user_phone"),
        ]);

        const cachedUserInfo = rawUserInfo ? JSON.parse(rawUserInfo) : {};
        const cachedAddress = rawAddress ? JSON.parse(rawAddress) : {};

        // Helper to get first non-empty value
        const nonEmpty = (...vals: any[]): string => {
          for (const v of vals) {
            const s = safeStr(v);
            if (s) return s;
          }
          return "";
        };

        // Helper to extract nested address object if present
        const getAddressLike = (u: any) =>
          u?.address || u?.homeAddress || u?.user_address || u?.userAddress || u?.profile?.address || {};

        const setInfoFromData = (user: any, address: any, phoneNumber: string | null) => {
          const apiAddr = getAddressLike(user);

          const firstName = safeStr(user.firstName || user.first_name);
          const lastName = safeStr(user.lastName || user.last_name);
          const fullName = nonEmpty(
            `${firstName} ${lastName}`.trim(),
            user.fullName,
            user.full_name,
            user.name,
            user.displayName,
            user.display_name
          );

          // Get street value first so we can extract leading number if needed
          const streetValue = nonEmpty(
            user.street,
            apiAddr.street,
            user.addressLine1,
            user.address_1,
            apiAddr.addressLine1,
            apiAddr.address_1,
            address.street,
            address.addressLine1,
            address.address_1
          );

          // Building identifier (DB column: buildingOrHouse). Also handle common API key variants.
          const buildingOrHouseValue = nonEmpty(
            user.buildingOrHouse,
            user.building_or_house,
            // Backend profile shape: { address: { building: "601", ... } }
            apiAddr.building,
            apiAddr.address_building,
            apiAddr.address_building,
            // Alternate keys some endpoints may use
            apiAddr.buildingOrHouse,
            apiAddr.building_or_house,
            address.building,
            address.address_building,
            address.buildingOrHouse,
            address.building_or_house,

            // Legacy/alternate keys some endpoints use for the same value
            user.streetNumber,
            user.street_number,
            apiAddr.streetNumber,
            apiAddr.street_number,
            address.streetNumber,
            address.street_number,
            user.houseNumber,
            user.house_number,
            apiAddr.houseNumber,
            apiAddr.house_number,
            address.houseNumber,
            address.house_number,
            user.house,
            apiAddr.house,
            address.house,

            // Final fallback: pull the leading digits from the street string
            extractLeadingNumber(streetValue)
          );

          setInfo((prev) => ({
            ...prev,
            fullName,
            dob: nonEmpty(user.dob, user.dateOfBirth, user.date_of_birth),
            street: streetValue,
            buildingOrHouse: buildingOrHouseValue,
            apartment: nonEmpty(
              user.apartment,
              apiAddr.apartment,
              user.unit,
              apiAddr.unit,
              address.apartment,
              address.unit
            ),
            city: nonEmpty(user.city, apiAddr.city, address.city),
            province: nonEmpty(
              user.stateOrProvince,
              apiAddr.stateOrProvince,
              user.province,
              apiAddr.province,
              user.region,
              apiAddr.region,
              address.stateOrProvince,
              address.province,
              address.region
            ),

            email: nonEmpty(user.email, prev.email),
            phone: nonEmpty(user.phone, phoneNumber, prev.phone),
            country: nonEmpty(
              user.countryName,
              apiAddr.countryName,
              user.country,
              apiAddr.country,
              user.country_name,
              apiAddr.country_name,
              address.countryName,
              address.country
            ),
            postalCode: nonEmpty(
              user.postalCode,
              apiAddr.postalCode,
              user.postal_code,
              apiAddr.postal_code,
              user.zip,
              apiAddr.zip,
              address.postalCode,
              address.postal_code
            ),
          }));
        };

        // Show cached data immediately
        setInfoFromData(cachedUserInfo, cachedAddress, phone);
        setLoading(false);

        // Fetch fresh data from backend
        if (phone) {
          const result = await getUserProfile(phone);
          if (result.success && result.user) {
            setInfoFromData(result.user, cachedAddress, phone);
          }
        }
      } catch (e) {
        console.log("Error loading profile:", e);
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const rows = useMemo(
    () => [
      { icon: "person-outline" as const, label: "Full name", value: info.fullName || "" },
      { icon: "calendar-outline" as const, label: "Date Of Birth", value: info.dob || "" },
      { icon: "location-outline" as const, label: "Street", value: info.street || "" },
      { icon: "home-outline" as const, label: "Apartment", value: info.buildingOrHouse || "" },
      { icon: "business-outline" as const, label: "City", value: info.city || "" },
      { icon: "map-outline" as const, label: "Province", value: info.province || "" },
      { icon: "mail-outline" as const, label: "Email Address", value: info.email || "" },
      { icon: "call-outline" as const, label: "Phone number", value: info.phone || "" },
      { icon: "flag-outline" as const, label: "Country", value: info.country || "" },
      { icon: "mail-open-outline" as const, label: "Postal Code", value: info.postalCode || "" },
    ],
    [info]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </Pressable>
          <Text style={s.headerTitle}>Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Card */}
        <View style={s.card}>
          {loading ? (
            <View style={s.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : (
            rows.map((r, idx) => (
              <Row
                key={r.label}
                icon={r.icon}
                label={r.label}
                value={r.value}
                isLast={idx === rows.length - 1}
              />
            ))
          )}
        </View>

        {/* Yellow info banner */}
        <View style={s.notice}>
          <Ionicons name="information-circle-outline" size={18} color="#92400E" />
          <Text style={s.noticeText}>
            You are unable to edit this profile because your account has already been verified.
            If you feel that you need to edit, please reach out to customer support.
          </Text>
        </View>
      </ScrollView>
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
    marginTop: 10,
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
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
  },
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
  rowLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#374151",
  },
  rowValue: {
    maxWidth: "46%",
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },

  notice: {
    marginTop: 14,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  noticeText: {
    flex: 1,
    color: "#92400E",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
});
