// Vibely — Component: ScreenHeader

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../theme/colors';
import { FontFamily, FontSize } from '../../theme/typography';
import { Layout } from '../../theme/spacing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

interface ScreenHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  rightAction?: React.ReactNode;
  transparent?: boolean;
  style?: ViewStyle;
  subtitle?: string;
}

export function ScreenHeader({
  title,
  showBack = false,
  onBack,
  right,
  rightAction,
  transparent = false,
  style,
  subtitle,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = onBack ?? (() => router.back());

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 8 },
        !transparent && styles.solidBg,
        style,
      ]}
    >
      <View style={styles.row}>
        {showBack ? (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}

        <View style={styles.titleContainer}>
          {title && <Text style={styles.title} numberOfLines={1}>{title}</Text>}
          {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>

        <View style={styles.rightContainer}>
          {(rightAction ?? right) ?? <View style={styles.placeholder} />}
        </View>
      </View>
    </View>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────

interface DividerProps {
  style?: ViewStyle;
  color?: string;
}

export function Divider({ style, color = Colors.surface.border }: DividerProps) {
  return <View style={[{ height: 1, backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: 12,
  },
  solidBg: {
    backgroundColor: Colors.background.secondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: Layout.headerHeight,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: Colors.surface.glass,
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  backIcon: {
    fontSize: 20,
    color: Colors.text.primary,
  },
  placeholder: {
    width: 44,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize['2xl'],
    color: Colors.text.primary,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
    marginTop: 2,
  },
  rightContainer: {
    width: 44,
    alignItems: 'flex-end',
  },
});
