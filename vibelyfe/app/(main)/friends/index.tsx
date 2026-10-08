// Vibely — Friends Screen
// Real backend: GET /api/v1/friends/list, POST accept/reject/request

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  TextInput,
  Animated,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../../src/theme/colors';
import { FontFamily, FontSize } from '../../../src/theme/typography';
import { friendsApi } from '../../../src/api/friendsApi';
import { BackendUser } from '../../../src/api/types';
import { useAuth } from '../../../src/context/AuthContext';
import { ApiError } from '../../../src/api/apiClient';

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const initial = name?.charAt(0)?.toUpperCase() ?? '?';
  const colors: Array<[string, string]> = [
    ['#1677FF', '#8B5CF6'],
    ['#E83E8C', '#8B5CF6'],
    ['#1677FF', '#3B82F6'],
    ['#22C55E', '#1677FF'],
  ];
  const pair = colors[name.charCodeAt(0) % colors.length];
  return (
    <LinearGradient
      colors={pair}
      style={{
        width: size, height: size, borderRadius: size / 2,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontFamily: FontFamily.bold, fontSize: size * 0.38 }}>
        {initial}
      </Text>
    </LinearGradient>
  );
}

// ─── Friend Row ────────────────────────────────────────────────────────────────
function FriendRow({
  user,
  onChat,
  onSing,
  onRemove,
}: {
  user: BackendUser;
  onChat: () => void;
  onSing: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={rowStyles.wrap}>
      <Avatar name={user.username} size={50} />
      <View style={rowStyles.info}>
        <Text style={rowStyles.name}>{user.username}</Text>
        <Text style={rowStyles.email} numberOfLines={1}>{user.email}</Text>
      </View>
      <View style={rowStyles.actions}>
        <TouchableOpacity
          style={rowStyles.singBtn}
          onPress={onSing}
          accessibilityLabel={`Sing to ${user.username}`}
        >
          <LinearGradient
            colors={[Colors.brand.blue, Colors.brand.purple] as [string, string]}
            style={rowStyles.singBtnGradient}
          >
            <Text style={rowStyles.singBtnText}>Sing</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={rowStyles.chatBtn}
          onPress={onChat}
          accessibilityLabel={`Chat with ${user.username}`}
        >
          <Text style={rowStyles.chatBtnText}>Chat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface.white,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: Colors.brand.blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  info: { flex: 1, gap: 2 },
  name: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.text.primary,
  },
  email: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  actions: { flexDirection: 'row', gap: 8 },
  singBtn: { borderRadius: 20, overflow: 'hidden' },
  singBtnGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  singBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: '#fff',
  },
  chatBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1.5,
    borderColor: Colors.brand.blue + '30',
  },
  chatBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.brand.blue,
  },
});

// ─── Request Row ────────────────────────────────────────────────────────────────
function RequestRow({
  user,
  onAccept,
  onReject,
}: {
  user: BackendUser;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <View style={reqStyles.wrap}>
      <Avatar name={user.username} size={46} />
      <View style={reqStyles.info}>
        <Text style={reqStyles.name}>{user.username}</Text>
        <Text style={reqStyles.email}>{user.email}</Text>
      </View>
      <View style={reqStyles.actions}>
        <TouchableOpacity style={reqStyles.acceptBtn} onPress={onAccept} accessibilityLabel="Accept friend request">
          <Text style={reqStyles.acceptText}>✓</Text>
        </TouchableOpacity>
        <TouchableOpacity style={reqStyles.rejectBtn} onPress={onReject} accessibilityLabel="Reject friend request">
          <Text style={reqStyles.rejectText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const reqStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: Colors.surface.white,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: Colors.brand.blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.brand.blue + '20',
  },
  info: { flex: 1, gap: 2 },
  name: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.text.primary },
  email: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.text.muted },
  actions: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.status.successBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.status.success + '40',
  },
  acceptText: { fontSize: 16, color: Colors.status.success },
  rejectBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.status.errorBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.status.error + '40',
  },
  rejectText: { fontSize: 14, color: Colors.status.error },
});

