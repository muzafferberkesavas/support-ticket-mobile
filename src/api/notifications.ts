import { api } from './client';
import type { AppNotification } from '@/types';

// GET /notifications — tüm bildirimler + okunmamış sayısı (her auth kullanıcı).
export async function listNotifications(): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
  const { data } = await api.get<{ notifications: AppNotification[]; unreadCount: number }>('/notifications');
  return data;
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await api.get<{ count: number }>('/notifications/unread-count');
  return data.count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/notifications/read-all');
}
