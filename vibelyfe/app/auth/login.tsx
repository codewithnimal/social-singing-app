// Vibely — Login Screen
// Light theme, real backend auth via AuthContext

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

// ─── Logo ─────────────────────────────────────────────────────────────────────
function AuthLogo() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale: pulse }] }}>
      <LinearGradient
        colors={['#FFFFFF', '#F0F6FF']}
        style={logoStyles.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={logoStyles.note}>♫</Text>
        <View style={logoStyles.bars}>
          {[0.5, 0.9, 1, 0.7, 0.55].map((h, i) => (
            <View
              key={i}
              style={[
                logoStyles.bar,
                {
                  height: h * 22,
                  backgroundColor:
                    i === 2
                      ? Colors.accent.pink
                      : i % 2 === 0
                      ? Colors.brand.blue
                      : Colors.brand.purple,
                },
              ]}
            />
          ))}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const logoStyles = StyleSheet.create({
  card: {
    width: 80,
    height: 80,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.brand.blue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  note: { fontSize: 22, color: Colors.brand.blue },
  bars: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bar: { width: 3.5, borderRadius: 2, minHeight: 4 },
});

// ─── Input ────────────────────────────────────────────────────────────────────
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
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View
        style={[
          fieldStyles.row,
          focused && fieldStyles.focused,
          !!error && fieldStyles.errored,
        ]}
      >
        <RNTextInput
          style={fieldStyles.input}
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
          <Pressable onPress={onRightIcon} style={fieldStyles.eyeBtn}>
            <Text style={fieldStyles.eyeIcon}>{rightIcon}</Text>
          </Pressable>
        )}
      </View>
      {!!error && <Text style={fieldStyles.error}>{error}</Text>}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.surface.border,
    backgroundColor: Colors.surface.white,
    paddingHorizontal: 16,
    shadowColor: Colors.brand.blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  focused: {
    borderColor: Colors.brand.blue,
    shadowOpacity: 0.10,
  },
  errored: {
    borderColor: Colors.status.error,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.text.primary,
  },
  eyeBtn: { padding: 6 },
  eyeIcon: { fontSize: 18 },
  error: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.status.error,
    marginTop: 2,
  },
});

// ─── Login Screen ──────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
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
    let ok = true;
    if (!username.trim()) { setUsernameError('Username is required'); ok = false; }
    else setUsernameError('');
    if (!password.trim()) { setPasswordError('Password is required'); ok = false; }
    else if (password.length < 4) { setPasswordError('Minimum 4 characters'); ok = false; }
    else setPasswordError('');
    return ok;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setApiError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
      router.replace('/(main)/home');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please try again.';
      if (msg.includes('Incorrect') || msg.includes('401')) {
        setApiError('Incorrect username or password.');
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
      {/* Soft gradient bg */}
      <LinearGradient
        colors={['#FFF0F8', '#F8FBFF', '#EEF4FF']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Ambient blobs */}
      <View style={styles.blobPink} />
      <View style={styles.blobBlue} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          {/* Logo */}
          <View style={styles.logoSection}>
            <AuthLogo />
            <Text style={styles.appName}>VibeLy</Text>
          </View>

          {/* Heading */}
          <View style={styles.headingSection}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Your voice is waiting.</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Field
              label="Username"
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your username"
              error={usernameError}
              autoCapitalize="none"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              error={passwordError}
              rightIcon={showPassword ? '🙈' : '👁️'}
              onRightIcon={() => setShowPassword(!showPassword)}
            />

            {/* API error */}
            {!!apiError && (
              <View style={styles.apiErrorBox}>
                <Text style={styles.apiErrorText}>{apiError}</Text>
              </View>
            )}

            {/* Login CTA */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && { opacity: 0.75 }]}
              onPress={handleLogin}
              disabled={loading}
              accessibilityLabel="Log In"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={[Colors.brand.blue, Colors.brand.purple] as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginGradient}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.loginBtnText}>Log In</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Register link */}
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => router.push('/auth/register' as any)}
              accessibilityLabel="Create Account"
            >
              <Text style={styles.signupLink}>Create Account</Text>
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
    position: 'absolute',
    top: -60,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: Colors.accent.pink,
    opacity: 0.07,
  },
  blobBlue: {
    position: 'absolute',
    bottom: -50,
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: Colors.brand.blue,
    opacity: 0.07,
  },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24 },
  content: { flex: 1, gap: 32 },
  logoSection: { alignItems: 'center', gap: 12, marginTop: 8 },
  appName: {
    fontFamily: FontFamily.bold,
    fontSize: 32,
    color: Colors.text.primary,
    letterSpacing: -1,
  },
  headingSection: { alignItems: 'center', gap: 6 },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.accent.pink,
  },
  form: { gap: 16 },
  apiErrorBox: {
    backgroundColor: Colors.status.errorBg,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.status.error + '40',
  },
  apiErrorText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.status.error,
    textAlign: 'center',
  },
  loginBtn: { borderRadius: 16, overflow: 'hidden' },
  loginGradient: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  loginBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  signupText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.text.secondary,
  },
  signupLink: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.brand.blue,
  },
});
