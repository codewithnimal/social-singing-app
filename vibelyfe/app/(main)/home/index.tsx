// Vibely — Singing Studio (Home Screen)
// Matches reference: avatar top-left, settings top-right, waveform center,
// effect chips bottom, large mic button

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../../src/theme/colors';
import { FontFamily, FontSize } from '../../../src/theme/typography';
import { useAuth } from '../../../src/context/AuthContext';
import { friendsApi } from '../../../src/api/friendsApi';
import { BackendUser } from '../../../src/api/types';
import { Avatar } from '../../../src/components/profile/Avatar';
import { avatarService } from '../../../src/services/avatarService';

const { width } = Dimensions.get('window');

// ─── Animated Waveform ───────────────────────────────────────────────────────
function StudioWaveform({ isAnimating }: { isAnimating: boolean }) {
  const barCount = 32;
  const barAnims = useRef(
    Array.from({ length: barCount }, (_, i) =>
      new Animated.Value(0.2 + Math.abs(Math.sin(i * 0.5)) * 0.4)
    )
  ).current;

  useEffect(() => {
    if (!isAnimating) return;
    const animations = barAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 35),
          Animated.timing(anim, {
            toValue: 0.3 + Math.random() * 0.7,
            duration: 280 + Math.random() * 220,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 0.1 + Math.random() * 0.3,
            duration: 280 + Math.random() * 220,
            useNativeDriver: false,
          }),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [isAnimating]);

  const barWidth = (width - 80) / (barCount * 1.7);

  return (
    <View style={waveStyles.container}>
      {barAnims.map((anim, i) => {
        const isCenter = Math.abs(i - barCount / 2) < barCount * 0.2;
        return (
          <Animated.View
            key={i}
            style={[
              waveStyles.bar,
              {
                width: barWidth,
                height: anim.interpolate({ inputRange: [0, 1], outputRange: [4, 64] }),
                backgroundColor:
                  i % 5 === 2
                    ? Colors.accent.pink
                    : i % 3 === 0
                    ? Colors.brand.purple
                    : Colors.brand.blue,
                opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] }),
              },
            ]}
          />
        );
      })}
    </View>
  );
}
const waveStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 80,
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 16,
  },
  bar: { borderRadius: 3, minHeight: 4 },
});

// ─── Effect Chip ──────────────────────────────────────────────────────────────
const DISPLAY_EFFECTS = [
  { id: 'original', label: 'Original', icon: '🎙️', detail: 'Your natural voice', tint: '#3587F5' },
  { id: 'echo', label: 'Echo', icon: '🔊', detail: 'Add a little depth', tint: '#F29A38' },
  { id: 'baby', label: 'Baby', icon: '👶', detail: 'Make it sound cute', tint: '#E9B62D' },
  { id: 'deep', label: 'Deep', icon: '🎙️', detail: 'Lower the pitch', tint: '#9257E8' },
  { id: 'cattish', label: 'Cattish', icon: '🐱', detail: 'Add a playful twist', tint: '#E83E8C' },
];

// ─── Recording Button ─────────────────────────────────────────────────────────
function RecordButton({ onPress }: { onPress: () => void }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const ring1 = useRef(new Animated.Value(1)).current;
  const ring2 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.95, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    const ringAnim = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(anim, { toValue: 1.35, duration: 1800, useNativeDriver: true }),
          ]),
          Animated.timing(anim, { toValue: 1, duration: 0, useNativeDriver: true }),
        ])
      ).start();

    ringAnim(ring1, 0);
    ringAnim(ring2, 900);
  }, []);

  return (
    <View style={rbStyles.wrap}>
      {/* Outer pulse rings */}
      <Animated.View
        style={[
          rbStyles.ring,
          {
            width: 110,
            height: 110,
            borderRadius: 55,
            transform: [{ scale: ring1 }],
            opacity: ring1.interpolate({ inputRange: [1, 1.35], outputRange: [0.25, 0] }),
          },
        ]}
      />
      <Animated.View
        style={[
          rbStyles.ring,
          {
            width: 110,
            height: 110,
            borderRadius: 55,
            transform: [{ scale: ring2 }],
            opacity: ring2.interpolate({ inputRange: [1, 1.35], outputRange: [0.25, 0] }),
          },
        ]}
      />

      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityLabel="Tap to record"
        accessibilityRole="button"
      >
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <LinearGradient
            colors={[Colors.brand.blue, Colors.accent.pink] as [string, string]}
            style={rbStyles.button}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={rbStyles.micIcon}>🎤</Text>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}
const rbStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
  },
  ring: {
    position: 'absolute',
    backgroundColor: Colors.accent.pink,
  },
  button: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent.pink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  micIcon: { fontSize: 34 },
});

// ─── Home / Singing Studio Screen ────────────────────────────────────────────
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [friends, setFriends] = useState<BackendUser[]>([]);
  const [selectedEffect, setSelectedEffect] = useState('original');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    loadFriends();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isFocused = true;
      avatarService.getAvatar().then((storedAvatar) => {
        if (isFocused) setAvatarUri(storedAvatar);
      });

      return () => {
        isFocused = false;
      };
    }, [])
  );

  const loadFriends = async () => {
    try {
      const resp = await friendsApi.list();
      setFriends(resp.friends);
    } catch {
      // offline or not logged in — silently ignore
    }
  };

  const handleRecord = () => {
    router.push('/singing/permission' as any);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#F7FBFF', '#F0F6FF', '#FFF1F8']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.blobBlue} />
      <View style={styles.blobPink} />

      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 88 }]}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerSide}
              onPress={() => router.push('/(main)/profile')}
              accessibilityLabel="Profile"
            >
              <Avatar
                name={user?.username ?? 'V'}
                avatarUrl={avatarUri}
                size={42}
              />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>
                <Text style={styles.titleBlue}>Singing </Text>
                <Text style={styles.titlePink}>Studio</Text>
              </Text>
              <Text style={styles.headerSubtitle}>Sing  ·  Record  ·  Be You ♡</Text>
            </View>

            <TouchableOpacity
              style={[styles.settingsBtn, styles.headerSide]}
              onPress={() => router.push('/(main)/profile/settings')}
              accessibilityLabel="Open settings"
            >
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>

          <LinearGradient
            colors={['#E8F5FF', '#F5F0FF', '#FFF0F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.studioCard}
          >
            <View style={styles.studioCopy}>
              <Text style={styles.studioTitle}>Your Singing Studio</Text>
              <Text style={styles.studioSubtitle}>What are you feeling today? ☺</Text>
              <View style={styles.studioUnderline} />
            </View>
            <View style={styles.studioArt}>
              <Text style={styles.studioMic}>🎙️</Text>
              <Text style={styles.studioNotes}>♫  ♪</Text>
            </View>
          </LinearGradient>

          <View style={styles.waveContainer}>
            <StudioWaveform isAnimating={true} />
          </View>

          <View style={styles.effectsHeading}>
            <Text style={styles.effectsTitle}>Choose your vibe</Text>
            <Text style={styles.effectsHint}>Tap an effect</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.effectsRow}
          >
            {DISPLAY_EFFECTS.map((fx) => (
              <TouchableOpacity
                key={fx.id}
                style={[
                  styles.effectCard,
                  selectedEffect === fx.id && {
                    borderColor: fx.tint,
                  },
                ]}
                onPress={() => setSelectedEffect(fx.id)}
                accessibilityLabel={`Select ${fx.label} effect`}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedEffect === fx.id }}
              >
                <View style={[styles.effectIconCircle, { backgroundColor: `${fx.tint}20` }]}>
                  <Text style={styles.effectIcon}>{fx.icon}</Text>
                </View>
                {selectedEffect === fx.id && (
                  <View style={[styles.selectedCheck, { backgroundColor: fx.tint }]}>
                    <Text style={styles.selectedCheckText}>✓</Text>
                  </View>
                )}
                <Text
                  style={[
                    styles.effectLabel,
                    selectedEffect === fx.id && { color: fx.tint },
                  ]}
                  numberOfLines={1}
                >
                  {fx.label}
                </Text>
                <Text style={styles.effectDetail} numberOfLines={2}>{fx.detail}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.recordSection}>
            <View style={styles.musicNoteLeft}>
              <Text style={styles.musicNote}>♫</Text>
            </View>
            <View style={styles.recordCenter}>
              <RecordButton onPress={handleRecord} />
              <Text style={styles.tapLabel}>Tap to Record</Text>
            </View>
            <View style={styles.musicNoteRight}>
              <Text style={styles.musicNote}>♪</Text>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background.primary },
  blobBlue: {
    position: 'absolute',
    top: 40,
    right: -90,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: Colors.brand.blue,
    opacity: 0.06,
  },
  blobPink: {
    position: 'absolute',
    bottom: 80,
    left: -90,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: Colors.accent.pink,
    opacity: 0.07,
  },
  container: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerSide: { width: 42, height: 42 },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 21,
  },
  titleBlue: { color: Colors.text.primary },
  titlePink: { color: Colors.accent.pink },
  headerSubtitle: {
    marginTop: 2,
    fontFamily: FontFamily.medium,
    fontSize: 10,
    color: Colors.text.secondary,
    letterSpacing: 0.3,
  },
  settingsBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surface.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surface.border,
    shadowColor: Colors.brand.blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  settingsIcon: { fontSize: 18 },
  studioCard: {
    width: '100%',
    minHeight: 142,
    borderRadius: 22,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(91, 160, 245, 0.18)',
    shadowColor: Colors.brand.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 14,
  },
  studioCopy: { flex: 1, zIndex: 1 },
  studioTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    color: Colors.text.primary,
    marginBottom: 5,
  },
  studioSubtitle: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.brand.blue,
  },
  studioUnderline: {
    width: 72,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.accent.pink,
    marginTop: 9,
    opacity: 0.65,
  },
  studioArt: {
    width: 58,
    height: 94,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studioMic: { fontSize: 47 },
  studioNotes: {
    position: 'absolute',
    top: 5,
    right: -2,
    color: Colors.accent.pink,
    fontSize: 16,
    fontFamily: FontFamily.bold,
  },
  sideControls: {
    alignItems: 'center',
    justifyContent: 'space-around',
    width: 58,
  },
  waveContainer: {
    width: '100%',
    backgroundColor: Colors.surface.white,
    borderRadius: 22,
    minHeight: 104,
    justifyContent: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    shadowColor: Colors.brand.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  effectsHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 9,
    paddingHorizontal: 2,
  },
  effectsTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.text.primary,
  },
  effectsHint: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    color: Colors.text.muted,
  },
  effectsRow: { gap: 8, paddingHorizontal: 1, paddingBottom: 4 },
  effectCard: {
    width: Math.max(76, (width - 36 - 24) / 4),
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: Colors.surface.white,
    borderWidth: 1.5,
    borderColor: Colors.surface.border,
    shadowColor: Colors.brand.blue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  effectIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  effectIcon: { fontSize: 23 },
  selectedCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheckText: {
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 14,
    fontFamily: FontFamily.bold,
  },
  effectLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.text.primary,
    marginBottom: 3,
  },
  effectDetail: {
    fontFamily: FontFamily.regular,
    fontSize: 9,
    lineHeight: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  recordSection: {
    flex: 1,
    minHeight: 158,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 4,
  },
  musicNoteLeft: { width: 40, alignItems: 'flex-start' },
  musicNoteRight: { width: 40, alignItems: 'flex-end' },
  musicNote: {
    fontSize: 28,
    color: Colors.accent.pink,
    opacity: 0.55,
  },
  recordCenter: { alignItems: 'center', gap: 4 },
  tapLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
  },
});
