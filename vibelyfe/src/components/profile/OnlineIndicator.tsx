// Vibely — Component: OnlineIndicator

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../theme/colors';

interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: number;
  style?: ViewStyle;
  borderColor?: string;
}

export function OnlineIndicator({
  isOnline,
  size = 10,
  style,
  borderColor = Colors.background.secondary,
}: OnlineIndicatorProps) {
  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isOnline ? Colors.status.online : Colors.status.offline,
          borderWidth: 2,
          borderColor,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
});
