import React from "react";
import { Pressable, View, Text } from "react-native";
import { styles } from "../theme/styles";

interface Props {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

export default function WalletAction({ icon, label, onPress }: Props) {
  return (
    <Pressable style={{ alignItems: "center", width: 72 }} onPress={onPress}>
      <View style={styles.walletActionCircle}>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>{icon}</Text>
      </View>
      <Text style={{ marginTop: 8, fontWeight: "900" }}>{label}</Text>
    </Pressable>
  );
}
