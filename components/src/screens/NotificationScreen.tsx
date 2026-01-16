import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ScreenShell from "../../ScreenShell";
import { styles } from "../../../theme/styles";
import { COLORS } from "../../../theme/colors";
import { 
  getNotifications, 
  markNotificationRead, 
  markAllNotificationsRead,
  Notification 
} from "../../../api/notifications";
import { useAutoPolling } from "../../../hooks/useAutoPolling";
import { useNotificationContext } from "../../../context/NotificationContext";

interface NotifRowProps {
  item: {
    id: string;
    type: string;
    icon: string;
    title: string;
    body: string;
    time: string;
    read: boolean;
    createdAt?: string;
    data?: any;
    category?: string;
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
            item.type === "error" && styles.notifIconWarning,
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

// Group notifications by date
function groupNotificationsByDate(notifications: Notification[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const sections: { section: string; items: Notification[] }[] = [];
  const groups: Record<string, Notification[]> = {};

  notifications.forEach((notif) => {
    const date = new Date(notif.createdAt);
    date.setHours(0, 0, 0, 0);

    let key: string;
    if (date.getTime() === today.getTime()) {
      key = "Today";
    } else if (date.getTime() === yesterday.getTime()) {
      key = "Yesterday";
    } else {
      key = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }

    if (!groups[key]) groups[key] = [];
    groups[key].push(notif);
  });

  // Order: Today, Yesterday, then older dates
  const orderedKeys = Object.keys(groups).sort((a, b) => {
    if (a === "Today") return -1;
    if (b === "Today") return 1;
    if (a === "Yesterday") return -1;
    if (b === "Yesterday") return 1;
    return 0;
  });

  orderedKeys.forEach((key) => {
    sections.push({ section: key, items: groups[key] });
  });

  return sections;
}

// Format time for display
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function NotificationScreen() {
  const router = useRouter();
  const { decrementUnread, markAllAsRead, setUnreadCount } = useNotificationContext();
  const [filter, setFilter] = useState("All");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);

  // Get user phone on mount
  useEffect(() => {
    AsyncStorage.getItem("user_phone").then(setPhone);
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!phone) return;

    try {
      const response = await getNotifications(phone, { 
        perPage: 50,
        unreadOnly: filter === "Unread" 
      });
      
      if (response.success) {
        setNotifications(response.notifications);
        setError(null);
      } else {
        setError(response.message || "Failed to load notifications");
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [phone, filter]);

  // Initial fetch
  useEffect(() => {
    if (phone) {
      setLoading(true);
      fetchNotifications();
    }
  }, [phone, filter]);

  // Auto-polling every 10 seconds
  useAutoPolling(fetchNotifications, {
    intervalMs: 10000,
    enabled: !!phone,
    fetchOnMount: false,
    pauseInBackground: true,
  });

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  // Handle notification tap - mark as read
  const handleNotificationPress = useCallback(async (notif: Notification) => {
    if (!notif.read) {
      await markNotificationRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
      );
      // Update tab badge immediately
      decrementUnread();
    }
    
    // Navigate based on notification data
    if (notif.data?.transactionId) {
      router.push(`/transaction-detail/${notif.data.transactionId}` as any);
    } else if (notif.data?.conversionId) {
      router.push("/(tabs)" as any);
    }
  }, [router, decrementUnread]);

  // Mark all as read
  const handleMarkAllRead = useCallback(async () => {
    if (!phone) return;
    
    const result = await markAllNotificationsRead(phone);
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }))
      );
      // Update tab badge immediately
      markAllAsRead();
    }
  }, [phone, markAllAsRead]);

  // Transform and group notifications
  const visibleSections = useMemo(() => {
    const filtered = filter === "Unread" 
      ? notifications.filter((n) => !n.read)
      : notifications;

    return groupNotificationsByDate(filtered);
  }, [notifications, filter]);

  const unreadCount = useMemo(() => 
    notifications.filter((n) => !n.read).length, 
    [notifications]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScreenShell padded={false}>
        {/* Header */}
        <View style={styles.notifHeader}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>

          <Text style={styles.notifHeaderTitle}>Notifications</Text>

          <Pressable 
            onPress={handleMarkAllRead} 
            style={styles.notifHeaderAction}
            disabled={unreadCount === 0}
          >
            <Text style={[
              styles.notifHeaderActionText,
              unreadCount === 0 && { opacity: 0.4 }
            ]}>
              Mark all
            </Text>
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
                  {x === "Unread" && unreadCount > 0 && ` (${unreadCount})`}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Loading state */}
        {loading && notifications.length === 0 ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 12, color: COLORS.gray }}>Loading notifications...</Text>
          </View>
        ) : error && notifications.length === 0 ? (
          <View style={styles.notifEmpty}>
            <Text style={{ fontSize: 26 }}>⚠️</Text>
            <Text style={styles.notifEmptyTitle}>Something went wrong</Text>
            <Text style={styles.notifEmptySub}>{error}</Text>
            <Pressable onPress={fetchNotifications} style={{ marginTop: 16 }}>
              <Text style={{ color: COLORS.primary, fontWeight: "600" }}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView 
            contentContainerStyle={{ paddingBottom: 24 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={COLORS.primary}
              />
            }
          >
            {visibleSections.length === 0 ? (
              <View style={styles.notifEmpty}>
                <Text style={{ fontSize: 26 }}>🔕</Text>
                <Text style={styles.notifEmptyTitle}>No notifications</Text>
                <Text style={styles.notifEmptySub}>
                  You're all caught up. New alerts will appear here.
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
                          item={{
                            id: item.id,
                            type: item.category,
                            icon: item.icon,
                            title: item.title,
                            body: item.body,
                            time: formatTime(item.createdAt),
                            read: item.read,
                          }}
                          onPress={() => handleNotificationPress(item)}
                        />
                        {idx !== section.items.length - 1 && <View style={styles.notifDivider} />}
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </ScreenShell>
    </SafeAreaView>
  );
}