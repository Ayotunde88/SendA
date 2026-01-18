import React from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { styles, } from "../theme/styles";
import { otherstyles, } from "../theme/otherstyles";
import { COLORS } from "../theme/colors";

type Props = {
  title?: string;
  message?: string;
  onRetry: () => void;
  retrying?: boolean;
  compact?: boolean; // use inside cards/sections
};

export default function NetworkErrorState({
  title = "No internet connection",
  message = "Check your network and tap Refresh to try again.",
  onRetry,
  retrying = false,
  compact = false,
}: Props) {
  return (
    <View style={[otherstyles.netErrWrap, compact && otherstyles.netErrWrapCompact]}>
      <View style={otherstyles.netErrIconCircle}>
        <Text style={otherstyles.netErrIcon}>📶</Text>
      </View>

      <Text style={otherstyles.netErrTitle}>{title}</Text>
      <Text style={otherstyles.netErrMessage}>{message}</Text>

      <Pressable
        onPress={onRetry}
        style={[styles.primaryBtn, otherstyles.netErrBtn]}
        disabled={retrying}
      >
        {retrying ? (
          <View style={otherstyles.netErrBtnRow}>
            <ActivityIndicator color="#fff" />
            <Text style={otherstyles.netErrBtnText}>Refreshing…</Text>
          </View>
        ) : (
          <Text style={otherstyles.netErrBtnText}>Refresh</Text>
        )}
      </Pressable>

      <Text style={otherstyles.netErrHint}>
        Tip: If you’re on VPN or weak Wi-Fi, switch to mobile data.
      </Text>
    </View>
  );
}
