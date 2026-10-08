// Vibely — Singing Flow Modal Stack Layout

import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '../../src/theme/colors';

export default function SingingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background.primary },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="prompt" />
      <Stack.Screen name="permission" />
      <Stack.Screen name="recording" />
      <Stack.Screen name="effects" />
      <Stack.Screen name="preview" />
      <Stack.Screen name="sending" />
    </Stack>
  );
}
