// Vibely — Mock Data: Messages & Chats

import { Chat, Message, SingingMessage, TextMessage } from '../types';
import { MOCK_FRIENDS } from './users';
import { AUDIO_EFFECTS } from '../constants/effects';

// Deterministic waveform generator — seeded by string hash
export function generateWaveform(seed: string, bars = 40): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const result: number[] = [];
  for (let i = 0; i < bars; i++) {
    hash = (hash * 1664525 + 1013904223) & 0xffffffff;
    const normalized = (Math.abs(hash) % 1000) / 1000;
    // Shape: taller in the middle
    const position = i / bars;
    const envelope = Math.sin(position * Math.PI) * 0.6 + 0.2;
    result.push(Math.max(0.05, Math.min(1, normalized * envelope + 0.1)));
  }
  return result;
}

export const MOCK_MESSAGES: Record<string, Message[]> = {
  'chat-1': [
    {
      id: 'msg-1-1',
      chatId: 'chat-1',
      senderId: 'user-2',
      type: 'text',
      status: 'read',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      isOwn: false,
      text: 'Hey! Check this out 🎶',
    } as TextMessage,
    {
      id: 'msg-1-2',
      chatId: 'chat-1',
      senderId: 'user-me',
      type: 'text',
      status: 'read',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
      isOwn: true,
      text: 'What is it?',
    } as TextMessage,
    {
      id: 'msg-1-3',
      chatId: 'chat-1',
      senderId: 'user-2',
      type: 'singing',
      status: 'read',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      isOwn: false,
      audioUrl: 'mock://audio/msg-1-3.m4a',
      duration: 18,
      waveformData: generateWaveform('msg-1-3'),
      effect: AUDIO_EFFECTS[0],
      prompt: 'Sing the chorus of a song that\'s been in your head lately',
      isListened: true,
    } as SingingMessage,
    {
      id: 'msg-1-4',
      chatId: 'chat-1',
      senderId: 'user-me',
      type: 'singing',
      status: 'read',
      timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000),
      isOwn: true,
      audioUrl: 'mock://audio/msg-1-4.m4a',
      duration: 24,
      waveformData: generateWaveform('msg-1-4'),
      effect: AUDIO_EFFECTS[2], // studio
      isListened: true,
    } as SingingMessage,
    {
      id: 'msg-1-5',
      chatId: 'chat-1',
      senderId: 'user-2',
      type: 'text',
      status: 'delivered',
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
      isOwn: false,
      text: 'That was 🔥 omg sing back!!',
    } as TextMessage,
  ],

  'chat-2': [
    {
      id: 'msg-2-1',
      chatId: 'chat-2',
      senderId: 'user-3',
      type: 'singing',
      status: 'delivered',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      isOwn: false,
      audioUrl: 'mock://audio/msg-2-1.m4a',
      duration: 31,
      waveformData: generateWaveform('msg-2-1'),
      effect: AUDIO_EFFECTS[4], // dream
      prompt: 'Share a little song that describes your mood right now',
      isListened: false,
    } as SingingMessage,
  ],

  'chat-3': [
    {
      id: 'msg-3-1',
      chatId: 'chat-3',
      senderId: 'user-me',
      type: 'text',
      status: 'read',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      isOwn: true,
      text: 'Yo Jay, sing something bro',
    } as TextMessage,
    {
      id: 'msg-3-2',
      chatId: 'chat-3',
      senderId: 'user-4',
      type: 'text',
      status: 'read',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000),
      isOwn: false,
      text: 'Haha okay give me a sec',
    } as TextMessage,
    {
      id: 'msg-3-3',
      chatId: 'chat-3',
      senderId: 'user-4',
      type: 'singing',
      status: 'read',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      isOwn: false,
      audioUrl: 'mock://audio/msg-3-3.m4a',
      duration: 22,
      waveformData: generateWaveform('msg-3-3'),
      effect: AUDIO_EFFECTS[1], // echo
      isListened: true,
    } as SingingMessage,
  ],

  'chat-4': [
    {
      id: 'msg-4-1',
      chatId: 'chat-4',
      senderId: 'user-5',
      type: 'text',
      status: 'read',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      isOwn: false,
      text: 'Hey stranger! How are you?',
    } as TextMessage,
    {
      id: 'msg-4-2',
      chatId: 'chat-4',
      senderId: 'user-me',
      type: 'text',
      status: 'read',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000),
      isOwn: true,
      text: 'Doing great! Loving the new singing feature 🎵',
    } as TextMessage,
  ],

  'chat-5': [
    {
      id: 'msg-5-1',
      chatId: 'chat-5',
      senderId: 'user-me',
      type: 'singing',
      status: 'delivered',
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      isOwn: true,
      audioUrl: 'mock://audio/msg-5-1.m4a',
      duration: 19,
      waveformData: generateWaveform('msg-5-1'),
      effect: AUDIO_EFFECTS[3], // warm
      isListened: false,
    } as SingingMessage,
  ],

  'chat-6': [
    {
      id: 'msg-6-1',
      chatId: 'chat-6',
      senderId: 'user-7',
      type: 'text',
      status: 'read',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
      isOwn: false,
      text: 'Just sent you something special 🎶',
    } as TextMessage,
  ],
};

export const MOCK_CHATS: Chat[] = [
  {
    id: 'chat-1',
    participants: ['user-me', 'user-2'],
    friend: MOCK_FRIENDS[0],
    lastMessage: MOCK_MESSAGES['chat-1'][MOCK_MESSAGES['chat-1'].length - 1],
    unreadCount: 1,
    updatedAt: new Date(Date.now() - 10 * 60 * 1000),
  },
  {
    id: 'chat-2',
    participants: ['user-me', 'user-3'],
    friend: MOCK_FRIENDS[1],
    lastMessage: MOCK_MESSAGES['chat-2'][0],
    unreadCount: 1,
    updatedAt: new Date(Date.now() - 30 * 60 * 1000),
  },
  {
    id: 'chat-3',
    participants: ['user-me', 'user-4'],
    friend: MOCK_FRIENDS[2],
    lastMessage: MOCK_MESSAGES['chat-3'][MOCK_MESSAGES['chat-3'].length - 1],
    unreadCount: 0,
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'chat-4',
    participants: ['user-me', 'user-5'],
    friend: MOCK_FRIENDS[3],
    lastMessage: MOCK_MESSAGES['chat-4'][MOCK_MESSAGES['chat-4'].length - 1],
    unreadCount: 0,
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'chat-5',
    participants: ['user-me', 'user-6'],
    friend: MOCK_FRIENDS[4],
    lastMessage: MOCK_MESSAGES['chat-5'][0],
    unreadCount: 0,
    updatedAt: new Date(Date.now() - 45 * 60 * 1000),
  },
  {
    id: 'chat-6',
    participants: ['user-me', 'user-7'],
    friend: MOCK_FRIENDS[5],
    lastMessage: MOCK_MESSAGES['chat-6'][0],
    unreadCount: 0,
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
];
