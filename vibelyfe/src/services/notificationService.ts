// Vibely — Service: Notifications (mock implementation)

import { Notification } from '../types';
import { MOCK_NOTIFICATIONS } from '../mock/notifications';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

let _notifications = [...MOCK_NOTIFICATIONS];

export const notificationService = {
  async getNotifications(): Promise<Notification[]> {
    await delay(300);
    return [..._notifications].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  },

  async markAsRead(notificationId: string): Promise<void> {
    await delay(150);
    _notifications = _notifications.map((n) =>
      n.id === notificationId ? { ...n, isRead: true } : n
    );
  },

  async markAllAsRead(): Promise<void> {
    await delay(200);
    _notifications = _notifications.map((n) => ({ ...n, isRead: true }));
  },

  async clearAll(): Promise<void> {
    await delay(200);
    _notifications = [];
  },

  getUnreadCount(): number {
    return _notifications.filter((n) => !n.isRead).length;
  },
};
