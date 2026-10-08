// Vibely — Service: Friends (mock implementation)

import { Friend, FriendRequest } from '../types';
import { MOCK_FRIENDS, MOCK_FRIEND_REQUESTS } from '../mock/users';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

let _friends = [...MOCK_FRIENDS];
let _requests = [...MOCK_FRIEND_REQUESTS];

export const friendService = {
  async getFriends(): Promise<Friend[]> {
    await delay(400);
    return [..._friends];
  },

  async getOnlineFriends(): Promise<Friend[]> {
    await delay(300);
    return _friends.filter((f) => f.isOnline);
  },

  async getFriendRequests(): Promise<FriendRequest[]> {
    await delay(350);
    return [..._requests];
  },

  async searchByUsername(query: string): Promise<Array<{ id: string; username: string; displayName: string; avatarUrl?: string; isAlreadyFriend: boolean }>> {
    await delay(600);
    if (!query.trim()) return [];

    // Mock search results
    const mockSearchResults = [
      { id: 'user-search-1', username: 'zara_singing', displayName: 'Zara Moon', avatarUrl: undefined },
      { id: 'user-search-2', username: 'leo_notes', displayName: 'Leo Santos', avatarUrl: undefined },
      { id: 'user-search-3', username: 'ava_melody', displayName: 'Ava Chen', avatarUrl: undefined },
    ];

    const filtered = mockSearchResults.filter(
      (u) =>
        u.username.toLowerCase().includes(query.toLowerCase()) ||
        u.displayName.toLowerCase().includes(query.toLowerCase())
    );

    return filtered.map((u) => ({
      ...u,
      isAlreadyFriend: _friends.some((f) => f.userId === u.id),
    }));
  },

  async sendFriendRequest(userId: string): Promise<void> {
    await delay(500);
    console.log(`[Mock] Friend request sent to ${userId}`);
  },

  async acceptFriendRequest(requestId: string): Promise<void> {
    await delay(400);
    _requests = _requests.map((r) =>
      r.id === requestId ? { ...r, status: 'accepted' as const } : r
    );
  },

  async declineFriendRequest(requestId: string): Promise<void> {
    await delay(300);
    _requests = _requests.filter((r) => r.id !== requestId);
  },

  async removeFriend(friendId: string): Promise<void> {
    await delay(400);
    _friends = _friends.filter((f) => f.id !== friendId);
  },

  getPendingRequestCount(): number {
    return _requests.filter((r) => r.status === 'pending').length;
  },
};
