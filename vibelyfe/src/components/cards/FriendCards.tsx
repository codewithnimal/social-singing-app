// Vibely — Component: FriendCard

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar } from '../profile/Avatar';
import { OnlineIndicator } from '../profile/OnlineIndicator';
import { Colors } from '../../theme/colors';
import { FontFamily, FontSize } from '../../theme/typography';
import { Radius } from '../../theme/radius';
import { formatLastSeen } from '../../utils/time';
import { Friend } from '../../types';
import { LinearGradient } from 'expo-linear-gradient';

interface FriendCardProps {
  friend: Friend;
  onPress?: () => void;
  onChat?: () => void;
  onSing?: () => void;
  onSingPress?: () => void;
}

export function FriendCard({ friend, onPress, onChat, onSing, onSingPress }: FriendCardProps) {
  const handleChat = onPress ?? onChat;
  const handleSing = onSingPress ?? onSing;
  return (
    <View style={styles.card}>
      <View style={styles.avatarWrapper}>
        <Avatar name={friend.displayName} size={52} />
        <OnlineIndicator isOnline={friend.isOnline} size={12} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{friend.displayName}</Text>
        <Text style={styles.status}>
          {friend.isOnline ? 'Online now' : formatLastSeen(friend.lastSeen)}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={handleChat}
          accessibilityLabel={`Chat with ${friend.displayName}`}
        >
          <Text style={styles.actionIcon}>💬</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.singButton}
          onPress={handleSing}
          accessibilityLabel={`Sing to ${friend.displayName}`}
        >
          <LinearGradient
            colors={Colors.gradient.primary as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.singGradient}
          >
            <Text style={styles.singIcon}>🎤</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── FriendRequestCard ──────────────────────────────────────────────────────

import { FriendRequest } from '../../types';

interface FriendRequestCardProps {
  request: FriendRequest;
  onAccept: () => void;
  onDecline: () => void;
}

export function FriendRequestCard({ request, onAccept, onDecline }: FriendRequestCardProps) {
  return (
    <View style={requestStyles.card}>
      <View style={styles.avatarWrapper}>
        <Avatar name={request.from.displayName} size={48} />
      </View>
      <View style={requestStyles.info}>
        <Text style={styles.name}>{request.from.displayName}</Text>
        <Text style={styles.status}>@{request.from.username}</Text>
      </View>
      <View style={requestStyles.actions}>
        <TouchableOpacity
          style={requestStyles.decline}
          onPress={onDecline}
          accessibilityLabel="Decline friend request"
        >
          <Text style={requestStyles.declineText}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={requestStyles.accept}
          onPress={onAccept}
          accessibilityLabel="Accept friend request"
        >
          <Text style={requestStyles.acceptText}>✓</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.glass,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    padding: 16,
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.text.primary,
  },
  status: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  chatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface.dark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  actionIcon: {
    fontSize: 16,
  },
  singButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  singGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  singIcon: {
    fontSize: 16,
  },
});

const requestStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.glassLight,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surface.borderActive,
    padding: 16,
    gap: 12,
  },
  info: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  decline: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.status.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.status.error + '40',
  },
  declineText: {
    color: Colors.status.error,
    fontSize: 14,
    fontFamily: FontFamily.bold,
  },
  accept: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.status.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.status.success + '40',
  },
  acceptText: {
    color: Colors.status.success,
    fontSize: 16,
    fontFamily: FontFamily.bold,
  },
});
