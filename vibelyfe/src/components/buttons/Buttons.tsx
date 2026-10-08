// Vibely — Component: Buttons

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../theme/colors';
import { FontFamily, FontSize } from '../../theme/typography';
import { Radius } from '../../theme/radius';
import { Layout } from '../../theme/spacing';

// ─── PrimaryButton ─────────────────────────────────────────────────────────

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function PrimaryButton({ label, onPress, disabled, loading, style, textStyle, fullWidth = true }: ButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.base, fullWidth && styles.fullWidth, disabled && styles.disabled, style]}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.buttonContent}>
        {loading ? (
          <ActivityIndicator color={Colors.text.primary} size="small" />
        ) : (
          <Text style={[styles.primaryText, textStyle]}>{label}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── SecondaryButton ───────────────────────────────────────────────────────

export function SecondaryButton({ label, onPress, disabled, loading, style, textStyle, fullWidth = true }: ButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.base, styles.secondary, fullWidth && styles.fullWidth, disabled && styles.disabled, style]}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.buttonContent}>
        {loading ? (
          <ActivityIndicator color={Colors.brand.violet} size="small" />
        ) : (
          <Text style={[styles.secondaryText, textStyle]}>{label}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── GradientButton ─────────────────────────────────────────────────────────

interface GradientButtonProps extends ButtonProps {
  colors?: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

export function GradientButton({
  label,
  onPress,
  disabled,
  loading,
  style,
  textStyle,
  fullWidth = true,
  colors = Colors.gradient.primary,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 0 },
}: GradientButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.gradientWrapper, fullWidth && styles.fullWidth, disabled && styles.disabled, style]}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <LinearGradient
        colors={colors as [string, string, ...string[]]}
        start={start}
        end={end}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color={Colors.text.primary} size="small" />
        ) : (
          <Text style={[styles.primaryText, textStyle]}>{label}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── IconButton ─────────────────────────────────────────────────────────────

interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  size?: number;
  style?: ViewStyle;
  label?: string;
  disabled?: boolean;
  variant?: 'ghost' | 'glass' | 'filled';
}

export function IconButton({ icon, onPress, size = 44, style, label, disabled, variant = 'ghost' }: IconButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2 },
        variant === 'glass' && styles.iconGlass,
        variant === 'filled' && styles.iconFilled,
        disabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={label ?? 'Button'}
    >
      {icon}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: Layout.touchTargetLg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.brand.purple,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.surface.borderActive,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.4,
  },
  buttonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  primaryText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.text.primary,
    letterSpacing: 0.5,
  },
  secondaryText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.brand.violet,
    letterSpacing: 0.5,
  },
  gradientWrapper: {
    height: Layout.touchTargetLg,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlass: {
    backgroundColor: Colors.surface.glass,
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  iconFilled: {
    backgroundColor: Colors.surface.dark,
  },
});
