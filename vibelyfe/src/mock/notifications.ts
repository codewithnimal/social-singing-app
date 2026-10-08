// Vibely — Mock Data: Notifications

import { Notification } from '../types';

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    type: 'new_singing_message',
    title: 'Maya Chen sang to you! 🎵',
    body: 'Listen to Maya\'s singing message',
    isRead: false,
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    data: { chatId: 'chat-2', senderId: 'user-3' },
  },
  {
    id: 'notif-2',
    type: 'friend_request',
    title: 'Nova Williams wants to connect',
    body: 'nova_harmonic sent you a friend request',
    isRead: false,
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    data: { requestId: 'req-1' },
  },
  {
    id: 'notif-3',
    type: 'friend_sang_back',
    title: 'Alex Kim sang back! 🎶',
    body: 'Alex replied to your singing message',
    isRead: true,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    data: { chatId: 'chat-1', messageId: 'msg-1-3' },
  },
  {
    id: 'notif-4',
    type: 'friend_request_accepted',
    title: 'Marcus Rivera accepted your request',
    body: 'You and marcus_riff are now friends!',
    isRead: true,
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
    data: { userId: 'user-6' },
  },
  {
    id: 'notif-5',
    type: 'system',
    title: 'Welcome to Vibely! 🎉',
    body: 'Start singing to your friends. Tap + to send your first singing message.',
    isRead: true,
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
];
