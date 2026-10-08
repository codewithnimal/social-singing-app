// Vibely — Add Friend (Search) Screen
// Real backend: GET /api/v1/users/search?q=, POST /friends/request/{id}

import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../../src/theme/colors';
import { FontFamily, FontSize } from '../../../src/theme/typography';
import { friendsApi } from '../../../src/api/friendsApi';
import { BackendUser } from '../../../src/api/types';
import { ApiError } from '../../../src/api/apiClient';

function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const initial = name?.charAt(0)?.toUpperCase() ?? '?';
  const colors: Array<[string, string]> = [
    ['#1677FF', '#8B5CF6'], ['#E83E8C', '#8B5CF6'],
    ['#1677FF', '#3B82F6'], ['#22C55E', '#1677FF'],
  ];
  const pair = colors[name.charCodeAt(0) % colors.length];
  return (
    <LinearGradient colors={pair} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontFamily: FontFamily.bold, fontSize: size * 0.38 }}>{initial}</Text>
    </LinearGradient>
  );
}

export default function AddFriendScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BackendUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [requestedIds, setRequestedIds] = useState<Set<number>>(new Set());

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (text: string) => {
    setQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!text.trim()) { setResults([]); setSearched(false); return; }
    searchTimeout.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await friendsApi.search(text.trim());
        setResults(res);
        setSearched(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const handleSendRequest = async (user: BackendUser) => {
    try {
      await friendsApi.sendRequest(user.id);
      setRequestedIds((prev) => new Set(prev).add(user.id));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not send request.';
      Alert.alert('Oops', msg);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#F8FBFF', '#F0F6FF']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.blobBlue} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Find Friends</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={[styles.searchWrap, { marginHorizontal: 20 }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={handleSearch}
          placeholder="Search by username..."
          placeholderTextColor={Colors.text.muted}
          autoFocus
          autoCapitalize="none"
          accessibilityLabel="Search for friends by username"
        />
        {loading && <ActivityIndicator color={Colors.brand.blue} size="small" />}
      </View>

      {/* Results */}
      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        ListEmptyComponent={
          searched && !loading ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>No users found for "{query}"</Text>
              <Text style={styles.emptyHint}>Try a different username</Text>
            </View>
          ) : !query ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>Search for friends</Text>
              <Text style={styles.emptyHint}>Type a username to find people on Vibely</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const alreadyRequested = requestedIds.has(item.id);
          return (
            <View style={styles.resultRow}>
              <Avatar name={item.username} size={50} />
              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{item.username}</Text>
                <Text style={styles.resultEmail} numberOfLines={1}>{item.email}</Text>
              </View>
              <TouchableOpacity
                style={[styles.addBtn, alreadyRequested && styles.addBtnDone]}
                onPress={() => !alreadyRequested && handleSendRequest(item)}
                disabled={alreadyRequested}
                accessibilityLabel={alreadyRequested ? 'Request sent' : `Add ${item.username}`}
              >
                {alreadyRequested ? (
                  <Text style={styles.addBtnTextDone}>Sent ✓</Text>
                ) : (
                  <LinearGradient
                    colors={[Colors.brand.blue, Colors.brand.purple] as [string, string]}
                    style={styles.addBtnGradient}
                  >
                    <Text style={styles.addBtnText}>+ Add</Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background.primary },
  blobBlue: {
    position: 'absolute', top: -40, right: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: Colors.brand.blue, opacity: 0.05,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.surface.white, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.brand.blue, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  backIcon: { fontSize: 18, color: Colors.text.primary },
  title: { fontFamily: FontFamily.bold, fontSize: FontSize['2xl'], color: Colors.text.primary },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface.white, borderRadius: 16,
    paddingHorizontal: 16, height: 52, marginBottom: 20,
    borderWidth: 1.5, borderColor: Colors.surface.border,
    shadowColor: Colors.brand.blue, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1, fontFamily: FontFamily.regular,
    fontSize: FontSize.base, color: Colors.text.primary,
  },
  list: { paddingHorizontal: 20, gap: 0 },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, backgroundColor: Colors.surface.white,
    borderRadius: 16, marginBottom: 10,
    shadowColor: Colors.brand.blue, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    borderWidth: 1, borderColor: Colors.surface.border,
  },
  resultInfo: { flex: 1, gap: 3 },
  resultName: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.text.primary },
  resultEmail: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.text.muted },
  addBtn: { borderRadius: 20, overflow: 'hidden' },
  addBtnGradient: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20 },
  addBtnText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs, color: '#fff' },
  addBtnDone: { backgroundColor: Colors.status.successBg, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9 },
  addBtnTextDone: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs, color: Colors.status.success },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyIcon: { fontSize: 44 },
  emptyText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.md, color: Colors.text.secondary },
  emptyHint: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.text.muted, textAlign: 'center' },
});
