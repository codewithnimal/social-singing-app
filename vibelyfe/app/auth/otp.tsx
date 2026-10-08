// Vibely — OTP Verification Screen

import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientButton } from '../../src/components/buttons/Buttons';
import { OTPInput } from '../../src/components/inputs/Inputs';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';
import { Colors } from '../../src/theme/colors';
import { FontFamily, FontSize } from '../../src/theme/typography';
import { authService } from '../../src/services/authService';

const OTP_LENGTH = 6;
const RESEND_COUNTDOWN = 30;

export default function OTPScreen() {
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const displayEmail = email ?? 'your email';

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COUNTDOWN);
  const [canResend, setCanResend] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleVerify = async () => {
    if (otp.length < OTP_LENGTH) {
      setError('Please enter the full 6-digit code');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authService.verifyOTP(displayEmail, otp);
      router.replace('/(main)/home');
    } catch (err: any) {
      setError(err.message ?? 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setCanResend(false);
    setCountdown(RESEND_COUNTDOWN);
    setOtp('');
    setError('');
    await authService.sendOTP(displayEmail);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[Colors.background.primary, Colors.background.secondary]}
        style={StyleSheet.absoluteFill}
      />

      <ScreenHeader showBack transparent />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={Colors.gradient.purpleOnly as [string, string]}
              style={styles.iconGradient}
            >
              <Text style={styles.icon}>✉️</Text>
            </LinearGradient>
            <View style={styles.iconGlow} />
          </View>

          {/* Heading */}
          <View style={styles.heading}>
            <Text style={styles.title}>Check your inbox</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to{'\n'}
              <Text style={styles.emailHighlight}>{displayEmail}</Text>
            </Text>
          </View>

          {/* OTP Input */}
          <View style={styles.otpSection}>
            <OTPInput value={otp} onChange={setOtp} length={OTP_LENGTH} />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Hint */}
            <Text style={styles.hint}>💡 Use 123456 for demo</Text>
          </View>

          {/* Verify button */}
          <GradientButton
            label="Verify Code"
            onPress={handleVerify}
            loading={loading}
            disabled={otp.length < OTP_LENGTH}
          />

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            {canResend ? (
              <TouchableOpacity onPress={handleResend} accessibilityLabel="Resend OTP">
                <Text style={styles.resendLink}>Resend</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.countdown}>Resend in {countdown}s</Text>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    gap: 32,
    paddingTop: 16,
  },
  iconContainer: {
    alignSelf: 'center',
    position: 'relative',
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 36,
  },
  iconGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.brand.purple,
    opacity: 0.25,
    top: 4,
    left: 4,
    zIndex: -1,
  },
  heading: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.text.muted,
    textAlign: 'center',
    lineHeight: 24,
  },
  emailHighlight: {
    fontFamily: FontFamily.semiBold,
    color: Colors.brand.violet,
  },
  otpSection: {
    gap: 12,
    alignItems: 'center',
  },
  errorText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.status.error,
    textAlign: 'center',
  },
  hint: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
    textAlign: 'center',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.text.muted,
  },
  resendLink: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.brand.violet,
  },
  countdown: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    color: Colors.text.muted,
  },
});
