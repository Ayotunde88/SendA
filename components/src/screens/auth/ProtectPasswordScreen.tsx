import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { styles } from "../../../../theme/styles";
import { setPassword } from "../../../../api/config";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProtectPasswordScreen() {
  const router = useRouter();

  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [loading, setLoading] = useState(false);

  const ruleLen = p1.length >= 8 && p1.length <= 20;
  const ruleSymbolOrNum = /[0-9]/.test(p1) || /[^A-Za-z0-9]/.test(p1);

  const canCreate = useMemo(() => {
    return ruleLen && ruleSymbolOrNum && p1 === p2 && p1.length > 0;
  }, [ruleLen, ruleSymbolOrNum, p1, p2]);

  const handleCreate = async () => {
    if (!canCreate || loading) return;

    setLoading(true);
    try {
      const phone = await AsyncStorage.getItem("user_phone");
      if (!phone) {
        Alert.alert("Error", "Phone number not found");
        setLoading(false);
        return;
      }

      const password = p1.trim();
      const result = await setPassword(phone, password);

      if (result?.success) {
        router.push("/(tabs)");
      } else {
        Alert.alert("Error", result?.message || "Failed to set password");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      Alert.alert("Error", message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.shell}>
        {/* Top row */}
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} disabled={loading}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>

          <Pressable style={styles.getHelpPill} disabled={loading}>
            <Text style={styles.getHelpPillText}>Get help</Text>
          </Pressable>
        </View>

        {/* Progress line */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: "100%" }]} />
        </View>

        <Text style={[styles.bigTitle, { marginTop: 18 }]}>Protect your account</Text>
        <Text style={[styles.muted, { marginTop: 8, lineHeight: 22 }]}>
          Enter a secure password with at least 8 characters, including one symbol and one number.
        </Text>

        <Text style={[styles.label, { marginTop: 18 }]}>Create your password</Text>
        <View style={styles.passwordBox}>
          <TextInput
            value={p1}
            onChangeText={setP1}
            style={styles.passwordInput}   // ✅ IMPORTANT
            secureTextEntry={!show1}
            editable={!loading}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
          />

          <Pressable
            onPress={() => setShow1((s) => !s)}
            disabled={loading}
            style={styles.showBtn}        // ✅ IMPORTANT
          >
            <Text style={styles.showText}>{show1 ? "HIDE" : "SHOW"}</Text>
          </Pressable>
        </View>

        <Text style={[styles.label, { marginTop: 16 }]}>Confirm your password</Text>
        <View style={styles.passwordBox}>
          <TextInput
            value={p2}
            onChangeText={setP2}
            style={styles.passwordInput}  // ✅ IMPORTANT
            secureTextEntry={!show2}
            editable={!loading}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
          />

          <Pressable
            onPress={() => setShow2((s) => !s)}
            disabled={loading}
            style={styles.showBtn}        // ✅ IMPORTANT
          >
            <Text style={styles.showText}>{show2 ? "HIDE" : "SHOW"}</Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 18 }}>
          <View style={styles.ruleRow}>
            <View style={[styles.ruleDot, ruleLen && { backgroundColor: "#22C55E" }]} />
            <Text style={[styles.ruleText, ruleLen && { color: "#22C55E" }]}>
              Must be 8 - 20 characters
            </Text>
          </View>

          <View style={styles.ruleRow}>
            <View style={[styles.ruleDot, ruleSymbolOrNum && { backgroundColor: "#22C55E" }]} />
            <Text style={[styles.ruleText, ruleSymbolOrNum && { color: "#22C55E" }]}>
              Must include at least one number or one special character (e.g $%&)
            </Text>
          </View>
        </View>

        <View style={{ flex: 1 }} />

        <Pressable
          style={canCreate && !loading ? styles.primaryBtn : styles.disabledBigBtn}
          onPress={handleCreate}
          disabled={!canCreate || loading}
        >
          <Text style={canCreate && !loading ? styles.primaryBtnText : styles.disabledBigBtnText}>
            {loading ? "Creating..." : "Create Account"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
