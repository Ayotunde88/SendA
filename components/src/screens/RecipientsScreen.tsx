import React, { useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { COLORS } from "../../../theme/colors";
import { styles } from "../../../theme/styles";
import { savedRecipients, recentRecipients } from "../data/MockData";

interface TopHeaderProps {
    title: string;
}
interface RecipientBubbleProps {
    item: {
        initials: string;
        name: string;
        bankShort?: string;
        bankFull?: string;
        account?: string;
    };
}
interface RecipientRowProps {
    item: {
        id: string;
        initials: string;
        name: string;
        bankFull: string;
        account: string;
    };
    onPress: () => void;
}

function TopHeader({ title }: TopHeaderProps) {
  return (
    <View style={styles.flowHeader}>
      <Pressable style={styles.iconBtn}>
        <Text style={styles.iconBtnText}>←</Text>
      </Pressable>

      <Text style={styles.flowHeaderTitle}>Who are you sending to?</Text>

      <Pressable style={styles.iconBtn}>
        <Text style={styles.iconBtnText}>?</Text>
      </Pressable>
    </View>
  );
}

function RecipientBubble({ item }: RecipientBubbleProps) {
  return (
    <View style={styles.recentBubble}>
      <View style={styles.recentBubbleAvatarWrap}>
        <View style={styles.recentBubbleAvatar}>
          <Text style={{ color: "#fff", fontWeight: "900" }}>{item.initials}</Text>
        </View>
        <View style={styles.smallFlag}>
          <Text>🇳🇬</Text>
        </View>
      </View>

      <Text numberOfLines={1} style={styles.recentBubbleName}>
        {item.name}
      </Text>
      <Text numberOfLines={1} style={styles.recentBubbleBank}>
        {item.bankShort}
      </Text>
    </View>
  );
}

function RecipientRow({ item, onPress }: RecipientRowProps) {
  return (
    <Pressable onPress={onPress} style={styles.recipientRow}>
      <View style={styles.recipientLeft}>
        <View style={styles.recipientAvatarWrap}>
          <View style={styles.recipientAvatar}>
            <Text style={{ color: "#fff", fontWeight: "900" }}>{item.initials}</Text>
          </View>
          <View style={styles.smallFlag}>
            <Text>🇳🇬</Text>
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.recipientName}>{item.name}</Text>
          <Text style={styles.recipientMeta}>
            {item.bankFull}, {item.account}
          </Text>
        </View>
      </View>

      <Text style={styles.chev}>›</Text>
    </Pressable>
  );
}

export default function RecipientsScreen() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("Saved");

  const list = useMemo(() => {
    const base = tab === "Saved" ? savedRecipients : [];
    if (!q.trim()) return base;
    const s = q.trim().toLowerCase();
    return base.filter(
      (x) =>
        x.name.toLowerCase().includes(s) ||
        x.account.toLowerCase().includes(s) ||
        x.bankFull.toLowerCase().includes(s)
    );
  }, [q, tab]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <TopHeader title={""} />

      <View style={{ paddingHorizontal: 16 }}>
        <View style={styles.searchBox}>
          <Text style={{ marginRight: 10, color: "#9B9B9B" }}>🔍</Text>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search for a name or phone number"
            placeholderTextColor="#9B9B9B"
            style={{ flex: 1, fontWeight: "700" }}
          />
        </View>

        <Pressable
          style={styles.newRecipientRow}
          onPress={() => router.push("/recipientdetails")}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={styles.plusCircle}>
              <Text style={{ fontWeight: "900", fontSize: 18 }}>＋</Text>
            </View>
            <Text style={styles.newRecipientText}>Send to a new recipient</Text>
          </View>
          <Text style={styles.chev}>›</Text>
        </Pressable>

        <Text style={styles.blockTitle}>Recent</Text>
        <View style={styles.recentBubblesRow}>
          {recentRecipients.map((r) => (
            <RecipientBubble key={r.id} item={r} />
          ))}
        </View>

        <View style={styles.segmentRow}>
          <Pressable
            onPress={() => setTab("Saved")}
            style={[styles.segmentPill, tab === "Saved" && styles.segmentPillActive]}
          >
            <Text style={[styles.segmentText, tab === "Saved" && styles.segmentTextActive]}>
              Saved
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setTab("LemFi")}
            style={[styles.segmentPill, tab === "LemFi" && styles.segmentPillActive]}
          >
            <Text style={[styles.segmentText, tab === "LemFi" && styles.segmentTextActive]}>
              LemFi friends
            </Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <RecipientRow
            item={item}
            onPress={() =>
              router.push({
                pathname: "/reviewdetails",
                params: {
                  name: item.name,
                  bank: item.bankFull,
                  account: item.account,
                },
              })
            }
          />
        )}
      />
    </View>
  );
}
