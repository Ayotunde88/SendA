/**
 * usePushNotifications Hook
 * 
 * Initializes push notifications, handles permissions, and manages notification listeners.
 * Should be called once at the app root level.
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {
  registerForPushNotificationsAsync,
  registerPushTokenWithBackend,
  addNotificationResponseListener,
  addNotificationReceivedListener,
  removeNotificationSubscription,
} from '../services/pushNotifications';
import { useNotificationContext } from '@/context/NotificationContext';

export interface PushNotificationState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  isRegistered: boolean;
}

export function usePushNotifications() {
  const router = useRouter();
  const { refreshUnreadCount } = useNotificationContext();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);

  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Register for push notifications
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        setExpoPushToken(token);
        setIsRegistered(true);

        // Try to register with backend if user is logged in
        AsyncStorage.getItem('user_phone').then((phone) => {
          if (phone) {
            registerPushTokenWithBackend(phone);
          }
        });
      }
    });

    // Listen for incoming notifications (foreground)
    notificationListener.current = addNotificationReceivedListener((notification) => {
      console.log('[PushNotifications] Received:', notification);
      refreshUnreadCount();
      setNotification(notification);
    });

    // Listen for notification taps
    responseListener.current = addNotificationResponseListener((response) => {
      console.log('[PushNotifications] Response:', response);
      const data = response.notification.request.content.data;

      // Handle navigation based on notification type
      if (data?.type === 'settlement_complete' && data?.conversionId) {
        // Navigate to wallet or transaction detail
        router.push('/(tabs)');
      } else if (data?.transactionId) {
        router.push(`/transaction-detail/${data.transactionId}` as any);
      } else if (data?.type === 'kyc_approved') {
        router.push('/profile');
      }
    });

    return () => {
      if (notificationListener.current) {
        removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        removeNotificationSubscription(responseListener.current);
      }
    };
    }, [router, refreshUnreadCount]);

  return {
    expoPushToken,
    notification,
    isRegistered,
  };
}

export default usePushNotifications;
