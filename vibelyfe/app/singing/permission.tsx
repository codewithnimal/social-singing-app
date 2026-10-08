// Vibely — Microphone Permission Screen

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../src/theme/colors';
import { FontFamily, FontSize } from '../../src/theme/typography';
import { Radius } from '../../src/theme/radius';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';
import { audioService } from '../../src/services/audioService';

export default function MicrophonePermissionScreen() {
  const params = useLocalSearchParams<{
    chatId: string;
    friendId: string;
    friendName: string;
    isReply?: string;
    replyToMessageId?: string;
    prompt?: string;
  }>();

  const [requesting, setRequesting] = useState(false);

  const handleGrant = async () => {
    setRequesting(true);
    const granted = await audioService.requestMicrophonePermission();
    setRequesting(false);
    if (granted) {
      router.replace({
        pathname: '/singing/recording',
        params: {
          chatId: params.chatId,
          friendId: params.friendId,
          friendName: params.friendName,
          isReply: params.isReply,
          replyToMessageId: params.replyToMessageId,
          prompt: params.prompt,
        },
      } as any);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScreenHeader title="" showBack />

        <View style={styles.content}>
          {/* Animated concentric rings illustration */}
          <View style={styles.graphicContainer}>
            <View style={[styles.ring, styles.ring3]} />
            <View style={[styles.ring, styles.ring2]} />
            <LinearGradient
              colors={Colors.gradient.primary as [string, string]}
              style={styles.micCircle}
            >
              <Text style={styles.micEmoji}>🎙️</Text>
            </LinearGradient>
          </View>

          <Text style={styles.title}>Enable Microphone</Text>
          <Text style={styles.description}>
            Vibely is a voice and singing messenger. To sing melodies and send tunes to{' '}
            <Text style={{ color: Colors.text.primary, fontFamily: FontFamily.semiBold }}>
              {params.friendName || 'friends'}
            </Text>
            , we need access to your device microphone.
          </Text>

          <View style={styles.privacyCard}>
            <Text style={styles.privacyIcon}>🔒</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.privacyTitle}>Your voice is private</Text>
              <Text style={styles.privacyText}>
                Microphone is only active while you hold or press record. We never record in the background.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.allowBtn}
            onPress={handleGrant}
            disabled={requesting}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={Colors.gradient.primary as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.allowGradient}
            >
              <Text style={styles.allowBtnText}>
                {requesting ? 'Enabling...' : 'Enable Microphone'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelBtnText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
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
    justifyContent: 'space-between',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 16,
  },
  graphicContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
  },
  ring3: {
    width: 190,
    height: 190,
    borderColor: Colors.brand.purple + '25',
  },
  ring2: {
    width: 140,
    height: 140,
    borderColor: Colors.brand.violet + '40',
  },
  micCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.brand.purple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
  micEmoji: {
    fontSize: 42,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.text.primary,
    textAlign: 'center',
  },
  description: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface.dark,
    padding: 16,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    gap: 12,
    marginTop: 12,
  },
  privacyIcon: {
    fontSize: 20,
  },
  privacyTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  privacyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
    lineHeight: 18,
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    gap: 12,
  },
  allowBtn: {
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  allowGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  allowBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.text.primary,
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
  },
});
