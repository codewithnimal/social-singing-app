// Vibely — Core Type Definitions

// ─── User ──────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
}

export interface AuthUser extends User {
  token: string;
}

// ─── Friend ────────────────────────────────────────────────────────────────

export interface Friend {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isOnline: boolean;
  lastSeen: Date;
  friendSince: Date;
  chatId: string;
}

export interface FriendRequest {
  id: string;
  from: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  to: string;
  status: 'pending' | 'accepted' | 'declined';
  sentAt: Date;
}

// ─── Chat ──────────────────────────────────────────────────────────────────

export interface Chat {
  id: string;
  participants: string[];
  friend: Friend;
  lastMessage?: Message;
  unreadCount: number;
  wallpaper?: string;
  updatedAt: Date;
}

// ─── Message ───────────────────────────────────────────────────────────────

export type MessageType = 'text' | 'singing';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface BaseMessage {
  id: string;
  chatId: string;
  senderId: string;
  type: MessageType;
  status: MessageStatus;
  timestamp: Date;
  isOwn: boolean;
}

export interface TextMessage extends BaseMessage {
  type: 'text';
  text: string;
}

export interface SingingMessage extends BaseMessage {
  type: 'singing';
  audioUrl: string;
  duration: number; // in seconds
  waveformData: number[]; // normalized 0–1 bar heights
  effect: AudioEffect;
  prompt?: string;
  isListened: boolean;
}

export type Message = TextMessage | SingingMessage;

// ─── Audio ─────────────────────────────────────────────────────────────────

export type AudioEffectId =
  | 'original'
  | 'echo'
  | 'baby'
  | 'cattish'
  | 'deep';

export interface AudioEffect {
  id: AudioEffectId;
  name: string;
  description: string;
  icon: string;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number; // seconds
  waveformData: number[];
  audioUri?: string;
}

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped' | 'error';

export interface PlaybackState {
  status: PlaybackStatus;
  progress: number; // 0–1
  currentTime: number; // seconds
  duration: number; // seconds
  messageId?: string;
}

// ─── Notification ──────────────────────────────────────────────────────────

export type NotificationType =
  | 'friend_request'
  | 'friend_request_accepted'
  | 'new_singing_message'
  | 'friend_sang_back'
  | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  timestamp: Date;
  data?: Record<string, string>;
}

// ─── UI State ──────────────────────────────────────────────────────────────

export type LoadingState = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export interface AsyncState<T> {
  data: T | null;
  status: LoadingState;
  error?: string;
}

// ─── Navigation ────────────────────────────────────────────────────────────

export interface SingingFlowParams {
  chatId: string;
  friendId: string;
  friendName: string;
  isReply?: boolean;
  replyToMessageId?: string;
}

// ─── Wallpaper ─────────────────────────────────────────────────────────────

export interface Wallpaper {
  id: string;
  name: string;
  type: 'gradient' | 'pattern';
  colors: string[];
  preview: string[];
}
