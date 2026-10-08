// Vibely — Component: GlassCard

import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Colors } from '../../theme/colors';
import { Radius } from '../../theme/radius';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  borderRadius?: number;
  borderColor?: string;
  noBackground?: boolean;
}

export function GlassCard({
  children,
  style,
  padding = 16,
  borderRadius = Radius.lg,
  borderColor = Colors.surface.border,
  noBackground = false,
}: GlassCardProps) {
  return (
    <View
      style={[
        styles.card,
        {
          padding,
          borderRadius,
          borderColor,
          backgroundColor: noBackground ? 'transparent' : Colors.surface.glass,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#1677FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
});
