// Vibely — Avatar Service
// Manages profile photos (camera/gallery) and preset avatar selections

import AsyncStorage from '@react-native-async-storage/async-storage';

export const AVATAR_STORAGE_KEY = '@vibely_user_avatar';

export interface PresetAvatar {
  id: string;
  name: string;
  emoji: string;
  gradient: [string, string];
}

export const PRESET_AVATARS: PresetAvatar[] = [
  { id: 'avatar:pop', name: 'Pop Star', emoji: '🎤', gradient: ['#E83E8C', '#8B5CF6'] },
  { id: 'avatar:rock', name: 'Rocker', emoji: '🎸', gradient: ['#1677FF', '#8B5CF6'] },
  { id: 'avatar:dj', name: 'Beatmaster', emoji: '🎧', gradient: ['#22C55E', '#1677FF'] },
  { id: 'avatar:jazz', name: 'Jazz Cat', emoji: '🎷', gradient: ['#F59E0B', '#EF4444'] },
  { id: 'avatar:diva', name: 'Soul Diva', emoji: '✨', gradient: ['#E83E8C', '#3B82F6'] },
  { id: 'avatar:retro', name: 'Synthwave', emoji: '⚡', gradient: ['#6366F1', '#E83E8C'] },
];

export const avatarService = {
  async getAvatar(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(AVATAR_STORAGE_KEY);
    } catch {
      return null;
    }
  },

  async setAvatar(avatarUriOrPreset: string): Promise<void> {
    try {
      await AsyncStorage.setItem(AVATAR_STORAGE_KEY, avatarUriOrPreset);
    } catch (e) {
      console.warn('Failed to save avatar:', e);
    }
  },

  async removeAvatar(): Promise<void> {
    try {
      await AsyncStorage.removeItem(AVATAR_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to remove avatar:', e);
    }
  },

  getPreset(presetId: string): PresetAvatar | undefined {
    return PRESET_AVATARS.find((p) => p.id === presetId);
  },
};
