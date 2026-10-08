// Vibely — Component: AudioPlayer

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Waveform } from './Waveform';
import { Colors } from '../../theme/colors';
import { FontFamily, FontSize } from '../../theme/typography';
import { formatDuration } from '../../utils/time';
import { audioService } from '../../services/audioService';
import { SingingMessage } from '../../types';

interface AudioPlayerProps {
  message: SingingMessage;
  compact?: boolean;
}

export function AudioPlayer({ message, compact = false }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      stopRef.current?.();
    };
  }, []);

  const handlePlayPause = () => {
    if (isPlaying) {
      stopRef.current?.();
      stopRef.current = null;
      audioService.pausePlayback();
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    } else {
      try {
        setIsPlaying(true);
        stopRef.current = audioService.playAudio(
          message.audioUrl,
          message.duration,
          (p, t) => {
            setProgress(p);
            setCurrentTime(t);
          },
          () => {
            stopRef.current = null;
            setIsPlaying(false);
            setProgress(0);
            setCurrentTime(0);
          },
          (error) => {
            stopRef.current = null;
            setIsPlaying(false);
            Alert.alert('Playback Error', error.message);
          }
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to play this recording.';
        setIsPlaying(false);
        Alert.alert('Playback Error', message);
      }
    }
  };

  const variant = isPlaying ? 'playing' : progress > 0 ? 'completed' : 'inactive';
  const displayTime = isPlaying
    ? formatDuration(currentTime)
    : formatDuration(message.duration);

  return (
    <View style={[styles.container, compact && styles.compact]}>
      <TouchableOpacity
        onPress={handlePlayPause}
        style={styles.playButton}
        accessibilityLabel={isPlaying ? 'Pause' : 'Play singing message'}
      >
        <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
      </TouchableOpacity>

      <View style={styles.waveformArea}>
        <Waveform
          data={message.waveformData}
          variant={variant}
          progress={progress}
          height={compact ? 28 : 36}
          barWidth={2}
          barGap={1.5}
          animated={isPlaying}
          style={styles.waveform}
        />
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{displayTime}</Text>
          {message.effect.id !== 'original' && (
            <Text style={styles.effectBadge}>{message.effect.icon} {message.effect.name}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compact: {
    gap: 8,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.brand.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    fontSize: 16,
    color: Colors.text.primary,
    marginLeft: 2,
  },
  waveformArea: {
    flex: 1,
    gap: 4,
  },
  waveform: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  effectBadge: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.brand.violet,
  },
});