// ─── Friends Screen ────────────────────────────────────────────────────────────
export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [friends, setFriends] = useState<BackendUser[]>([]);
  const [pendingReceived, setPendingReceived] = useState<BackendUser[]>([]);
  const [pendingSent, setPendingSent] = useState<BackendUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await friendsApi.list();
      setFriends(data.friends);
      setPendingReceived(data.pending_requests_received);
      setPendingSent(data.pending_requests_sent);
      setError('');
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Session expired. Please log in again.');
      } else {
        setError('Failed to load friends. Pull down to retry.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const handleAccept = async (friendId: number) => {
    try {
      await friendsApi.accept(friendId);
      await load();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not accept request.');
    }
  };

  const handleReject = async (friendId: number) => {
    Alert.alert('Reject Request', 'Decline this friend request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          try {
            await friendsApi.reject(friendId);
            await load();
          } catch {}
        },
      },
    ]);
  };

  const handleRemove = (friendId: number, name: string) => {
    Alert.alert('Remove Friend', `Remove ${name} from your friends?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await friendsApi.remove(friendId);
            await load();
          } catch {}
        },
      },
    ]);
  };

  const filteredFriends = friends.filter(
    (f) =>
      f.username.toLowerCase().includes(search.toLowerCase()) ||
      f.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#F8FBFF', '#F0F6FF']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.blobTop} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Friends</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/(main)/friends/add')}
            accessibilityLabel="Add friend"
          >
            <LinearGradient
              colors={[Colors.brand.blue, Colors.brand.purple] as [string, string]}
              style={styles.addBtnGradient}
            >
              <Text style={styles.addBtnText}>+ Add</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search friends..."
            placeholderTextColor={Colors.text.muted}
            accessibilityLabel="Search friends"
          />
        </View>

        {loading && (
          <ActivityIndicator color={Colors.brand.blue} style={{ marginTop: 40 }} />
        )}

        {!!error && !loading && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => load()}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Friend Requests */}
        {pendingReceived.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Friend Requests</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingReceived.length}</Text>
              </View>
            </View>
            {pendingReceived.map((u) => (
              <RequestRow
                key={u.id}
                user={u}
                onAccept={() => handleAccept(u.id)}
                onReject={() => handleReject(u.id)}
              />
            ))}
          </View>
        )}

        {/* Active Now (horizontal avatars) */}
        {friends.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Now</Text>
              <TouchableOpacity>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
              {friends.slice(0, 6).map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={styles.activeAvatar}
                  onPress={() => router.push(`/(main)/chats/${f.id}` as any)}
                >
                  <Avatar name={f.username} size={56} />
                  <View style={styles.onlineDot} />
                  <Text style={styles.activeName} numberOfLines={1}>{f.username}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* All Friends */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Friends</Text>
          {!loading && filteredFriends.length === 0 && !error && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🎵</Text>
              <Text style={styles.emptyTitle}>
                {search ? 'No friends found.' : 'Your friend list is empty.'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {search ? 'Try a different name.' : 'Find friends using the + Add button above.'}
              </Text>
            </View>
          )}
          {filteredFriends.map((f) => (
            <FriendRow
              key={f.id}
              user={f}
              onChat={() => router.push(`/(main)/chats/${f.id}` as any)}
              onSing={() =>
                router.push({
                  pathname: '/singing/permission',
                  params: { friendId: String(f.id), friendName: f.username },
                } as any)
              }
              onRemove={() => handleRemove(f.id, f.username)}
            />
          ))}
        </View>

        {/* Pending Sent */}
        {pendingSent.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Sent</Text>
            {pendingSent.map((u) => (
              <View key={u.id} style={[rowStyles.wrap, { opacity: 0.7 }]}>
                <Avatar name={u.username} size={44} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={rowStyles.name}>{u.username}</Text>
                  <Text style={rowStyles.email}>Request pending</Text>
                </View>
                <View style={[rowStyles.chatBtn, { borderColor: Colors.text.muted + '40' }]}>
                  <Text style={[rowStyles.chatBtnText, { color: Colors.text.muted }]}>Sent</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background.primary },
  blobTop: {
    position: 'absolute', top: -60, right: -40,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: Colors.accent.pink, opacity: 0.06,
  },
  scroll: { paddingHorizontal: 20, gap: 0 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  title: {
    fontFamily: FontFamily.bold, fontSize: FontSize['3xl'],
    color: Colors.text.primary, letterSpacing: -0.5,
  },
  addBtn: { borderRadius: 20, overflow: 'hidden' },
  addBtnGradient: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  addBtnText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: '#fff' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface.white, borderRadius: 14,
    paddingHorizontal: 16, height: 48, marginBottom: 20,
    borderWidth: 1.5, borderColor: Colors.surface.border,
    shadowColor: Colors.brand.blue, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1, fontFamily: FontFamily.regular,
    fontSize: FontSize.base, color: Colors.text.primary,
  },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: FontFamily.semiBold, fontSize: FontSize.lg, color: Colors.text.primary,
  },
  seeAll: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.brand.blue },
  badge: {
    backgroundColor: Colors.brand.blue, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2, minWidth: 22, alignItems: 'center',
  },
  badgeText: { fontFamily: FontFamily.bold, fontSize: 11, color: '#fff' },
  activeAvatar: { alignItems: 'center', gap: 6, position: 'relative', width: 64 },
  onlineDot: {
    position: 'absolute', top: 40, right: 4,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: Colors.status.online,
    borderWidth: 2, borderColor: Colors.background.primary,
  },
  activeName: {
    fontFamily: FontFamily.medium, fontSize: FontSize.xs,
    color: Colors.text.secondary, maxWidth: 60, textAlign: 'center',
  },
  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.md, color: Colors.text.secondary },
  emptySubtitle: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.text.muted, textAlign: 'center' },
  errorBox: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  errorText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.status.error, textAlign: 'center' },
  retryText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.brand.blue },
});
