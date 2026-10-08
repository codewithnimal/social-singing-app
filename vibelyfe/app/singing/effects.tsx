// Vibely — Audio Effects Screen (Voice filters, reverb, studio tone)

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../src/theme/colors';
import { FontFamily, FontSize } from '../../src/theme/typography';
import { Radius } from '../../src/theme/radius';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';
import { AUDIO_EFFECTS } from '../../src/constants/effects';
import { AudioEffect } from '../../src/types';
import { audioService } from '../../src/services/audioService';

export default function AudioEffectsScreen() {
  const params = useLocalSearchParams<{
    chatId: string;
    friendId: string;
    friendName: string;
    isReply?: string;
    replyToMessageId?: string;
    prompt?: string;
    audioUri: string;
    duration: string;
  }>();

  const [selectedEffect, setSelectedEffect] = useState<AudioEffect>(AUDIO_EFFECTS[0]);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Cache processed URIs so switching back to a previously-processed effect
  // doesn't require another round-trip to the backend.
  const processedUriCache = useRef<Record<string, string>>({});

  // One animated scale value per card for the press-in bounce effect
  const scaleAnims = useRef<Record<string, Animated.Value>>(
    Object.fromEntries(AUDIO_EFFECTS.map((e) => [e.id, new Animated.Value(1)]))
  ).current;

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Returns the best raw recording URI we have */
  const getRawUri = (): string => {
    const lastFile = audioService.getLastRecordedFile();
    return lastFile?.uri || params.audioUri || '';
  };

  /**
   * Calls the backend DSP to get (or retrieve from cache) the processed URI
   * for the given effect. Throws if effect processing fails so the UI does not
   * silently play the original recording.
   */
  const getProcessedUri = async (effect: AudioEffect): Promise<string> => {
    const rawUri = getRawUri();

    if (effect.id === 'original') {
      return rawUri;
    }

    if (processedUriCache.current[effect.id]) {
      return processedUriCache.current[effect.id];
    }

    const lastFile = audioService.getLastRecordedFile();
    if (!lastFile) {
      return rawUri;
    }

    const processed = await audioService.applyEffect(lastFile, effect.id);
    processedUriCache.current[effect.id] = processed.uri;
    return processed.uri;
  };

  // ── Effect selection ─────────────────────────────────────────────────────

  const handleSelectEffect = useCallback(
    (eff: AudioEffect) => {
      if (selectedEffect.id === eff.id) return;

      // Bounce animation on the card being selected
      const anim = scaleAnims[eff.id];
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.93, duration: 80, useNativeDriver: true }),
        Animated.spring(anim, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
      ]).start();

      setSelectedEffect(eff);

      // Stop any ongoing preview when switching effects
      if (isPlayingPreview) {
        audioService.pausePlayback();
        setIsPlayingPreview(false);
      }
    },
    [selectedEffect.id, isPlayingPreview, scaleAnims]
  );

  // ── Preview ──────────────────────────────────────────────────────────────

  const handleTogglePreview = async () => {
    const rawUri = getRawUri();

    if (!rawUri || rawUri.startsWith('mock://')) {
      Alert.alert('No Recording', 'Please record your voice first before previewing effects.');
      return;
    }

    if (isPlayingPreview) {
      audioService.pausePlayback();
      setIsPlayingPreview(false);
      return;
    }

    setIsProcessing(true);
    let uri: string = rawUri;
    try {
      uri = await getProcessedUri(selectedEffect);
      const durationSec = Math.max(1, parseInt(params.duration || '5', 10));
      setIsPlayingPreview(true);
      audioService.playAudio(
        uri,
        durationSec,
        () => {},
        () => setIsPlayingPreview(false),
        () => setIsPlayingPreview(false)
      );
    } catch (err) {
      console.error('[Effects] Failed to preview effect:', err);
      const message = err instanceof Error ? err.message : 'The selected effect could not be processed.';
      Alert.alert('Effect Preview Error', message);
      setIsPlayingPreview(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Proceed to preview screen ─────────────────────────────────────────────

  const handleProceed = async () => {
    const rawUri = getRawUri();

    if (!rawUri || rawUri.startsWith('mock://')) {
      Alert.alert('No Recording', 'Please record your voice first.');
      return;
    }

    audioService.pausePlayback();

    let finalAudioUri = rawUri;
    if (selectedEffect.id !== 'original') {
      setIsProcessing(true);
      try {
        const lastFile = audioService.getLastRecordedFile();
        if (lastFile) {
          const processed = await audioService.applyEffect(lastFile, selectedEffect.id);
          finalAudioUri = processed.uri;
          processedUriCache.current[selectedEffect.id] = processed.uri;
        }
      } catch (err) {
        console.error('[Effects] applyEffect before proceed failed:', err);
        Alert.alert(
          'Effect Processing Error',
          err instanceof Error ? err.message : 'The selected effect could not be processed.'
        );
        setIsProcessing(false);
        return;
      } finally {
        setIsProcessing(false);
      }
    }

    router.push({
      pathname: '/singing/preview',
      params: {
        chatId: params.chatId,
        friendId: params.friendId,
        friendName: params.friendName,
        isReply: params.isReply,
        replyToMessageId: params.replyToMessageId,
        prompt: params.prompt,
        audioUri: finalAudioUri,
        duration: params.duration,
        effectId: selectedEffect.id,
      },
    } as any);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScreenHeader
          title="Voice Magic"
          subtitle="Choose a vocal effect for your singing"
          showBack
        />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Active Effect Banner */}
          <View style={styles.activeBanner}>
            <LinearGradient
              colors={['#1677FF', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.activeBannerGradient}
            >
              <View style={styles.bannerLeft}>
                <Text style={styles.bannerLabel}>ACTIVE EFFECT</Text>
                <Text style={styles.bannerEffectName}>
                  {selectedEffect.icon}  {selectedEffect.name}
                </Text>
                <Text style={styles.bannerDesc} numberOfLines={1}>
                  {selectedEffect.description}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.previewBtn}
                onPress={handleTogglePreview}
                activeOpacity={0.8}
                disabled={isProcessing}
              >
                <View style={styles.previewBtnInner}>
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.previewBtnIcon}>{isPlayingPreview ? '⏸' : '▶'}</Text>
                  )}
                  <Text style={styles.previewBtnLabel}>
                    {isProcessing ? 'Processing…' : isPlayingPreview ? 'Pause' : 'Preview'}
                  </Text>
                </View>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          <Text style={styles.sectionTitle}>Choose Effect</Text>

          <View style={styles.effectsGrid}>
            {AUDIO_EFFECTS.map((eff) => {
              const isSelected = selectedEffect.id === eff.id;
              const scaleAnim = scaleAnims[eff.id];

              return (
                <Animated.View
                  key={eff.id}
                  style={[styles.effectItemWrapper, { transform: [{ scale: scaleAnim }] }]}
                >
                  <TouchableOpacity
                    onPress={() => handleSelectEffect(eff)}
                    activeOpacity={0.85}
                    style={[
                      styles.effectCard,
                      isSelected && styles.effectCardSelected,
                    ]}
                  >
                    {/* Selected ring border using gradient */}
                    {isSelected && (
                      <LinearGradient
                        colors={['#1677FF', '#8B5CF6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    <View style={[styles.effectCardInner, isSelected && styles.effectCardInnerSelected]}>
                      <View style={[styles.effectIconCircle, isSelected && styles.effectIconCircleSelected]}>
                        <Text style={styles.effectEmoji}>{eff.icon}</Text>
                      </View>
                      <Text style={[styles.effectName, isSelected && styles.effectNameSelected]}>
                        {eff.name}
                      </Text>
                      <Text style={styles.effectDesc} numberOfLines={2}>
                        {eff.description}
                      </Text>
                      {isSelected && (
                        <View style={styles.selectedCheckBadge}>
                          <Text style={styles.selectedCheckText}>✓</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.nextBtn, isProcessing && styles.nextBtnDisabled]}
            onPress={handleProceed}
            activeOpacity={0.85}
            disabled={isProcessing}
          >
            <LinearGradient
              colors={Colors.gradient.primary as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextGradient}
            >
              {isProcessing ? (
                <View style={styles.processingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.nextText}>  Applying Effect…</Text>
                </View>
              ) : (
                <Text style={styles.nextText}>Review &amp; Send 🎶</Text>
              )}
            </LinearGradient>
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
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
    gap: 16,
  },
  activeBanner: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    shadowColor: '#1677FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 5,
  },
  activeBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 12,
  },
  bannerLeft: {
    flex: 1,
    gap: 3,
  },
  bannerLabel: {
    fontSize: 10,
    fontFamily: FontFamily.semiBold,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  bannerEffectName: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    color: '#FFFFFF',
  },
  bannerDesc: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: 'rgba(255,255,255,0.75)',
  },
  previewBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  previewBtnInner: {
    alignItems: 'center',
    gap: 2,
  },
  previewBtnIcon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  previewBtnLabel: {
    fontSize: 10,
    fontFamily: FontFamily.semiBold,
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.text.primary,
    marginTop: 4,
  },
  effectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  effectItemWrapper: {
    width: '48%',
  },
  effectCard: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surface.white,
    borderWidth: 1.5,
    borderColor: Colors.surface.border,
  },
  effectCardSelected: {
    borderWidth: 0, // gradient replaces the border
    shadowColor: '#1677FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  effectCardInner: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface.white,
    margin: 0,
    borderRadius: Radius.lg,
  },
  effectCardInnerSelected: {
    margin: 2,
    borderRadius: Radius.lg - 2,
    backgroundColor: Colors.background.primary,
  },
  effectIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.surface.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  effectIconCircleSelected: {
    backgroundColor: 'rgba(22, 119, 255, 0.15)',
  },
  effectEmoji: {
    fontSize: 24,
  },
  effectName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  effectNameSelected: {
    color: Colors.brand.blue,
  },
  effectDesc: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
    textAlign: 'center',
    lineHeight: 16,
  },
  selectedCheckBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.brand.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  selectedCheckText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: FontFamily.bold,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.surface.border,
  },
  nextBtn: {
    borderRadius: Radius.full,
    overflow: 'hidden',
    shadowColor: '#1677FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  nextBtnDisabled: {
    opacity: 0.7,
  },
  nextGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.text.primary,
  },
});
