// Vibely — Audio Effects Constants
// Matches real backend PRESETS: baby, cattish, deep, echo + original

import { AudioEffect } from '../types';

export const AUDIO_EFFECTS: AudioEffect[] = [
  {
    id: 'original',
    name: 'Original',
    description: 'Your natural voice',
    icon: '🎤',
  },
  {
    id: 'echo',
    name: 'Echo',
    description: 'Ambient reverb & delay',
    icon: '🔁',
  },
  {
    id: 'baby',
    name: 'Baby Voice',
    description: 'High pitched & cute',
    icon: '👶',
  },
  {
    id: 'cattish',
    name: 'Cattish',
    description: 'Playful melodic timbre',
    icon: '🐱',
  },
  {
    id: 'deep',
    name: 'Deep Studio',
    description: 'Low bass & punchy tone',
    icon: '🎚️',
  },
];
