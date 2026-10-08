// Vibely — Component: Feedback states (Loading, Empty, Error, Offline)

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  Animated,
  Easing,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { FontFamily, FontSize } from '../../theme/typography';
import { Radius } from '../../theme/radius';

// ─── LoadingSkeleton ────────────────────────────────────────────────────────

interface LoadingSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function LoadingSkeleton({ width = '100%', height = 16, borderRadius = Radius.sm, style }: LoadingSkeletonProps) {
  const shimmer = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      })
    ).start();
  }, []);

  const backgroundColor = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [
      Colors.surface.dark,
      'rgba(139, 92, 246, 0.15)',
      Colors.surface.dark,
    ],
  });

  return (
    <Animated.View
      style={[{ width: width as any, height, borderRadius, backgroundColor }, style]}
    />
  );
}

// ─── ChatSkeleton ─────────────────────────────────────────────────────────

export function ChatSkeleton() {
  return (
    <View style={skeletonStyles.chatRow}>
      <LoadingSkeleton width={48} height={48} borderRadius={24} />
      <View style={skeletonStyles.chatContent}>
        <LoadingSkeleton width="60%" height={14} />
        <LoadingSkeleton width="80%" height={12} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  chatContent: {
    flex: 1,
    gap: 4,
  },
});

// ─── EmptyState ─────────────────────────────────────────────────────────────

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: string;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function EmptyState({ title, description, icon = '🎵', action, actionLabel, onAction, style }: EmptyStateProps) {
  return (
    <View style={[emptyStyles.container, style]}>
      {/* Abstract waveform illustration */}
      <View style={emptyStyles.waveIllustration}>
        {[0.3, 0.7, 1, 0.6, 0.9, 0.4, 0.8, 0.5, 0.7, 0.3].map((h, i) => (
          <View
            key={i}
            style={[
              emptyStyles.waveBar,
              {
                height: h * 48,
                opacity: 0.2 + h * 0.3,
                backgroundColor: i % 2 === 0 ? Colors.brand.violet : Colors.brand.purple,
              },
            ]}
          />
        ))}
      </View>
      <Text style={emptyStyles.icon}>{icon}</Text>
      <Text style={emptyStyles.title}>{title}</Text>
      {description && <Text style={emptyStyles.description}>{description}</Text>}
      {action && <View style={emptyStyles.actionContainer}>{action}</View>}
      {!action && actionLabel && onAction && (
        <TouchableOpacity style={emptyStyles.actionBtn} onPress={onAction}>
          <Text style={emptyStyles.actionBtnText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  waveIllustration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  description: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.text.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  actionContainer: {
    marginTop: 8,
    width: '100%',
  },
  actionBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.brand.violet,
  },
  actionBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
  },
});

// ─── ErrorState ─────────────────────────────────────────────────────────────

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'We hit an unexpected error. Please try again.',
  onRetry,
  style,
}: ErrorStateProps) {
  return (
    <View style={[errorStyles.container, style]}>
      <Text style={errorStyles.icon}>⚠️</Text>
      <Text style={errorStyles.title}>{title}</Text>
      <Text style={errorStyles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          style={errorStyles.retryButton}
          accessibilityLabel="Retry"
        >
          <Text style={errorStyles.retryText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const errorStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  message: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.text.muted,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.surface.glass,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  retryText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.brand.violet,
  },
});

// ─── OfflineBanner ──────────────────────────────────────────────────────────

interface OfflineBannerProps {
  visible: boolean;
}

export function OfflineBanner({ visible }: OfflineBannerProps) {
  if (!visible) return null;
  return (
    <View style={offlineStyles.banner}>
      <Text style={offlineStyles.dot}>●</Text>
      <Text style={offlineStyles.text}>
        You're offline. We'll try again when you're connected.
      </Text>
    </View>
  );
}

const offlineStyles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.status.warningBg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.status.warning + '40',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    color: Colors.status.warning,
    fontSize: 10,
  },
  text: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.status.warning,
    flex: 1,
  },
});

// ─── NotificationBadge ──────────────────────────────────────────────────────

interface NotificationBadgeProps {
  count: number;
  style?: ViewStyle;
}

export function NotificationBadge({ count, style }: NotificationBadgeProps) {
  if (count === 0) return null;
  return (
    <View style={[badgeStyles.badge, style]}>
      <Text style={badgeStyles.text}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.accent.orange,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  text: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.text.primary,
  },
});
