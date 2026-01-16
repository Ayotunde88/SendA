import { API_BASE_URL } from './config';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  category: 'success' | 'warning' | 'info' | 'error';
  icon: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  success: boolean;
  notifications: Notification[];
  unreadCount: number;
  total: number;
  page: number;
  pages: number;
  message?: string;
}

/**
 * Get notifications for a user
 */
export async function getNotifications(
  phone: string,
  options?: { page?: number; perPage?: number; unreadOnly?: boolean }
): Promise<NotificationsResponse> {
  try {
    const params = new URLSearchParams({
      phone: phone,
      page: String(options?.page || 1),
      per_page: String(options?.perPage || 50),
    });
    
    if (options?.unreadOnly) {
      params.append('unread', 'true');
    }

    const response = await fetch(`${API_BASE_URL}/notifications?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return {
      success: false,
      notifications: [],
      unreadCount: 0,
      total: 0,
      page: 1,
      pages: 0,
      message: 'Failed to fetch notifications',
    };
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationRead(
  notificationId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/notifications/${notificationId}/read`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return await response.json();
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return { success: false, message: 'Failed to mark as read' };
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsRead(
  phone: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    return { success: false, message: 'Failed to mark all as read' };
  }
}
