import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { styles } from "../theme/styles";

interface Props {
  text: string;
  links?: boolean;
}

export default function CheckRow({ text, links }: Props) {
  const [checked, setChecked] = useState(false);

  return (
    <View style={styles.checkRow}>
      <Pressable
        onPress={() => setChecked(!checked)}
        style={[
          styles.checkbox,
          checked && { backgroundColor: "#2E9E6A", borderColor: "#2E9E6A" },
        ]}
      />
      <Text style={styles.checkText}>
        {links ? (
          <>
            By clicking this box, you agree to our{" "}
            <Text style={styles.link}>Terms &{"\n"}Conditions of Service</Text> and{" "}
            <Text style={styles.link}>Privacy Notice</Text> including verification of your identity
            through a third party and your mobile services provider.
          </>
        ) : (
          text
        )}
      </Text>
    </View>
  );
}
