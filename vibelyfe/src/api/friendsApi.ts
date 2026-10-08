// Vibely — Friends API
// Real backend endpoints

import { apiClient } from './apiClient';
import { BackendUser, BackendFriendshipResponse, BackendFriendListResponse } from './types';

export const friendsApi = {
  /** GET /api/v1/friends/list */
  async list(): Promise<BackendFriendListResponse> {
    return apiClient.get<BackendFriendListResponse>('/friends/list');
  },

  /** GET /api/v1/users/search?q=... */
  async search(q: string): Promise<BackendUser[]> {
    return apiClient.get<BackendUser[]>(`/users/search?q=${encodeURIComponent(q)}`);
  },

  /** POST /api/v1/friends/request/{friend_id} */
  async sendRequest(friendId: number): Promise<BackendFriendshipResponse> {
    return apiClient.post<BackendFriendshipResponse>(`/friends/request/${friendId}`);
  },

  /** POST /api/v1/friends/accept/{friend_id} */
  async accept(friendId: number): Promise<BackendFriendshipResponse> {
    return apiClient.post<BackendFriendshipResponse>(`/friends/accept/${friendId}`);
  },

  /** POST /api/v1/friends/reject/{friend_id} */
  async reject(friendId: number): Promise<BackendFriendshipResponse> {
    return apiClient.post<BackendFriendshipResponse>(`/friends/reject/${friendId}`);
  },

  /** DELETE /api/v1/friends/remove/{friend_id} */
  async remove(friendId: number): Promise<void> {
    return apiClient.delete<void>(`/friends/remove/${friendId}`);
  },
};
