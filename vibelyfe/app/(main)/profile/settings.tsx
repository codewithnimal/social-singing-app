// Vibely — Settings Screen (Audio quality, autoplay, haptics, privacy)

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Colors } from '../../../src/theme/colors';
import { FontFamily, FontSize } from '../../../src/theme/typography';
import { Radius } from '../../../src/theme/radius';
import { ScreenHeader } from '../../../src/components/layout/ScreenHeader';
import { GlassCard } from '../../../src/components/cards/GlassCard';

export default function SettingsScreen() {
  const [hdAudio, setHdAudio] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScreenHeader title="Settings" subtitle="Audio preferences & privacy" showBack />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Audio & Playback Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Audio & Playback</Text>

            <GlassCard style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>High Definition Audio</Text>
                <Text style={styles.settingSubtitle}>Record & stream voices at 256kbps stereo</Text>
              </View>
              <Switch
                value={hdAudio}
                onValueChange={setHdAudio}
                trackColor={{ false: '#E2E8F0', true: Colors.brand.blue }}
                thumbColor="#FFFFFF"
              />
            </GlassCard>

            <GlassCard style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Auto-play Singing Messages</Text>
                <Text style={styles.settingSubtitle}>Automatically play incoming songs in chats</Text>
              </View>
              <Switch
                value={autoPlay}
                onValueChange={setAutoPlay}
                trackColor={{ false: '#E2E8F0', true: Colors.brand.blue }}
                thumbColor="#FFFFFF"
              />
            </GlassCard>

            <GlassCard style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Haptic Feedback</Text>
                <Text style={styles.settingSubtitle}>Vibrate lightly on record, tap and playback</Text>
              </View>
              <Switch
                value={hapticsEnabled}
                onValueChange={setHapticsEnabled}
                trackColor={{ false: '#E2E8F0', true: Colors.brand.blue }}
                thumbColor="#FFFFFF"
              />
            </GlassCard>
          </View>

          {/* Privacy Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Privacy & Visibility</Text>

            <GlassCard style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Show Online Status</Text>
                <Text style={styles.settingSubtitle}>Let friends see when you are active to sing</Text>
              </View>
              <Switch
                value={showOnlineStatus}
                onValueChange={setShowOnlineStatus}
                trackColor={{ false: '#E2E8F0', true: Colors.brand.blue }}
                thumbColor="#FFFFFF"
              />
            </GlassCard>
          </View>

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>About Vibely</Text>

            <GlassCard style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Version</Text>
                <Text style={styles.settingSubtitle}>1.0.0 (Production Frontend)</Text>
              </View>
            </GlassCard>

            <TouchableOpacity
              onPress={() => Alert.alert('Privacy Policy', 'Vibely encrypts singing voice notes and respects user privacy.')}
              activeOpacity={0.8}
            >
              <GlassCard style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Privacy Policy</Text>
                </View>
                <Text style={styles.arrowText}>›</Text>
              </GlassCard>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Alert.alert('Terms of Service', 'Welcome to Vibely. Be kind, sing joyfully!')}
              activeOpacity={0.8}
            >
              <GlassCard style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Terms of Service</Text>
                </View>
                <Text style={styles.arrowText}>›</Text>
              </GlassCard>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 24,
  },
  section: {
    gap: 10,
  },
  sectionHeading: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  settingInfo: {
    flex: 1,
    gap: 2,
    marginRight: 12,
  },
  settingTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.text.primary,
  },
  settingSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  arrowText: {
    fontSize: 22,
    color: Colors.text.muted,
  },
});
