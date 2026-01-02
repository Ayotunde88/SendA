import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { styles } from "../../../theme/styles";
import { COLORS } from "../../../theme/colors";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  const canContinue = email.trim().length > 4;

  return (
    <View style={styles.shell}>
      {/* Top row */}
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>

        <Pressable style={styles.getHelpPill}>
          <Text style={styles.getHelpPillText}>Get help</Text>
        </Pressable>
      </View>

      <Text style={[styles.bigTitle, { marginTop: 18 }]}>
        Let’s reset your password
      </Text>

      <Text style={[styles.muted, { marginTop: 10, lineHeight: 22 }]}>
        Enter your registered email address. We'll send a six{"\n"}
        digit code to verify your account.
      </Text>

      <View style={{ height: 26 }} />

      <View style={styles.inputBox}>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          placeholderTextColor="#B5B5B5"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />
      </View>

      <View style={{ flex: 1 }} />

      {/* <Pressable style={styles.primaryBtn} onPress={() => canContinue && router.push("/verify-code")}>
        <Text style={styles.primaryBtnText}>Continue</Text>
      </Pressable> */}
    </View>
  );
}
