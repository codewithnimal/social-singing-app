// Vibely Design System — Spacing (8px system)

export const Spacing = {
  '0': 0,
  '1': 4,
  '2': 8,
  '3': 12,
  '4': 16,
  '5': 20,
  '6': 24,
  '8': 32,
  '10': 40,
  '12': 48,
  '16': 64,
} as const;

// Named semantic spacing
export const Layout = {
  screenPadding: 16,
  cardPadding: 16,
  cardPaddingLg: 20,
  sectionGap: 24,
  itemGap: 12,
  touchTarget: 44,
  touchTargetLg: 48,
  tabBarHeight: 72,
  headerHeight: 56,
  avatarSm: 36,
  avatarMd: 44,
  avatarLg: 56,
  avatarXl: 80,
} as const;

export type SpacingToken = keyof typeof Spacing;
