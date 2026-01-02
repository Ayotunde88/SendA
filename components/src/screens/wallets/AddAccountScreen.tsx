import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { styles } from "../../../../theme/styles";
import { getPublicCurrencies, createCurrencyAccount } from "@/api/config";

import { Alert } from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";

interface Currency {
  countryCode: string;
  code: string;
  name: string;
  countryName: string;
  flag: string;
  symbol: string;
}

interface CurrencyRowProps {
  flag: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  symbol?: string;
  code?: string;
  countryCode?: string;
}

function CurrencyRow({ flag, title, subtitle, symbol, code, countryCode, onPress }: CurrencyRowProps) {
  return (
    <Pressable style={styles.addAccRow} onPress={onPress}>
      <Text style={styles.addAccFlag}>{flag}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.addAccTitle}>{title}</Text>
        <Text style={styles.addAccSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.chev}>›</Text>
    </Pressable>
  );
}

export default  function AddAccountScreen() {
  const router = useRouter();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPhone, setUserPhone] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const storedphone = await AsyncStorage.getItem("user_phone");
        if (mounted && storedphone) {
          try {
            // const parsed = JSON.parse(phone);
            setUserPhone(storedphone);
          } catch (e) {
            console.warn("Failed to parse user_info:", e);
          }
        }
      } catch (e) {
        console.warn("Failed to load user_info:", e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getPublicCurrencies();
        if (mounted) setCurrencies(data);
      } catch (e) {
        console.error("Failed to fetch currencies:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleAccountCreation = async (userPhone: string | null, currencyCode: string, countryCode: string) => {
    if (!userPhone) {
      Alert.alert("Error", "User not authenticated");
      return;
    }
    
    try {
      const result = await createCurrencyAccount(userPhone, currencyCode, countryCode);
      if (result.success) {
        Alert.alert("Success", "Account created successfully!");
        // Navigate or refresh accounts list
        router.back();
      } else {
        Alert.alert("Error", result.message);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to create account");
    }
  };
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.shell}>
        {/* Header */}
        <View style={styles.simpleHeader}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
        </View>

        <Text style={[styles.bigTitle, { marginTop: 8 }]}>Add a new account</Text>
        <Text style={[styles.muted, { marginTop: 10, lineHeight: 22 }]}>
          Choose a currency you want to hold. Receive, spend and{"\n"}
          send money like a local.
        </Text>

        <View style={{ height: 22 }} />

        {loading ? (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <ActivityIndicator size="large" color="#1bb471" />
          </View>
        ) : currencies.length === 0 ? (
          <Text style={styles.muted}>No currencies available.</Text>
        ) : (
          <View style={styles.addAccCard}>
            {currencies.map((currency, index) => (
              <React.Fragment key={currency.code}>
                {index > 0 && <View style={styles.addAccDivider} />}
                <CurrencyRow
                  flag={currency.flag}
                  title={currency.name}
                  subtitle={currency.countryName || currency.name}
                  onPress={() => handleAccountCreation(userPhone, currency.code, currency.countryCode || "")}
                />
              </React.Fragment>
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
