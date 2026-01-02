import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenShell from "../../ScreenShell";
import { styles } from "../../../theme/styles";
import { COLORS } from "../../../theme/colors";

interface NotifRowProps {
  item: {
    id: string;
    type: "success" | "warning" | "info";
    icon: string;
    title: string;
    body: string;
    time: string;
    read: boolean;
  };
  onPress: () => void;
}

function NotifRow({ item, onPress }: NotifRowProps) {
  return (
    <Pressable onPress={onPress} style={styles.notifRow}>
      <View style={styles.notifLeft}>
        <View
          style={[
            styles.notifIconWrap,
            item.type === "success" && styles.notifIconSuccess,
            item.type === "warning" && styles.notifIconWarning,
            item.type === "info" && styles.notifIconInfo,
          ]}
        >
          <Text style={styles.notifIconText}>{item.icon}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.notifTitleRow}>
            <Text style={[styles.notifTitle, !item.read && styles.notifTitleUnread]}>
              {item.title}
            </Text>
            {!item.read && <View style={styles.notifUnreadDot} />}
          </View>

          <Text style={styles.notifBody} numberOfLines={2}>
            {item.body}
          </Text>

          <Text style={styles.notifTime}>{item.time}</Text>
        </View>
      </View>

      <Text style={styles.notifChevron}>›</Text>
    </Pressable>
  );
}

export default function NotificationScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState("All");

  const DATA = useMemo(
    () => [
      {
        section: "Today",
        items: [
          {
            id: "1",
            type: "success",
            icon: "✅",
            title: "Transfer completed",
            body: "Your transfer to Ayotunde Kehinde Balogun was successful.",
            time: "1:05 PM",
            read: false,
          },
          {
            id: "2",
            type: "info",
            icon: "💱",
            title: "Rate alert",
            body: "CAD → NGN improved. Check today’s exchange rate.",
            time: "10:42 AM",
            read: true,
          },
        ],
      },
      {
        section: "Yesterday",
        items: [
          {
            id: "3",
            type: "warning",
            icon: "⚠️",
            title: "KYC pending",
            body: "Your verification is being reviewed. Some features may be restricted.",
            time: "7:22 PM",
            read: true,
          },
          {
            id: "4",
            type: "info",
            icon: "🔔",
            title: "New feature",
            body: "You can now add new currency accounts from your Home screen.",
            time: "9:13 AM",
            read: true,
          },
        ],
      },
    ],
    []
  );

  const visibleSections = useMemo(() => {
    if (filter === "Unread") {
      return DATA.map((s) => ({
        ...s,
        items: s.items.filter((i) => !i.read),
      })).filter((s) => s.items.length > 0);
    }
    return DATA;
  }, [DATA, filter]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScreenShell padded={false}>
        {/* Header */}
        <View style={styles.notifHeader}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>

          <Text style={styles.notifHeaderTitle}>Notifications</Text>

          <Pressable onPress={() => {}} style={styles.notifHeaderAction}>
            <Text style={styles.notifHeaderActionText}>Mark all</Text>
          </Pressable>
        </View>

        {/* Filters */}
        <View style={styles.notifFiltersRow}>
          {["All", "Unread"].map((x) => {
            const active = x === filter;
            return (
              <Pressable
                key={x}
                onPress={() => setFilter(x)}
                style={[styles.notifFilterPill, active && styles.notifFilterPillActive]}
              >
                <Text style={[styles.notifFilterText, active && styles.notifFilterTextActive]}>
                  {x}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          {visibleSections.length === 0 ? (
            <View style={styles.notifEmpty}>
              <Text style={{ fontSize: 26 }}>🔕</Text>
              <Text style={styles.notifEmptyTitle}>No notifications</Text>
              <Text style={styles.notifEmptySub}>
                You’re all caught up. New alerts will appear here.
              </Text>
            </View>
          ) : (
            visibleSections.map((section) => (
              <View key={section.section} style={{ marginTop: 14 }}>
                <Text style={styles.notifSectionTitle}>{section.section}</Text>

                <View style={styles.notifCard}>
                  {section.items.map((item, idx) => (
                    <View key={item.id}>
                      <NotifRow
                        item={item as any}
                        onPress={() => {
                          // later: open notification details
                        }}
                      />
                      {idx !== section.items.length - 1 && <View style={styles.notifDivider} />}
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </ScreenShell>
    </SafeAreaView>
  );
}
