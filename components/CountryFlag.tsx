import React, { useState } from "react";
import { Image, Text, View, StyleSheet } from "react-native";

type FlagSize = "sm" | "md" | "lg" | "xl";

interface CountryFlagProps {
  countryCode?: string;
  currencyCode?: string;
  fallbackEmoji?: string;
  size?: FlagSize;
  style?: object;
}

const sizeMap: Record<FlagSize, number> = {
  sm: 20,
  md: 28,
  lg: 36,
  xl: 48,
};

// Currency code to country code mapping for common currencies
const CURRENCY_TO_COUNTRY: Record<string, string> = {
  USD: "US",
  AUD: "AU",
  GBP: "GB",
  EUR: "EU",
  CAD: "CA",
  NGN: "NG",
  GHS: "GH",
  KES: "KE",
  ZAR: "ZA",
  TZS: "TZ",
  UGX: "UG",
  RWF: "RW",
  XOF: "SN", // West African CFA - use Senegal
  XAF: "CM", // Central African CFA - use Cameroon
  EGP: "EG",
  MAD: "MA",
  ZMW: "ZM",
  BWP: "BW",
  MUR: "MU",
  ETB: "ET",
  MWK: "MW",
  AOA: "AO",
  CDF: "CD",
  SLL: "SL",
  GMD: "GM",
  LRD: "LR",
  MZN: "MZ",
  NAD: "NA",
  SCR: "SC",
  SDG: "SD",
  SZL: "SZ",
  TND: "TN",
  DZD: "DZ",
  LYD: "LY",
  JPY: "JP",
  CNY: "CN",
  INR: "IN",
  CHF: "CH",
  NZD: "NZ",
  SGD: "SG",
  HKD: "HK",
  MXN: "MX",
  BRL: "BR",
  AED: "AE",
  SAR: "SA",
  QAR: "QA",
  KWD: "KW",
  BHD: "BH",
  OMR: "OM",
  JOD: "JO",
  ILS: "IL",
  TRY: "TR",
  PLN: "PL",
  CZK: "CZ",
  HUF: "HU",
  SEK: "SE",
  NOK: "NO",
  DKK: "DK",
  RUB: "RU",
  THB: "TH",
  MYR: "MY",
  IDR: "ID",
  PHP: "PH",
  VND: "VN",
  KRW: "KR",
  TWD: "TW",
  PKR: "PK",
  BDT: "BD",
  LKR: "LK",
  NPR: "NP",
  MMK: "MM",
  KHR: "KH",
  LAK: "LA",
};

export default function CountryFlag({
  countryCode,
  currencyCode,
  fallbackEmoji = "🏳️",
  size = "md",
  style,
}: CountryFlagProps) {
  const [hasError, setHasError] = useState(false);

  // Determine the country code to use
  let code = (countryCode || "").toUpperCase().trim();
  
  // If no country code but we have a currency code, map it
  if (!code && currencyCode) {
    code = CURRENCY_TO_COUNTRY[currencyCode.toUpperCase().trim()] || "";
  }

  const flagCode = code.toLowerCase();
  const dimension = sizeMap[size];

  if (!flagCode || hasError) {
    return (
      <View
        style={[
          styles.fallbackContainer,
          { width: dimension, height: dimension },
          style,
        ]}
      >
        <Text style={[styles.emoji, { fontSize: dimension * 0.7 }]}>
          {fallbackEmoji}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: `https://flagcdn.com/w80/${flagCode}.png` }}
      style={[
        styles.flag,
        { width: dimension, height: dimension, borderRadius: dimension / 2 },
        style,
      ]}
      onError={() => setHasError(true)}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  flag: {
    backgroundColor: "#f0f0f0",
  },
  fallbackContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    textAlign: "center",
  },
});