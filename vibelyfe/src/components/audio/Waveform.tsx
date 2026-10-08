// Vibely — Component: Waveform

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ViewStyle, Animated } from 'react-native';
import { Colors } from '../../theme/colors';

type WaveformVariant = 'inactive' | 'playing' | 'recording' | 'completed';

interface WaveformProps {
  data: number[];
  variant?: WaveformVariant;
  height?: number;
  barWidth?: number;
  barGap?: number;
  progress?: number; // 0–1, which portion is "played"
  style?: ViewStyle;
  animated?: boolean;
}

function getBarColor(variant: WaveformVariant, isPlayed: boolean): string {
  if (variant === 'recording') return Colors.waveform.recording;
  if (variant === 'completed') return Colors.waveform.completed;
  if (variant === 'playing') return isPlayed ? Colors.waveform.playing : Colors.waveform.active;
  return Colors.waveform.inactive;
}

export function Waveform({
  data,
  variant = 'inactive',
  height = 40,
  barWidth = 3,
  barGap = 2,
  progress = 0,
  style,
  animated = false,
}: WaveformProps) {
  const animValues = useRef<Animated.Value[]>(
    data.map(() => new Animated.Value(1))
  ).current;

  useEffect(() => {
    if (animated && variant === 'recording') {
      const animations = animValues.map((val, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(i * 30),
            Animated.timing(val, {
              toValue: 0.4 + Math.random() * 0.6,
              duration: 200 + i * 20,
              useNativeDriver: false,
            }),
            Animated.timing(val, {
              toValue: 0.2,
              duration: 200,
              useNativeDriver: false,
            }),
          ])
        )
      );
      Animated.parallel(animations).start();
      return () => animations.forEach((a) => a.stop());
    }
  }, [animated, variant]);

  const playedCount = Math.round(progress * data.length);

  return (
    <View style={[styles.container, { height }, style]}>
      {data.map((value, i) => {
        const isPlayed = i < playedCount;
        const barHeight = Math.max(4, value * height);
        const color = getBarColor(variant, isPlayed);

        if (animated && variant === 'recording') {
          return (
            <Animated.View
              key={i}
              style={[
                styles.bar,
                {
                  width: barWidth,
                  marginHorizontal: barGap / 2,
                  height: animValues[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [4, height],
                  }),
                  backgroundColor: color,
                  borderRadius: barWidth / 2,
                },
              ]}
            />
          );
        }

        return (
          <View
            key={i}
            style={[
              styles.bar,
              {
                width: barWidth,
                height: barHeight,
                marginHorizontal: barGap / 2,
                backgroundColor: color,
                borderRadius: barWidth / 2,
                opacity: variant === 'inactive' ? 0.5 : 1,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bar: {
    minHeight: 4,
  },
});
