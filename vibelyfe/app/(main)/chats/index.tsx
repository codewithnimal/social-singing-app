// Vibely — Chats (Messages) List Screen
// Real backend: GET /api/v1/friends/list to get conversations with friends

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../../src/theme/colors';
import { FontFamily, FontSize } from '../../../src/theme/typography';
import { friendsApi } from '../../../src/api/friendsApi';
import { BackendUser } from '../../../src/api/types';

function Avatar({ name, size = 52 }: { name: string; size?: number }) {
  const initial = name?.charAt(0)?.toUpperCase() ?? '?';
  const colors: Array<[string, string]> = [
    ['#1677FF', '#8B5CF6'],
    ['#E83E8C', '#8B5CF6'],
    ['#1677FF', '#3B82F6'],
    ['#22C55E', '#1677FF'],
  ];
  const pair = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return (
    <LinearGradient
      colors={pair}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontFamily: FontFamily.bold, fontSize: size * 0.38 }}>
        {initial}
      </Text>
    </LinearGradient>
  );
}

export default function ChatsScreen() {
  const insets = useSafeAreaInsets();
  const [friends, setFriends] = useState<BackendUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await friendsApi.list();
      setFriends(res.friends || []);
    } catch (error) {
      console.warn('Error loading friend chats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredFriends = friends.filter((f) =>
    f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.email && f.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenChat = (friend: BackendUser) => {
    router.push({
      pathname: `/(main)/chats/${friend.id}`,
      params: {
        friendName: friend.username,
        friendEmail: friend.email,
      },
    } as any);
  };

  const handleQuickSing = (friend: BackendUser) => {
    router.push({
      pathname: '/singing/prompt',
      params: {
        chatId: String(friend.id),
        friendId: String(friend.id),
        friendName: friend.username,
      },
    } as any);
  };

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#F8FBFF', '#F0F6FF']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Messages</Text>
          <Text style={styles.headerSubtitle}>
            {friends.length} active friend{friends.length === 1 ? '' : 's'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.newChatBtn}
          onPress={() => router.push('/(main)/friends/add' as any)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#1677FF', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.newChatBtnGradient}
          >
            <Text style={styles.newChatBtnText}>+ Add Friend</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search conversations..."
            placeholderTextColor={Colors.text.muted}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand.blue} />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      ) : filteredFriends.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No chats match your search' : 'No friends yet'}
          </Text>
          <Text style={styles.emptyDescription}>
            {searchQuery
              ? `No friend found matching "${searchQuery}"`
              : 'Add friends to start exchanging singing vibes and voice notes!'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => router.push('/(main)/friends/add' as any)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#E83E8C', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.emptyActionGradient}
              >
                <Text style={styles.emptyActionText}>Find Friends</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredFriends}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 90 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.brand.blue}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleOpenChat(item)}
              activeOpacity={0.7}
              style={styles.chatCard}
            >
              <Avatar name={item.username} size={50} />

              <View style={styles.chatInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.chatName}>{item.username}</Text>
                  <View style={styles.onlineDot} />
                </View>
                <Text style={styles.chatPreview} numberOfLines={1}>
                  🎵 Tap to open chat or sing back
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => handleQuickSing(item)}
                style={styles.quickSingBtn}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#E83E8C', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.quickSingGradient}
                >
                  <Text style={styles.quickSingText}>🎤 Sing</Text>
                </LinearGradient>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 76,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: FontFamily.bold,
    color: Colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  newChatBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  newChatBtnGradient: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newChatBtnText: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    color: '#FFFFFF',
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(22, 119, 255, 0.12)',
    shadowColor: '#1677FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: FontFamily.regular,
    color: Colors.text.primary,
  },
  clearSearch: {
    fontSize: 14,
    color: Colors.text.muted,
    paddingHorizontal: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: FontFamily.medium,
    color: Colors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  emptyEmoji: {
    fontSize: 54,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    color: Colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyActionBtn: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  emptyActionGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyActionText: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(22, 119, 255, 0.08)',
    shadowColor: '#1677FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chatInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: Colors.text.primary,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.status.online,
    marginLeft: 6,
  },
  chatPreview: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.text.secondary,
  },
  quickSingBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  quickSingGradient: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  quickSingText: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    color: '#FFFFFF',
  },
});
