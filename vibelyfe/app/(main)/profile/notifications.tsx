// Vibely — Notifications Screen (Singing alerts, replies & activity)

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../../src/theme/colors';
import { FontFamily, FontSize } from '../../../src/theme/typography';
import { Radius } from '../../../src/theme/radius';
import { ScreenHeader } from '../../../src/components/layout/ScreenHeader';
import { GlassCard } from '../../../src/components/cards/GlassCard';
import { EmptyState, LoadingSkeleton } from '../../../src/components/feedback/Feedback';
import { notificationService } from '../../../src/services/notificationService';
import { formatTimestamp } from '../../../src/utils/time';
import { Notification } from '../../../src/types';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleNotificationPress = async (item: Notification) => {
    await notificationService.markAsRead(item.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    );

    if (item.data?.chatId) {
      router.push(`/(main)/chats/${item.data.chatId}` as any);
    } else if (item.type === 'friend_request') {
      router.push('/(main)/friends' as any);
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'new_singing_message':
        return '🎵';
      case 'friend_sang_back':
        return '🎶';
      case 'friend_request':
        return '💌';
      case 'friend_request_accepted':
        return '🤝';
      default:
        return '✨';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScreenHeader
          title="Activity"
          subtitle="Singing notes & friend alerts"
          showBack
          rightAction={
            notifications.length > 0 ? (
              <TouchableOpacity onPress={handleMarkAllRead}>
                <Text style={styles.markReadText}>Mark read</Text>
              </TouchableOpacity>
            ) : null
          }
        />

        {loading ? (
          <View style={styles.loadingContainer}>
            <LoadingSkeleton width="100%" height={74} borderRadius={16} />
            <View style={{ height: 12 }} />
            <LoadingSkeleton width="100%" height={74} borderRadius={16} />
          </View>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon="🔔"
            title="All caught up!"
            description="You don't have any notifications right now."
          />
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.brand.violet}
              />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.8}
              >
                <GlassCard
                  style={[
                    styles.notifCard,
                    !item.isRead && styles.unreadNotifCard,
                  ]}
                >
                  <View style={styles.iconCircle}>
                    <Text style={{ fontSize: 20 }}>{getNotificationIcon(item.type)}</Text>
                  </View>

                  <View style={styles.content}>
                    <View style={styles.topRow}>
                      <Text style={[styles.title, !item.isRead && styles.unreadTitle]}>
                        {item.title}
                      </Text>
                      {!item.isRead && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.body}>{item.body}</Text>
                    <Text style={styles.timestamp}>
                      {formatTimestamp(item.timestamp)}
                    </Text>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            )}
          />
        )}
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
  markReadText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.brand.violet,
  },
  loadingContainer: {
    padding: 16,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: Radius.lg,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  unreadNotifCard: {
    borderColor: Colors.brand.violet + '60',
    backgroundColor: Colors.brand.purple + '20',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.text.primary,
    flex: 1,
  },
  unreadTitle: {
    color: Colors.accent.orange,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent.orange,
    marginLeft: 8,
  },
  body: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  timestamp: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
    marginTop: 2,
  },
});
