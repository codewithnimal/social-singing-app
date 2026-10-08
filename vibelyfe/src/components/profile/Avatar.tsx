// Vibely — Component: Avatar
// Supports custom photo URIs, preset avatar badges, and initials fallbacks

import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontFamily } from '../../theme/typography';
import { avatarService } from '../../services/avatarService';

interface AvatarProps {
  name: string;
  size?: number;
  avatarUrl?: string | null;
  style?: ViewStyle;
}

function getInitials(name: string): string {
  const parts = (name || '').trim().split(' ');
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const GRADIENT_PAIRS: Array<[string, string]> = [
  ['#1677FF', '#8B5CF6'],
  ['#E83E8C', '#8B5CF6'],
  ['#1677FF', '#3B82F6'],
  ['#22C55E', '#1677FF'],
  ['#F59E0B', '#EF4444'],
  ['#8B5CF6', '#E83E8C'],
];

export function Avatar({ name, size = 44, avatarUrl, style }: AvatarProps) {
  const borderRadius = size / 2;

  // 1. Preset Avatar check (e.g. avatar:pop)
  if (avatarUrl && avatarUrl.startsWith('avatar:')) {
    const preset = avatarService.getPreset(avatarUrl);
    if (preset) {
      return (
        <LinearGradient
          colors={preset.gradient}
          style={[
            styles.container,
            { width: size, height: size, borderRadius },
            style,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={{ fontSize: size * 0.48 }}>{preset.emoji}</Text>
        </LinearGradient>
      );
    }
  }

  // 2. Custom photo URI check (file:// or http/https)
  if (avatarUrl && (avatarUrl.startsWith('file:') || avatarUrl.startsWith('http') || avatarUrl.startsWith('content:'))) {
    return (
      <View style={[styles.container, { width: size, height: size, borderRadius }, style]}>
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size, borderRadius }}
          resizeMode="cover"
        />
      </View>
    );
  }

  // 3. Fallback initials with vibrant gradient
  const initials = getInitials(name);
  const colorIndex = Math.abs(
    (name || 'Vibely')
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0)
  ) % GRADIENT_PAIRS.length;
  const gradient = GRADIENT_PAIRS[colorIndex];
  const fontSize = Math.round(size * 0.38);

  return (
    <LinearGradient
      colors={gradient}
      style={[
        styles.container,
        { width: size, height: size, borderRadius },
        style,
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
  },
});
