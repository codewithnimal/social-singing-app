// Vibely — Live Singing Recording Screen

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../src/theme/colors';
import { FontFamily, FontSize } from '../../src/theme/typography';
import { Radius } from '../../src/theme/radius';
import { audioService } from '../../src/services/audioService';
import { formatDuration } from '../../src/utils/time';

export default function RecordingScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    chatId: string;
    friendId: string;
    friendName: string;
    isReply?: string;
    replyToMessageId?: string;
    prompt?: string;
  }>();

  const [isRecording, setIsRecording] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [duration, setDuration] = useState(0);
  const [waveformBars, setWaveformBars] = useState<number[]>([
    0.2, 0.4, 0.3, 0.6, 0.5, 0.8, 0.4, 0.3, 0.5, 0.7, 0.4, 0.3,
  ]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    return () => {
      void audioService.cancelRecording().catch((error: unknown) => {
        console.warn('Failed to cancel recording:', error);
      });
      pulseLoop.current?.stop();
    };
  }, []);

  const startPulsing = () => {
    pulseAnim.setValue(1);
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.current.start();
  };

  const stopPulsing = () => {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
  };

  const handleToggleRecording = async () => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    if (!isRecording) {
      try {
        setDuration(0);
        await audioService.startRecording((curDuration, bar) => {
          setDuration(curDuration);
          setWaveformBars((prev) => [...prev.slice(1), bar]);
        });
        setIsRecording(true);
        startPulsing();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to start recording.';
        Alert.alert('Recording Error', message);
      } finally {
        setIsTransitioning(false);
      }
    } else {
      setIsRecording(false);
      stopPulsing();
      try {
        const audioFile = await audioService.stopRecording();
        router.push({
          pathname: '/singing/effects',
          params: {
            chatId: params.chatId,
            friendId: params.friendId,
            friendName: params.friendName,
            isReply: params.isReply,
            replyToMessageId: params.replyToMessageId,
            prompt: params.prompt,
            audioUri: audioFile.uri,
            duration: audioFile.duration.toString(),
          },
        } as any);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to finish recording.';
        Alert.alert('Recording Error', message);
      } finally {
        setIsTransitioning(false);
      }
    }
  };

  const handleCancel = async () => {
    stopPulsing();
    try {
      await audioService.cancelRecording();
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to cancel recording.';
      Alert.alert('Recording Error', message);
    }
  };

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.recipientTitle}>
              {params.isReply ? 'Replying to' : 'Singing to'}
            </Text>
            <Text style={styles.recipientName}>{params.friendName || 'Friend'}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Selected Prompt */}
        {params.prompt ? (
          <View style={styles.promptBanner}>
            <Text style={styles.promptLabel}>Prompt:</Text>
            <Text style={styles.promptContent}>"{params.prompt}"</Text>
          </View>
        ) : null}

        {/* Center Waveform & Visualizer */}
        <View style={styles.visualizerContainer}>
          <View style={styles.waveformRow}>
            {waveformBars.map((heightFactor, index) => {
              const barHeight = isRecording ? Math.max(12, heightFactor * 100) : 16;
              return (
                <View
                  key={index}
                  style={[
                    styles.waveformBar,
                    {
                      height: barHeight,
                      backgroundColor: isRecording
                        ? index % 2 === 0
                          ? Colors.brand.violet
                          : Colors.accent.orange
                        : Colors.surface.border,
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Duration counter */}
          <Text style={styles.timerText}>{formatDuration(duration)}</Text>
          <Text style={styles.statusHint}>
            {isRecording ? 'Listening to your melody...' : 'Tap the microphone to start singing'}
          </Text>
        </View>

        {/* Recording Controls */}
        <View style={styles.controlsArea}>
          {/* Main Record Button with pulse */}
          <View style={styles.recordButtonWrapper}>
            {isRecording && (
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    transform: [{ scale: pulseAnim }],
                    opacity: pulseAnim.interpolate({
                      inputRange: [1, 1.25],
                      outputRange: [0.6, 0],
                    }),
                  },
                ]}
              />
            )}
            <TouchableOpacity
              onPress={handleToggleRecording}
              style={styles.recordButton}
              activeOpacity={0.85}
              disabled={isTransitioning}
              accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
            >
              <LinearGradient
                colors={
                  isRecording
                    ? (['#DC2626', '#EF4444'] as [string, string])
                    : (Colors.gradient.primary as [string, string])
                }
                style={styles.recordGradient}
              >
                <Text style={styles.recordIcon}>{isRecording ? '⏹' : '🎤'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <Text style={styles.instructionText}>
            {isRecording ? 'Tap square when finished' : 'Tap to start recording'}
          </Text>
        </View>
      </View>
    </View>
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
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 64,
  },
  cancelBtn: {
    width: 64,
    padding: 8,
    alignItems: 'flex-start',
  },
  cancelText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerSpacer: {
    width: 64,
  },
  recipientTitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  recipientName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.text.primary,
  },
  promptBanner: {
    marginHorizontal: 24,
    backgroundColor: Colors.surface.glass,
    borderRadius: Radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.brand.purple + '40',
    alignItems: 'center',
    gap: 4,
  },
  promptLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    color: Colors.accent.orange,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  promptContent: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.text.primary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  visualizerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 24,
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    gap: 8,
  },
  waveformBar: {
    width: 6,
    borderRadius: 3,
  },
  timerText: {
    fontFamily: FontFamily.bold,
    fontSize: 48,
    color: Colors.text.primary,
    letterSpacing: 2,
  },
  statusHint: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  controlsArea: {
    alignItems: 'center',
    gap: 16,
    paddingBottom: 20,
  },
  recordButtonWrapper: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.accent.orange,
  },
  recordButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    overflow: 'hidden',
    shadowColor: Colors.brand.purple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  recordGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordIcon: {
    fontSize: 32,
    color: Colors.text.primary,
  },
  instructionText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
});
