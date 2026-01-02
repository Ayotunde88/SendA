import React from "react";
import { Pressable, Text } from "react-native";
import { styles } from "../theme/styles";
interface Props {
  title: string;
  onPress: () => void;
  style?: object;
}
export default function OutlineButton({ title, onPress, style }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.outlineBtn, style]}>
      <Text style={styles.outlineBtnText}>{title}</Text>
    </Pressable>
  );
}
