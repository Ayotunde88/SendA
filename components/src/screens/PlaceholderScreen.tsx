import React from "react";
import { View, Text } from "react-native";
import ScreenShell from "./../../ScreenShell";
import { styles } from "../../../theme/styles";

interface Props {
  title: string;
}

export default function PlaceholderScreen({ title }: Props) {
  return (
    <ScreenShell>
      <Text style={styles.bigTitle}>{title}</Text>
      <Text style={styles.muted}>Placeholder screen</Text>
    </ScreenShell>
  );
}
