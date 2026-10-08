// Vibely — API Types
// Derived from backend schemas — authoritative

export interface BackendUser {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

export interface BackendToken {
  access_token: string;
  token_type: string;
}

export interface BackendFriendshipResponse {
  id: number;
  user_id: number;
  friend_id: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface BackendFriendListResponse {
  friends: BackendUser[];
  pending_requests_sent: BackendUser[];
  pending_requests_received: BackendUser[];
}

export interface BackendMessageResponse {
  id: number;
  conversation_id: number;
  sender_id: number;
  client_msg_id: string | null;
  content: string | null;
  audio_url: string | null;
  audio_duration_ms: number | null;
  play_count: number;
  max_plays: number;
  created_at: string;
}

export interface BackendPaginatedMessages {
  items: BackendMessageResponse[];
  total: number;
  page: number;
  size: number;
}

export interface BackendEffectResponse {
  url: string;
  effect_id: string;
  status: string;
  processing_time_ms: number;
}

// Backend effect IDs that actually exist in PRESETS
export type BackendEffectId = 'baby' | 'cattish' | 'deep' | 'echo';
