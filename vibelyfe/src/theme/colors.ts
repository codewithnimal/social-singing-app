// Vibely Design System — Color Tokens
// Soft Blue × Pink × Purple — Light/Airy Social Singing App

export const Colors = {
  // ─── Backgrounds ───────────────────────────────────────────────────────────
  background: {
    primary: '#F8FBFF',
    secondary: '#F4F8FF',
    card: '#FFFFFF',
  },

  // ─── Surfaces ──────────────────────────────────────────────────────────────
  surface: {
    white: '#FFFFFF',
    light: 'rgba(255,255,255,0.85)',
    glass: 'rgba(255,255,255,0.70)',
    glassLight: 'rgba(255,255,255,0.85)',
    border: 'rgba(22, 119, 255, 0.10)',
    borderActive: 'rgba(22, 119, 255, 0.35)',
    overlay: 'rgba(16, 42, 86, 0.08)',
    // keep dark alias for legacy components (won't be visible on light bg)
    dark: '#EEF4FF',
  },

  // ─── Brand — Primary Blue ───────────────────────────────────────────────────
  brand: {
    blue: '#1677FF',
    blueLight: '#3B82F6',
    blueMid: '#0A84FF',
    // Keep violet alias for legacy components
    violet: '#1677FF',
    purple: '#8B5CF6',
    purpleLight: '#A855F7',
  },

  // ─── Accent — Pink/Purple ──────────────────────────────────────────────────
  accent: {
    pink: '#E83E8C',
    pinkLight: '#F062A5',
    purple: '#8B5CF6',
    purpleLight: '#A855F7',
    // Keep orange alias for legacy components (map to pink)
    orange: '#E83E8C',
    softOrange: '#F062A5',
    orangeGlow: 'rgba(232,62,140,0.2)',
    orangeGlowStrong: 'rgba(232,62,140,0.38)',
  },

  // ─── Text ──────────────────────────────────────────────────────────────────
  text: {
    primary: '#102A56',
    secondary: '#64748B',
    muted: '#94A3B8',
    inverse: '#FFFFFF',
    // keep legacy
    placeholder: '#94A3B8',
  },

  // ─── Status ────────────────────────────────────────────────────────────────
  status: {
    success: '#22C55E',
    successBg: 'rgba(34,197,94,0.10)',
    error: '#EF4444',
    errorBg: 'rgba(239,68,68,0.10)',
    warning: '#F59E0B',
    warningBg: 'rgba(245,158,11,0.10)',
    online: '#22C55E',
    offline: '#94A3B8',
  },

  // ─── Waveform ──────────────────────────────────────────────────────────────
  waveform: {
    inactive: 'rgba(22,119,255,0.20)',
    active: '#1677FF',
    playing: '#E83E8C',
    recording: '#E83E8C',
    completed: '#1677FF',
  },

  // ─── Gradients (arrays for LinearGradient) ─────────────────────────────────
  gradient: {
    primary: ['#1677FF', '#8B5CF6'] as string[],
    secondary: ['#E83E8C', '#8B5CF6'] as string[],
    background: ['#F8FBFF', '#F4F8FF'] as string[],
    card: ['rgba(255,255,255,0.95)', 'rgba(244,248,255,0.90)'] as string[],
    recording: ['#E83E8C', '#8B5CF6'] as string[],
    purpleOnly: ['#8B5CF6', '#A855F7'] as string[],
    surface: ['rgba(255,255,255,0.9)', 'rgba(244,248,255,0.8)'] as string[],
    // Keep legacy alias
    waveBlue: ['#1677FF', '#3B82F6', '#8B5CF6'] as string[],
  },

  // ─── Overlay ───────────────────────────────────────────────────────────────
  overlay: {
    dark: 'rgba(16,42,86,0.55)',
    medium: 'rgba(16,42,86,0.30)',
    light: 'rgba(16,42,86,0.10)',
  },
} as const;

export type ColorToken = typeof Colors;
