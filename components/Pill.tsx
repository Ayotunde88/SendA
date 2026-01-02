import React from "react";
import { View, Text } from "react-native";
import { styles } from "../theme/styles";

interface Props {
  title: string;
  active: boolean;
}

export default function Pill({ title, active }: Props) {
  return (
    <View style={[styles.filterPill, active && styles.filterPillActive]}>
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{title}</Text>
    </View>
  );
}
