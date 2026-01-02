import React, { useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, FlatList } from "react-native";
import { useRouter } from "expo-router";
import BottomSheet from "../../BottomSheet";
import { COLORS } from "../../../theme/colors";
import { styles } from "../../../theme/styles";
import { banks } from "../data/MockData";

interface HeaderProps {
  title: string;
}
function Header({ title }: HeaderProps) {
  return (
    <View style={styles.flowHeader}>
      <Pressable style={styles.iconBtn}>
        <Text style={styles.iconBtnText}>←</Text>
      </Pressable>

      <Text style={styles.flowHeaderTitle}>{title}</Text>

      <Pressable style={styles.iconBtn}>
        <Text style={styles.iconBtnText}>?</Text>
      </Pressable>
    </View>
  );
}

export default function RecipientDetailsScreen() {
  const router = useRouter();

  const [bankOpen, setBankOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState("");
  const [account, setAccount] = useState("");
  const [save, setSave] = useState(true);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const isReady = selectedBank && account.length >= 10;

  const initials = "AB";
  const fullName = "Ayotunde Kehinde Balogun";

  const filteredBanks = useMemo(() => banks, []);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <Header title="Enter recipient details" />

      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Text style={styles.inputLabel}>Bank name</Text>
        <Pressable style={styles.dropdown} onPress={() => setBankOpen(true)}>
          <Text style={[styles.dropdownText, !selectedBank && { color: "#9B9B9B" }]}>
            {selectedBank || ""}
          </Text>
          <Text style={styles.dropdownArrow}>⌄</Text>
        </Pressable>

        <Text style={[styles.inputLabel, { marginTop: 18 }]}>Account number</Text>
        <View style={styles.textField}>
          <TextInput
            value={account}
            onChangeText={setAccount}
            keyboardType="number-pad"
            style={styles.textFieldInput}
          />
        </View>

        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setSave(!save)}
            style={[styles.toggle, save ? styles.toggleOn : styles.toggleOff]}
          >
            <View style={[styles.toggleDot, save ? { marginLeft: 18 } : { marginLeft: 2 }]} />
          </Pressable>
          <Text style={styles.toggleText}>Save beneficiary</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 18 }}>
        <Pressable
          onPress={() => isReady && setConfirmOpen(true)}
          style={[styles.bigBottomBtn, !isReady && { backgroundColor: "#DCDCDC" }]}
        >
          <Text style={[styles.bigBottomBtnText, !isReady && { color: "#B3B3B3" }]}>
            Continue
          </Text>
        </Pressable>
      </View>

      {/* Bank picker sheet */}
      <BottomSheet open={bankOpen} onClose={() => setBankOpen(false)}>
        <Text style={styles.sheetTitle}>Select bank</Text>
        <FlatList
          data={filteredBanks}
          keyExtractor={(x) => x}
          renderItem={({ item }) => (
            <Pressable
              style={styles.sheetRow}
              onPress={() => {
                setSelectedBank(item);
                setBankOpen(false);
              }}
            >
              <Text style={{ fontWeight: "900" }}>{item}</Text>
              <Text style={{ color: "#9B9B9B" }}>›</Text>
            </Pressable>
          )}
        />
      </BottomSheet>

      {/* Confirm recipient bottom sheet (like your screenshot) */}
      <BottomSheet open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <View style={{ alignItems: "center", paddingTop: 18 }}>
          <View style={styles.confirmAvatar}>
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 18 }}>{initials}</Text>
          </View>
          <View style={styles.verifyBadge}>
            <Text style={{ color: "#fff", fontWeight: "900" }}>✓</Text>
          </View>

          <Text style={styles.confirmTitle}>Confirm recipient details</Text>

          <View style={styles.confirmCard}>
            <Text style={styles.confirmName}>{fullName}</Text>
            <Text style={styles.confirmMeta}>
              {selectedBank || "Access Bank Nigeria"}, {account || "0761010148"}
            </Text>
          </View>

          <Text style={styles.confirmHint}>
            Please confirm the recipient’s details before you continue
          </Text>

          <Pressable
            style={[styles.primaryBtn, { width: "100%", marginTop: 16 }]}
            onPress={() => {
              setConfirmOpen(false);
              router.push({
                pathname: "/reviewdetails",
                params: { name: fullName, bank: selectedBank, account },
              });
            }}
          >
            <Text style={styles.primaryBtnText}>Continue</Text>
          </Pressable>

          <Pressable
            style={[styles.outlineBtn, { width: "100%", marginTop: 12 }]}
            onPress={() => setConfirmOpen(false)}
          >
            <Text style={styles.outlineBtnText}>Edit details</Text>
          </Pressable>
        </View>
      </BottomSheet>
    </View>
  );
}
