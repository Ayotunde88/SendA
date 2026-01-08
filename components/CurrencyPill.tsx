import React from "react";
import { Pressable, Text } from "react-native";
import { styles } from "../theme/styles";
interface Props {
  flag: string;
  code: string;
  onPress: () => void;
}
export default function CurrencyPill({ flag, code, onPress }: Props) {
  return (
    <Pressable style={styles.currencyPill} onPress={onPress}>
      <Text style={{ marginRight: 8 }}>{flag}</Text>
      <Text style={{ fontWeight: "900", color: "#2D2D2D" }}>{code}</Text>
      <Text style={{ marginLeft: 8 }}>⌄</Text>
    </Pressable>
  );
}

