/**
 * Push Notification Service
 * 
 * Handles push notification registration, permissions, and token management.
 * Used to receive settlement notifications when conversions complete.
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../api/config';
import { COLORS } from '@/theme/colors';

const PUSH_TOKEN_KEY = 'expo_push_token';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and get the Expo push token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  // Warn if not a physical device (push won't work, but local notifications will)
  if (!Device.isDevice) {
    console.log('[PushNotifications] Simulator detected - push notifications require physical device. Local notifications will still work.');
    // Continue to set up channels and permissions for local notification testing
  }

  // Check/request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[PushNotifications] Permission not granted');
    return null;
  }

  try {
    // Get the Expo push token (only works on physical devices)
    if (Device.isDevice) {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      
      const pushToken = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      
      token = pushToken.data;
      console.log('[PushNotifications] Token:', token);

      // Store locally
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    } else {
      console.log('[PushNotifications] Skipping token fetch on simulator');
    }
  } catch (error) {
    console.error('[PushNotifications] Failed to get push token:', error);
  }

  // Android-specific channel configuration
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('settlements', {
      name: 'Settlement Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: COLORS.green,
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('transactions', {
      name: 'Transaction Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: COLORS.blue,
      sound: 'default',
    });
  }

  return token;
}

/**
 * Send the push token to the backend for the current user
 */
export async function registerPushTokenWithBackend(phone: string): Promise<boolean> {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (!token) {
      console.log('[PushNotifications] No token to register');
      return false;
    }

    const response = await fetch(`${API_BASE_URL}/users/push-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        push_token: token,
        platform: Platform.OS,
      }),
    });

    const data = await response.json();
    console.log('[PushNotifications] Token registered with backend:', data.success);
    return data.success;
  } catch (error) {
    console.error('[PushNotifications] Failed to register token with backend:', error);
    return false;
  }
}

/**
 * Get the stored push token
 */
export async function getStoredPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY);
}

/**
 * Schedule a local notification (for testing or immediate alerts)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  channelId: string = 'settlements'
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId }),
    },
    trigger: null, // Immediate
  });
  
  return id;
}

/**
 * Show a settlement complete notification
 */
export async function showSettlementNotification(
  sellCurrency: string,
  buyCurrency: string,
  sellAmount: number,
  buyAmount: number,
  conversionId?: string
): Promise<void> {
  const formatAmount = (amount: number) =>
    amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  await scheduleLocalNotification(
    '✅ Conversion Complete',
    `Your ${formatAmount(sellAmount)} ${sellCurrency} → ${formatAmount(buyAmount)} ${buyCurrency} conversion has settled.`,
    {
      type: 'settlement_complete',
      conversionId,
      sellCurrency,
      buyCurrency,
      sellAmount,
      buyAmount,
    },
    'settlements'
  );
}

/**
 * Add notification response listener (for handling taps on notifications)
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Add notification received listener (for foreground notifications)
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Remove a subscription
 */
export function removeNotificationSubscription(subscription: Notifications.Subscription): void {
  // The expo-notifications API returns a Subscription object that exposes a remove() method.
  // Calling subscription.remove() is the supported way to unsubscribe.
  subscription.remove();
}

/**
 * Get the badge count
 */
export async function getBadgeCount(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}

/**
 * Set the badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear all notifications
 */
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
  getBadgeCount,
  setBadgeCount,
  clearAllNotifications,
};