// Vibely — Service: Chat (mock implementation)

import { Chat, Message, TextMessage, SingingMessage } from '../types';
import { MOCK_CHATS, MOCK_MESSAGES } from '../mock/messages';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

let _chats = [...MOCK_CHATS];
let _messages: Record<string, Message[]> = { ...MOCK_MESSAGES };

export const chatService = {
  async getChats(): Promise<Chat[]> {
    await delay(400);
    return [..._chats].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  async getChat(chatId: string): Promise<Chat | null> {
    await delay(200);
    return _chats.find((c) => c.id === chatId) ?? null;
  },

  async getMessages(chatId: string): Promise<Message[]> {
    await delay(350);
    return _messages[chatId] ?? [];
  },

  async sendTextMessage(chatId: string, text: string): Promise<TextMessage> {
    await delay(300);
    const message: TextMessage = {
      id: `msg-${Date.now()}`,
      chatId,
      senderId: 'user-me',
      type: 'text',
      status: 'sent',
      timestamp: new Date(),
      isOwn: true,
      text,
    };
    if (!_messages[chatId]) _messages[chatId] = [];
    _messages[chatId].push(message);

    // Update chat's last message
    _chats = _chats.map((c) =>
      c.id === chatId ? { ...c, lastMessage: message, updatedAt: new Date() } : c
    );

    return message;
  },

  async sendSingingMessage(chatId: string, message: Omit<SingingMessage, 'id' | 'timestamp' | 'status' | 'isOwn' | 'senderId'>): Promise<SingingMessage> {
    await delay(1500); // simulate upload
    const sent: SingingMessage = {
      ...message,
      id: `msg-${Date.now()}`,
      senderId: 'user-me',
      status: 'sent',
      timestamp: new Date(),
      isOwn: true,
    };
    if (!_messages[chatId]) _messages[chatId] = [];
    _messages[chatId].push(sent);

    _chats = _chats.map((c) =>
      c.id === chatId ? { ...c, lastMessage: sent, updatedAt: new Date() } : c
    );

    return sent;
  },

  async markMessagesRead(chatId: string): Promise<void> {
    await delay(150);
    _chats = _chats.map((c) =>
      c.id === chatId ? { ...c, unreadCount: 0 } : c
    );
    if (_messages[chatId]) {
      _messages[chatId] = _messages[chatId].map((m) =>
        !m.isOwn && m.status !== 'read' ? { ...m, status: 'read' as const } : m
      );
    }
  },

  async markSingingMessageListened(messageId: string, chatId: string): Promise<void> {
    await delay(100);
    if (_messages[chatId]) {
      _messages[chatId] = _messages[chatId].map((m) =>
        m.id === messageId && m.type === 'singing'
          ? { ...m, isListened: true }
          : m
      );
    }
  },

  getTotalUnreadCount(): number {
    return _chats.reduce((sum, c) => sum + c.unreadCount, 0);
  },
};
