import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import ScreenShell from "../../../components/ScreenShell";
import { styles } from "../../../theme/styles";

export interface SavedRecipient {
  id: string;
  accountName: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  createdAt: number;
}

const SAVED_RECIPIENTS_KEY = "saved_ngn_recipients";

async function getSavedRecipients(): Promise<SavedRecipient[]> {
  try {
    const data = await AsyncStorage.getItem(SAVED_RECIPIENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function RecipientSelectScreen() {
  const params = useLocalSearchParams<{
    destCurrency: "NGN" | "CAD";
    fromWalletId: string;
    fromCurrency: string;
    fromAmount: string;
    toAmount: string;
    rate?: string;
  }>();

  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState<SavedRecipient[]>([]);

  useEffect(() => {
    getSavedRecipients().then(setSaved);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return saved;
    return saved.filter(
      (r) =>
        r.accountName.toLowerCase().includes(q) ||
        r.accountNumber.includes(q) ||
        r.bankName.toLowerCase().includes(q)
    );
  }, [search, saved]);

  return (
    <ScreenShell>
  <View style={styles.recipientListContainer}>
    <View style={styles.recipientListHeaderRow}>
      <Pressable onPress={() => router.back()} style={styles.recipientListBackBtn}>
        <Text style={styles.recipientListBackIcon}>←</Text>
      </Pressable>

      <Text style={styles.recipientListTitle}>Who are you sending to?</Text>

      <View style={{ flex: 1 }} />

      <View style={styles.recipientListHelpCircle}>
        <Text style={styles.recipientListHelpText}>?</Text>
      </View>
    </View>

    <View style={styles.recipientListSearchWrap}>
      <Text style={styles.recipientListSearchIcon}>⌕</Text>
      <TextInput
        placeholder="Search for a name or phone number"
        placeholderTextColor="#9CA3AF"
        value={search}
        onChangeText={setSearch}
        style={styles.recipientListSearchInput}
      />
    </View>

    <Pressable
      onPress={() =>
        router.push({
          pathname: "/recipientnew" as any,
          params,
        })
      }
      style={styles.recipientListNewRow}
    >
      <View style={styles.recipientListNewIconCircle}>
        <Text style={styles.recipientListNewIconPlus}>+</Text>
      </View>

      <Text style={styles.recipientListNewText}>Send to a new recipient</Text>

      <View style={{ flex: 1 }} />
      <Text style={styles.recipientListChevron}>›</Text>
    </Pressable>

    <Text style={styles.recipientListSectionTitle}>Saved</Text>

    <ScrollView>
      {filtered.map((r) => (
        <Pressable
          key={r.id}
          onPress={() =>
            router.push({
              pathname: "/recipientconfirm" as any,
              params: {
                ...params,
                recipient: JSON.stringify(r),
                mode: "saved",
              },
            })
          }
          style={styles.recipientListRow}
        >
          <View style={styles.recipientListAvatarCircle}>
            <Text style={styles.recipientListAvatarText}>{getInitials(r.accountName)}</Text>
          </View>

          <View style={styles.recipientListRowInfo}>
            <Text style={styles.recipientListRowName}>{r.accountName}</Text>
            <Text style={styles.recipientListRowSub}>
              {r.bankName}, {r.accountNumber}
            </Text>
          </View>

          <Text style={styles.recipientListChevron}>›</Text>
        </Pressable>
      ))}

      {filtered.length === 0 && (
        <Text style={styles.recipientListEmpty}>No recipients found</Text>
      )}

      <View style={styles.recipientListBottomSpacer} />
    </ScrollView>
  </View>
</ScreenShell>

  );
}
