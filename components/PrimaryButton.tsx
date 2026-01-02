import React from "react";
import { Pressable, Text } from "react-native";
import { styles } from "../theme/styles";

interface Props {
  title: string;
  onPress: () => void;
  style?: object;
}
export default function PrimaryButton({ title, onPress, style }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.primaryBtn, style]}>
      <Text style={styles.primaryBtnText}>{title}</Text>
    </Pressable>
  );
}
