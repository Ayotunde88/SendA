/**
 * Push Notification Service
 *
 * - Remote push uses Expo push tokens (requires a real device).
 * - Local notifications can work on simulator for testing.
 */
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../api/config";
import { COLORS } from "@/theme/colors";

const PUSH_TOKEN_KEY = "expo_push_token";

// Foreground behavior
Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function getExpoProjectId(): string | undefined {
  // Works across Expo Go / Dev Builds / EAS builds depending on runtime
  // Prefer EAS projectId if present.
  const easProjectId =
    (Constants as any)?.expoConfig?.extra?.eas?.projectId ??
    (Constants as any)?.easConfig?.projectId ??
    (Constants as any)?.expoConfig?.extra?.projectId;

  return typeof easProjectId === "string" && easProjectId.length > 0
    ? easProjectId
    : undefined;
}

/**
 * Register permissions and (if on real device) get Expo push token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Android channels must be set before notifications are shown on Android
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("settlements", {
      name: "Settlement Notifications",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: COLORS.green,
      sound: "default",
    });

    await Notifications.setNotificationChannelAsync("transactions", {
      name: "Transaction Notifications",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: COLORS.blue,
      sound: "default",
    });
  }

  if (!Device.isDevice) {
    console.log(
      "[PushNotifications] Simulator detected. Remote push requires a real device. Local notifications can still work."
    );
  }

  // Permissions
  const perm = await Notifications.getPermissionsAsync();
  let finalStatus = perm.status;

  if (finalStatus !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    finalStatus = req.status;
  }

  console.log("[PushNotifications] Permission status:", finalStatus);

  if (finalStatus !== "granted") {
    return null;
  }

  // Remote push token (real device only)
  if (!Device.isDevice) {
    return null;
  }

  try {
    const projectId = getExpoProjectId();
    console.log("[PushNotifications] projectId:", projectId);

    // If projectId is missing, Expo may still return a token in Expo Go,
    // but in dev/production it can fail. We log so you can confirm.
    const pushToken = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    const token = pushToken.data;
    console.log("[PushNotifications] Expo push token:", token);

    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    return token;
  } catch (error) {
    console.error("[PushNotifications] Failed to get Expo push token:", error);
    return null;
  }
}

/**
 * Send the token to backend
 */
export async function registerPushTokenWithBackend(phone: string): Promise<boolean> {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);

    if (!token) {
      console.log("[PushNotifications] No stored token found. Did you call registerForPushNotificationsAsync() on a real device?");
      return false;
    }

    const res = await fetch(`${API_BASE_URL}/users/push-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        push_token: token,
        platform: Platform.OS,
      }),
    });

    const data = await res.json().catch(() => ({}));
    console.log("[PushNotifications] Backend register result:", data);

    return !!data?.success;
  } catch (error) {
    console.error("[PushNotifications] Failed to register token with backend:", error);
    return false;
  }
}

export async function getStoredPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY);
}

/**
 * Local notification (works for simulator testing too)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  channelId: string = "settlements"
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: "default",
      ...(Platform.OS === "android" && { channelId }),
    },
    trigger: null,
  });

  return id;
}

export async function showSettlementNotification(
  sellCurrency: string,
  buyCurrency: string,
  sellAmount: number,
  buyAmount: number,
  conversionId?: string
): Promise<void> {
  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  await scheduleLocalNotification(
    "✅ Conversion Complete",
    `Your ${fmt(sellAmount)} ${sellCurrency} → ${fmt(buyAmount)} ${buyCurrency} conversion has settled.`,
    {
      type: "settlement_complete",
      conversionId,
      sellCurrency,
      buyCurrency,
      sellAmount,
      buyAmount,
    },
    "settlements"
  );
}

export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

export function removeNotificationSubscription(subscription: Notifications.Subscription): void {
  subscription.remove();
}

export async function clearAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}

export default {
  registerForPushNotificationsAsync,
  registerPushTokenWithBackend,
  getStoredPushToken,
  scheduleLocalNotification,
  showSettlementNotification,
  addNotificationResponseListener,
  addNotificationReceivedListener,
  removeNotificationSubscription,
  clearAllNotifications,
};
