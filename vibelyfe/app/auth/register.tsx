// Vibely — Registration Screen
// Fields: username, email, password — exactly matches backend UserCreate schema

import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../src/theme/colors';
import { FontFamily, FontSize } from '../../src/theme/typography';
import { useAuth } from '../../src/context/AuthContext';

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  error,
  autoCapitalize = 'none',
  rightIcon,
  onRightIcon,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  error?: string;
  autoCapitalize?: 'none' | 'words';
  rightIcon?: string;
  onRightIcon?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View
        style={[
          styles.fieldRow,
          focused && styles.fieldFocused,
          !!error && styles.fieldErrored,
        ]}
      >
        <RNTextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.text.muted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {rightIcon && (
          <Pressable onPress={onRightIcon} style={{ padding: 6 }}>
            <Text style={{ fontSize: 18 }}>{rightIcon}</Text>
          </Pressable>
        )}
      </View>
      {!!error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!username.trim()) errs.username = 'Username is required';
    else if (username.length < 3) errs.username = 'Minimum 3 characters';
    else if (!/^[a-zA-Z0-9_]+$/.test(username))
      errs.username = 'Only letters, numbers, and underscores';

    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email';

    if (!password.trim()) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'Minimum 6 characters';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setApiError('');
    setLoading(true);
    try {
      await register(username.trim(), email.trim(), password);
      router.replace('/(main)/home');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed.';
      if (msg.includes('already registered')) {
        setApiError('Username or email already taken.');
      } else if (msg.includes('Network') || msg.includes('fetch')) {
        setApiError('Cannot connect to server. Check your network.');
      } else {
        setApiError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={['#FFF0F8', '#F8FBFF', '#EEF4FF']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
      <View style={styles.blobPink} />
      <View style={styles.blobBlue} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          {/* Back */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityLabel="Go back"
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>

          {/* Heading */}
          <View style={styles.heading}>
            <Text style={styles.title}>Create Your Vibely</Text>
            <Text style={styles.subtitle}>Join the singing community</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Field
              label="Username"
              value={username}
              onChangeText={setUsername}
              placeholder="e.g. nimalv"
              error={errors.username}
            />
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              error={errors.email}
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Min 6 characters"
              secureTextEntry={!showPassword}
              error={errors.password}
              rightIcon={showPassword ? '🙈' : '👁️'}
              onRightIcon={() => setShowPassword(!showPassword)}
            />

            {!!apiError && (
              <View style={styles.apiErrorBox}>
                <Text style={styles.apiErrorText}>{apiError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.createBtn, loading && { opacity: 0.75 }]}
              onPress={handleRegister}
              disabled={loading}
              accessibilityLabel="Create Account"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={[Colors.brand.blue, Colors.brand.purple] as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createGradient}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.createBtnText}>Create Account</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/auth/login')}>
              <Text style={styles.loginLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background.primary },
  blobPink: {
    position: 'absolute', top: -60, right: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: Colors.accent.pink, opacity: 0.07,
  },
  blobBlue: {
    position: 'absolute', bottom: -50, left: -50,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: Colors.brand.blue, opacity: 0.07,
  },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  content: { flex: 1, gap: 28 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.surface.white, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.brand.blue, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
    alignSelf: 'flex-start',
  },
  backIcon: { fontSize: 18, color: Colors.text.primary },
  heading: { gap: 6 },
  title: {
    fontFamily: FontFamily.bold, fontSize: FontSize['3xl'],
    color: Colors.text.primary, letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: FontFamily.regular, fontSize: FontSize.base,
    color: Colors.accent.pink,
  },
  form: { gap: 16 },
  fieldLabel: {
    fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.text.secondary,
  },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', height: 52,
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.surface.border,
    backgroundColor: Colors.surface.white, paddingHorizontal: 16,
    shadowColor: Colors.brand.blue, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  fieldFocused: { borderColor: Colors.brand.blue, shadowOpacity: 0.10 },
  fieldErrored: { borderColor: Colors.status.error },
  fieldInput: {
    flex: 1, fontFamily: FontFamily.regular,
    fontSize: FontSize.base, color: Colors.text.primary,
  },
  fieldError: {
    fontFamily: FontFamily.regular, fontSize: FontSize.xs,
    color: Colors.status.error, marginTop: 2,
  },
  apiErrorBox: {
    backgroundColor: Colors.status.errorBg, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: Colors.status.error + '40',
  },
  apiErrorText: {
    fontFamily: FontFamily.medium, fontSize: FontSize.sm,
    color: Colors.status.error, textAlign: 'center',
  },
  createBtn: { borderRadius: 16, overflow: 'hidden' },
  createGradient: {
    height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 16,
  },
  createBtnText: {
    fontFamily: FontFamily.semiBold, fontSize: FontSize.md,
    color: '#FFFFFF', letterSpacing: 0.3,
  },
  loginRow: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', marginTop: 4,
  },
  loginText: {
    fontFamily: FontFamily.regular, fontSize: FontSize.base, color: Colors.text.secondary,
  },
  loginLink: {
    fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.brand.blue,
  },
});
