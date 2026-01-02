import React, { useState } from "react";
import { View, Text, Pressable, Switch } from "react-native";
import { useRouter } from "expo-router";
import { styles } from "../../../theme/styles";

interface RowProps {
  icon: string;
  label: string;
  right?: React.ReactNode;
  onPress?: () => void;
}

function Row({ icon, label, right, onPress }: RowProps) {
  return (
    <Pressable onPress={onPress} style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      {right}
    </Pressable>
  );
}

export default function SecurityPrivacyScreen() {
  const router = useRouter();
  const [bioEnabled, setBioEnabled] = useState(true);
  const [hideBalance, setHideBalance] = useState(false);

  return (
    <View style={styles.shell}>
      {/* header */}
      <View style={styles.stackHeader}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Security and privacy</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.card}>
        <Row
          icon="🔒"
          label="Reset Password"
          onPress={() => router.push("/reset-password")}
          right={<Text style={styles.chev}>›</Text>}
        />
        <View style={styles.divider} />

        <Row
          icon="🔢"
          label="Transaction PIN"
        //   onPress={() => router.push("/transaction-pin")}
          right={<Text style={styles.chev}>›</Text>}
        />
        <View style={styles.divider} />

        <Row
          icon="🆔"
          label="Enable/disable Face or Touch..."
          onPress={() => {}}
          right={
            <Switch value={bioEnabled} onValueChange={setBioEnabled} />
          }
        />
        <View style={styles.divider} />

        <Row
          icon="🛡️"
          label="View Privacy Settings"
        //   onPress={() => router.push("/privacy-settings")}
          right={<Text style={styles.chev}>›</Text>}
        />
        <View style={styles.divider} />

        <Row
          icon="🙈"
          label="Hide Balance"
          onPress={() => {}}
          right={<Switch value={hideBalance} onValueChange={setHideBalance} />}
        />
      </View>
    </View>
  );
}
