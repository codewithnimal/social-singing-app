// Vibely — Utility: Haptic feedback wrapper

import { Platform } from 'react-native';

// Gracefully handle environments without expo-haptics
let Haptics: typeof import('expo-haptics') | null = null;
try {
  Haptics = require('expo-haptics');
} catch {
  // Not available
}

export const haptics = {
  light: () => {
    if (Platform.OS !== 'web') {
      Haptics?.impactAsync(Haptics.ImpactFeedbackStyle?.Light);
    }
  },
  medium: () => {
    if (Platform.OS !== 'web') {
      Haptics?.impactAsync(Haptics.ImpactFeedbackStyle?.Medium);
    }
  },
  heavy: () => {
    if (Platform.OS !== 'web') {
      Haptics?.impactAsync(Haptics.ImpactFeedbackStyle?.Heavy);
    }
  },
  success: () => {
    if (Platform.OS !== 'web') {
      Haptics?.notificationAsync(Haptics.NotificationFeedbackType?.Success);
    }
  },
  error: () => {
    if (Platform.OS !== 'web') {
      Haptics?.notificationAsync(Haptics.NotificationFeedbackType?.Error);
    }
  },
  selection: () => {
    if (Platform.OS !== 'web') {
      Haptics?.selectionAsync();
    }
  },
};
