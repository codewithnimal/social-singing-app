// Vibely — Splash Screen
// Soft pink/blue gradient, centered Vibely logo, "Sing. Share. Feel Closer."
// Auto-redirects based on auth state

import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../src/theme/colors';
import { FontFamily, FontSize } from '../src/theme/typography';
import { useAuth } from '../src/context/AuthContext';

const { width, height } = Dimensions.get('window');

// ─── Vibely Logo ──────────────────────────────────────────────────────────────
function VibelyLogo() {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnims = useRef(
    Array.from({ length: 7 }, (_, i) => new Animated.Value(i % 2 === 0 ? 0.3 : 0.7))
  ).current;

  useEffect(() => {
    // Subtle pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    ).start();

    // Staggered waveform bars
    waveAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 100),
          Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: false }),
          Animated.timing(anim, { toValue: 0.25, duration: 500, useNativeDriver: false }),
        ])
      ).start();
    });
  }, []);

  return (
    <Animated.View style={[logoStyles.container, { transform: [{ scale: pulseAnim }] }]}>
      {/* Soft glow halo */}
      <View style={logoStyles.halo} />

      {/* Logo card */}
      <LinearGradient
        colors={['#FFFFFF', '#F0F6FF']}
        style={logoStyles.logoCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Music note icon */}
        <Text style={logoStyles.noteIcon}>♫</Text>

        {/* Mini waveform */}
        <View style={logoStyles.waveRow}>
          {waveAnims.map((anim, i) => (
            <Animated.View
              key={i}
              style={[
                logoStyles.waveBar,
                {
                  height: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [6, i === 3 ? 32 : 22],
                  }),
                  backgroundColor:
                    i === 3
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
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.accent.pink,
    opacity: 0.14,
  },
  logoCard: {
    width: 110,
    height: 110,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.brand.blue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  noteIcon: {
    fontSize: 30,
    color: Colors.brand.blue,
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 36,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    minHeight: 4,
  },
});

// ─── Decorative background waves ─────────────────────────────────────────────
function BackgroundWaves() {
  return (
    <>
      {/* Top-left pink blob */}
      <View
        style={{
          position: 'absolute',
          top: -80,
          left: -80,
          width: 280,
          height: 280,
          borderRadius: 140,
          backgroundColor: Colors.accent.pink,
          opacity: 0.2,
        }}
      />
      {/* Bottom-right blue blob */}
      <View
        style={{
          position: 'absolute',
          bottom: -60,
          right: -60,
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: Colors.brand.blue,
          opacity: 0.07,
        }}
      />
      {/* Center purple blob */}
      <View
        style={{
          position: 'absolute',
          top: '45%',
          left: '30%',
          width: 180,
          height: 180,
          borderRadius: 90,
          backgroundColor: Colors.accent.pink,
          opacity: 0.09,
        }}
      />
    </>
  );
}

// ─── Splash Screen ────────────────────────────────────────────────────────────
export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const taglineFade = useRef(new Animated.Value(0)).current;

  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start(() => {
      Animated.timing(taglineFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    });
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        router.replace('/(main)/home');
      } else {
        router.replace('/auth/login');
      }
    }, 2600);
    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated]);

  return (
    <View style={styles.container}>
      {/* Gradient background */}
      <LinearGradient
        colors={['#F9C4DE', '#FFF0F7', '#F3E8FF']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <BackgroundWaves />

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <VibelyLogo />

        <View style={styles.textBlock}>
          <Text style={styles.appName}>VibeLy</Text>
          <Animated.Text style={[styles.tagline, { opacity: taglineFade }]}>
            Sing. Share. Feel Closer.
          </Animated.Text>
        </View>

        {/* Loading dots */}
        <LoadingDots />
      </Animated.View>
    </View>
  );
}

function LoadingDots() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 350, useNativeDriver: true }),
        ])
      ).start();

    animate(dot1, 0);
    animate(dot2, 200);
    animate(dot3, 400);
  }, []);

  return (
    <View style={styles.dotsRow}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: dot }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 36,
  },
  textBlock: {
    alignItems: 'center',
    gap: 10,
  },
  appName: {
    fontFamily: FontFamily.bold,
    fontSize: 42,
    color: Colors.text.primary,
    letterSpacing: -1.5,
  },
  tagline: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    color: Colors.accent.pink,
    letterSpacing: 0.5,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.brand.blue,
  },
});
