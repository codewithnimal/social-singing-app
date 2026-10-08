// Vibely — Mock Data: Users & Friends

import { User, Friend, FriendRequest } from '../types';

export const MOCK_CURRENT_USER: User = {
  id: 'user-me',
  username: 'vibely_me',
  displayName: 'You',
  email: 'me@vibely.app',
  phone: '+1 555 000 0000',
  avatarUrl: undefined,
  bio: 'Singing my heart out 🎵',
  isOnline: true,
  lastSeen: new Date(),
  createdAt: new Date('2024-01-01'),
};

export const MOCK_FRIENDS: Friend[] = [
  {
    id: 'friend-1',
    userId: 'user-2',
    username: 'alex_melodic',
    displayName: 'Alex Kim',
    avatarUrl: undefined,
    isOnline: true,
    lastSeen: new Date(),
    friendSince: new Date('2024-03-15'),
    chatId: 'chat-1',
  },
  {
    id: 'friend-2',
    userId: 'user-3',
    username: 'maya_sings',
    displayName: 'Maya Chen',
    avatarUrl: undefined,
    isOnline: true,
    lastSeen: new Date(),
    friendSince: new Date('2024-04-02'),
    chatId: 'chat-2',
  },
  {
    id: 'friend-3',
    userId: 'user-4',
    username: 'jay_beats',
    displayName: 'Jay Park',
    avatarUrl: undefined,
    isOnline: false,
    lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2h ago
    friendSince: new Date('2024-05-10'),
    chatId: 'chat-3',
  },
  {
    id: 'friend-4',
    userId: 'user-5',
    username: 'sophia_notes',
    displayName: 'Sophia Lee',
    avatarUrl: undefined,
    isOnline: false,
    lastSeen: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1d ago
    friendSince: new Date('2024-06-01'),
    chatId: 'chat-4',
  },
  {
    id: 'friend-5',
    userId: 'user-6',
    username: 'marcus_riff',
    displayName: 'Marcus Rivera',
    avatarUrl: undefined,
    isOnline: true,
    lastSeen: new Date(),
    friendSince: new Date('2024-07-20'),
    chatId: 'chat-5',
  },
  {
    id: 'friend-6',
    userId: 'user-7',
    username: 'lily_voice',
    displayName: 'Lily Zhang',
    avatarUrl: undefined,
    isOnline: false,
    lastSeen: new Date(Date.now() - 30 * 60 * 1000), // 30m ago
    friendSince: new Date('2024-08-05'),
    chatId: 'chat-6',
  },
];

export const MOCK_FRIEND_REQUESTS: FriendRequest[] = [
  {
    id: 'req-1',
    from: {
      id: 'user-8',
      username: 'nova_harmonic',
      displayName: 'Nova Williams',
      avatarUrl: undefined,
    },
    to: 'user-me',
    status: 'pending',
    sentAt: new Date(Date.now() - 15 * 60 * 1000), // 15m ago
  },
  {
    id: 'req-2',
    from: {
      id: 'user-9',
      username: 'felix_tune',
      displayName: 'Felix Moreau',
      avatarUrl: undefined,
    },
    to: 'user-me',
    status: 'pending',
    sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2h ago
  },
];
