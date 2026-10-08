// Vibely — Component: Text Inputs

import React, { useState } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  KeyboardTypeOptions,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { FontFamily, FontSize } from '../../theme/typography';
import { Radius } from '../../theme/radius';

// ─── Base TextInput ─────────────────────────────────────────────────────────

interface TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'email' | 'tel' | 'username' | 'off';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  maxLength?: number;
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function TextInput({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  keyboardType,
  autoCapitalize = 'none',
  autoComplete,
  leftIcon,
  rightIcon,
  style,
  maxLength,
  editable = true,
  multiline,
  numberOfLines,
  onFocus,
  onBlur,
}: TextInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          focused && styles.focused,
          !!error && styles.errorBorder,
          !editable && styles.disabled,
          multiline ? { minHeight: 80, alignItems: 'flex-start' } : undefined,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <RNTextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.text.muted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeft : undefined,
            rightIcon ? styles.inputWithRight : undefined,
            multiline ? { textAlignVertical: 'top', paddingTop: 12 } : undefined,
          ]}
          maxLength={maxLength}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={() => { setFocused(true); onFocus?.(); }}
          onBlur={() => { setFocused(false); onBlur?.(); }}
          selectionColor={Colors.brand.violet}
          accessibilityLabel={label ?? placeholder}
        />
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// ─── PasswordInput ──────────────────────────────────────────────────────────

interface PasswordInputProps extends Omit<TextInputProps, 'keyboardType' | 'rightIcon'> {}

export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <TextInput
      {...props}
      keyboardType="default"
      autoComplete="off"
    />
  );
}

// ─── SearchBar ──────────────────────────────────────────────────────────────

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
  onClear?: () => void;
}

export function SearchBar({ value, onChangeText, placeholder = 'Search...', style, onClear }: SearchBarProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.searchContainer, focused && styles.focused, style]}>
      <Text style={styles.searchIcon}>🔍</Text>
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.text.muted}
        style={styles.searchInput}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        selectionColor={Colors.brand.violet}
        autoCapitalize="none"
        accessibilityLabel={placeholder}
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => { onChangeText(''); onClear?.(); }}
          accessibilityLabel="Clear search"
        >
          <Text style={styles.clearIcon}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── OTPInput ────────────────────────────────────────────────────────────────

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
}

export function OTPInput({ value, onChange, length = 6 }: OTPInputProps) {
  const digits = value.padEnd(length, '').split('').slice(0, length);

  return (
    <View style={styles.otpRow}>
      {digits.map((digit, i) => (
        <View
          key={i}
          style={[
            styles.otpBox,
            i < value.length && styles.otpFilled,
            i === value.length && styles.otpActive,
          ]}
        >
          <Text style={styles.otpDigit}>{digit}</Text>
        </View>
      ))}
      {/* Hidden real input */}
      <RNTextInput
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        style={styles.otpHidden}
        selectionColor="transparent"
        caretHidden
        accessibilityLabel="OTP input"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.dark,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.surface.border,
    minHeight: 52,
  },
  focused: {
    borderColor: Colors.brand.violet,
  },
  errorBorder: {
    borderColor: Colors.status.error,
  },
  disabled: {
    opacity: 0.5,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.text.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputWithLeft: {
    paddingLeft: 8,
  },
  inputWithRight: {
    paddingRight: 8,
  },
  leftIcon: {
    paddingLeft: 16,
  },
  rightIcon: {
    paddingRight: 16,
  },
  errorText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.status.error,
    marginTop: 4,
  },
  // SearchBar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.dark,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: Colors.surface.border,
    paddingHorizontal: 16,
    height: 48,
    gap: 10,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.text.primary,
  },
  clearIcon: {
    fontSize: 14,
    color: Colors.text.muted,
    padding: 4,
  },
  // OTP
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface.dark,
    borderWidth: 1.5,
    borderColor: Colors.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpFilled: {
    borderColor: Colors.brand.violet,
    backgroundColor: Colors.surface.glass,
  },
  otpActive: {
    borderColor: Colors.accent.orange,
  },
  otpDigit: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.text.primary,
  },
  otpHidden: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: '100%',
  },
});
