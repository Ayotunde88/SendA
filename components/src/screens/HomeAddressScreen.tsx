import React, { useEffect, useState } from "react";
import { View, Text, Pressable, TextInput, ActivityIndicator, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import ScreenShell from "../../../components/ScreenShell";
import { styles } from "../../../theme/styles";
import RegionDropdown from "../../RegionDropdownScreen";
import { getRegionsByCountryName, Region, saveUserAddress } from "../../../api/config";

type StoredCountry = { code: string; name: string; flag?: string };

function regionLabelFor(countryCode?: string) {
  if (countryCode === "CA") return "Province";
  if (countryCode !== "CA") return "State";
  return "State / Province";
}

// Countries that require state/province and postal code
const REQUIRES_STATE_POSTAL = ["US", "CA", "MX"];

export default function HomeAddressScreen() {
  const router = useRouter();

  const [country, setCountry] = useState<StoredCountry | null>(null);
  const [loadingCountry, setLoadingCountry] = useState(true);
  const [saving, setSaving] = useState(false);

  const [building, setBuilding] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [regions, setRegions] = useState<Region[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [region, setRegion] = useState<Region | null>(null);

  const label = regionLabelFor(country?.code);
  const requiresStatePostal = country?.code ? REQUIRES_STATE_POSTAL.includes(country.code) : false;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const code = (await AsyncStorage.getItem("user_country_code")) || "";
        const name = (await AsyncStorage.getItem("user_country_name")) || "";
        const flag = (await AsyncStorage.getItem("user_country_flag")) || "";

        if (!mounted) return;
        setCountry(code && name ? { code, name, flag } : { code: "CA", name: "Canada", flag: "🇨🇦" });
      } finally {
        if (mounted) setLoadingCountry(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!country?.name) return;

    let mounted = true;
    (async () => {
      setRegionsLoading(true);
      setRegion(null);

      try {
        const cacheKey = `regions_${country.name.toLowerCase()}`;
        const cached = await AsyncStorage.getItem(cacheKey);

        if (cached) {
          const parsed: Region[] = JSON.parse(cached);
          if (mounted) setRegions(parsed);
          return;
        }

        const data = await getRegionsByCountryName(country.name);
        if (mounted) {
          setRegions(data);
          await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
        }
      } catch (e: any) {
        if (mounted) setRegions([]);
        console.log("Regions fetch failed:", e?.message || e);
      } finally {
        if (mounted) setRegionsLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [country?.name]);

  const canSave =
    building.trim().length > 0 &&
    street.trim().length > 0 &&
    city.trim().length > 0 &&
    (regions.length > 0 ? !!region : true) &&
    // Require postal code for US, CA, MX
    (requiresStatePostal ? postalCode.trim().length > 0 : true) &&
    !saving;

  const saveAddress = async () => {
    if (!canSave) return;

    setSaving(true);

    try {
      const phone = await AsyncStorage.getItem("user_phone");
      if (!phone) {
        Alert.alert("Error", "Phone number not found. Please restart onboarding.");
        setSaving(false);
        return;
      }

      const payload = {
        phone,
        countryCode: country?.code ?? "",
        countryName: country?.name ?? "",
        buildingOrHouse: building.trim(),
        street: street.trim(),
        city: city.trim(),
        region: region?.name ?? "",
        stateOrProvince: region?.name ?? "",
        postalCode: postalCode.trim(),
      };

      const result = await saveUserAddress(payload);

      if (!result.success) {
        Alert.alert("Error", result.message || "Failed to save address");
        setSaving(false);
        return;
      }

      await AsyncStorage.setItem("user_address", JSON.stringify(payload));
      router.replace("/");
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Something went wrong");
      setSaving(false);
    }
  };

  return (
    <ScreenShell>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Pressable style={styles.getHelpPill}>
          <Text style={styles.getHelpText}>Get help</Text>
        </Pressable>
      </View>

      <Text style={styles.bigTitle}>What&apos;s your home address?</Text>

      <Text style={[styles.muted, { marginTop: 6, marginBottom: 18 }]}>
        {loadingCountry
          ? "Loading..."
          : `Enter your ${country?.name ?? "country"} home address, No P.O Boxes.`}
      </Text>

      <Text style={styles.inputLabel}>Building/House number</Text>
      <View style={styles.inputBox}>
        <TextInput value={building} onChangeText={setBuilding} style={styles.input} />
      </View>

      <Text style={[styles.inputLabel, { marginTop: 16 }]}>Street name</Text>
      <View style={styles.inputBox}>
        <TextInput value={street} onChangeText={setStreet} style={styles.input} />
      </View>

      <Text style={[styles.inputLabel, { marginTop: 16 }]}>City</Text>
      <View style={styles.inputBox}>
        <TextInput
          value={city}
          onChangeText={setCity}
          style={styles.input}
          placeholder="Enter city"
          placeholderTextColor="#B3B3B3"
        />
      </View>

      <View style={{ marginTop: 16 }}>
        {regionsLoading ? (
          <>
            <Text style={styles.inputLabel}>{label}</Text>
            <View style={[styles.inputBox, { justifyContent: "center" }]}>
              <ActivityIndicator />
            </View>
          </>
        ) : regions.length > 0 ? (
          <RegionDropdown label={label} value={region} onChange={setRegion} regions={regions} />
        ) : (
          <>
            <Text style={styles.inputLabel}>{label}</Text>
            <View style={styles.inputBox}>
              <TextInput
                value={region?.name ?? ""}
                onChangeText={(t) => setRegion({ code: t, name: t })}
                placeholder={`Enter ${label.toLowerCase()}`}
                placeholderTextColor="#B3B3B3"
                style={styles.input}
              />
            </View>
          </>
        )}
      </View>

      <Text style={[styles.inputLabel, { marginTop: 16 }]}>
        Postal Code {requiresStatePostal && <Text style={{ color: "#E53935" }}>*</Text>}
      </Text>
      <View style={styles.inputBox}>
        <TextInput
          value={postalCode}
          onChangeText={setPostalCode}
          style={styles.input}
          placeholder="Enter postal code"
          placeholderTextColor="#B3B3B3"
          autoCapitalize="characters"
        />
      </View>

      <View style={{ marginTop: 28 }}>
        <Pressable
          onPress={saveAddress}
          disabled={!canSave}
          style={canSave ? styles.primaryBtn : styles.disabledBigBtn}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={canSave ? styles.primaryBtnText : { color: "#B3B3B3", fontWeight: "800", fontSize: 18 }}>
              Save address
            </Text>
          )}
        </Pressable>
      </View>
    </ScreenShell>
  );
}
