import React from "react";
import { View, Text } from "react-native";
import { styles } from "../theme/styles";
interface Props {
  k: string;
  v: string;
}
export default function DetailRow({ k, v }: Props) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailKey}>{k}</Text>
      <Text style={styles.detailVal}>{v}</Text>
    </View>
  );
}
