import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getNotifications } from "../api/notifications";
import { useAutoPolling } from "../hooks/useAutoPolling";

interface NotificationContextType {
  unreadCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  decrementUnread: () => void;
  markAllAsRead: () => void;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [phone, setPhone] = useState<string | null>(null);

  // Get user phone on mount
  useEffect(() => {
    AsyncStorage.getItem("user_phone").then(setPhone);
  }, []);

  // Fetch unread count from API
  const refreshUnreadCount = useCallback(async () => {
    if (!phone) return;

    try {
      const response = await getNotifications(phone, { perPage: 1 });
      if (response.success) {
        // Ensure we pass a number to the state setter (guard against undefined/incorrect types)
        const count =
          typeof response.unreadCount === "number"
            ? response.unreadCount
            : Number(response.unreadCount ?? 0);
        setUnreadCount(count as number);
      }
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  }, [phone]);

  // Initial fetch when phone is available
  useEffect(() => {
    if (phone) {
      refreshUnreadCount();
    }
  }, [phone, refreshUnreadCount]);

  // Auto-poll every 30 seconds for badge updates
  useAutoPolling(refreshUnreadCount, {
    intervalMs: 30000,
    enabled: !!phone,
    fetchOnMount: false,
    pauseInBackground: true,
  });

  // Decrement unread count (when marking single as read)
  const decrementUnread = useCallback(() => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  // Set to zero (when marking all as read)
  const markAllAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        setUnreadCount,
        decrementUnread,
        markAllAsRead,
        refreshUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotificationContext must be used within NotificationProvider");
  }
  return context;
}
