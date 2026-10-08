// Vibely — Singing Preview Screen
// Real backend preview, Snapchat-style multi-friend selector, and send action

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  FlatList,
  Alert,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../src/theme/colors';
import { FontFamily, FontSize } from '../../src/theme/typography';
import { Radius } from '../../src/theme/radius';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';
import { Waveform } from '../../src/components/audio/Waveform';
import { audioService } from '../../src/services/audioService';
import { generateWaveform } from '../../src/mock/messages';
import { AUDIO_EFFECTS } from '../../src/constants/effects';
import { formatDuration } from '../../src/utils/time';
import { friendsApi } from '../../src/api/friendsApi';
import { BackendUser } from '../../src/api/types';

export interface SelectedFriend {
  id: string;
  name: string;
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
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
      <Text style={{ color: '#fff', fontFamily: FontFamily.bold, fontSize: size * 0.4 }}>
        {initial}
      </Text>
    </LinearGradient>
  );
}

export default function SingingPreviewScreen() {
  const params = useLocalSearchParams<{
    chatId?: string;
    friendId?: string;
    friendName?: string;
    isReply?: string;
    replyToMessageId?: string;
    prompt?: string;
    audioUri?: string;
    duration?: string;
    effectId?: string;
  }>();

  // Multi-friend selection state (Snapchat style)
  const [selectedFriends, setSelectedFriends] = useState<SelectedFriend[]>(
    params.friendId
      ? [{ id: String(params.friendId), name: params.friendName || 'Friend' }]
      : []
  );
  const [friendsList, setFriendsList] = useState<BackendUser[]>([]);
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const stopRef = useRef<(() => void) | null>(null);

  const lastFile = audioService.getLastRecordedFile();
  const audioUri = lastFile?.uri || params.audioUri || '';
  const durationSec = Math.max(1, parseInt(params.duration || '5', 10));
  const effect = AUDIO_EFFECTS.find((e) => e.id === params.effectId) ?? AUDIO_EFFECTS[0];
  const waveformData = useRef(generateWaveform(`preview-${audioUri || 'new'}`)).current;

  useEffect(() => {
    friendsApi
      .list()
      .then((res) => {
        const list = res.friends || [];
        setFriendsList(list);
        // Default to first friend if none selected yet
        if (selectedFriends.length === 0 && list.length > 0) {
          setSelectedFriends([
            {
              id: String(list[0].id),
              name: list[0].username,
            },
          ]);
        }
      })
      .catch(() => {});

    return () => {
      stopRef.current?.();
      audioService.pausePlayback();
    };
  }, []);

  const handlePlayPause = () => {
    if (isPlaying) {
      stopRef.current?.();
      stopRef.current = null;
      audioService.pausePlayback();
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    } else {
      try {
        setIsPlaying(true);
        stopRef.current = audioService.playAudio(
          audioUri,
          durationSec,
          (p, t) => {
            setProgress(p);
            setCurrentTime(t);
          },
          () => {
            stopRef.current = null;
            setIsPlaying(false);
            setProgress(0);
            setCurrentTime(0);
          },
          (error) => {
            stopRef.current = null;
            setIsPlaying(false);
            const code = (error as any).code;
            const title = code ? `Playback Error [${code}]` : 'Playback Error';
            Alert.alert(title, error.message);
          }
        );
      } catch (error) {
        const code = (error as any).code;
        const title = code ? `Playback Error [${code}]` : 'Playback Error';
        const message = error instanceof Error ? error.message : 'Unable to play this recording.';
        setIsPlaying(false);
        Alert.alert(title, message);
      }
    }
  };

  const handleReRecord = () => {
    stopRef.current?.();
    router.replace({
      pathname: '/singing/recording',
      params: {
        chatId: selectedFriends[0]?.id || params.chatId,
        friendId: selectedFriends[0]?.id || params.friendId,
        friendName: selectedFriends[0]?.name || params.friendName,
        isReply: params.isReply,
        replyToMessageId: params.replyToMessageId,
        prompt: params.prompt,
      },
    } as any);
  };

  // Snapchat-style toggle friend
  const toggleFriend = (friend: { id: string; name: string }) => {
    setSelectedFriends((prev) => {
      const exists = prev.some((f) => f.id === friend.id);
      if (exists) {
        return prev.filter((f) => f.id !== friend.id);
      } else {
        return [...prev, friend];
      }
    });
  };

  const isFriendSelected = (id: string) => {
    return selectedFriends.some((f) => f.id === id);
  };

  // Filtered friends by search query
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friendsList;
    const q = searchQuery.toLowerCase();
    return friendsList.filter(
      (f) =>
        f.username.toLowerCase().includes(q) ||
        (f.email && f.email.toLowerCase().includes(q))
    );
  }, [friendsList, searchQuery]);

  // Select all or clear all
  const handleToggleSelectAll = () => {
    if (selectedFriends.length === filteredFriends.length && filteredFriends.length > 0) {
      setSelectedFriends([]);
    } else {
      setSelectedFriends(
        filteredFriends.map((f) => ({ id: String(f.id), name: f.username }))
      );
    }
  };

  const handleSend = () => {
    stopRef.current?.();
    if (selectedFriends.length === 0) {
      setShowFriendPicker(true);
      return;
    }
    router.replace({
      pathname: '/singing/sending',
      params: {
        friends: JSON.stringify(selectedFriends),
        chatId: selectedFriends[0].id,
        friendId: selectedFriends[0].id,
        friendName:
          selectedFriends.length === 1
            ? selectedFriends[0].name
            : `${selectedFriends.length} Friends`,
        isReply: params.isReply,
        replyToMessageId: params.replyToMessageId,
        prompt: params.prompt,
        audioUri: audioUri,
        duration: params.duration,
        effectId: params.effectId,
      },
    } as any);
  };

  // Text summary of recipients
  const recipientSummary = useMemo(() => {
    if (selectedFriends.length === 0) return 'Tap to choose friends';
    if (selectedFriends.length === 1) return selectedFriends[0].name;
    if (selectedFriends.length === 2)
      return `${selectedFriends[0].name} & ${selectedFriends[1].name}`;
    return `${selectedFriends[0].name}, ${selectedFriends[1].name} +${selectedFriends.length - 2} more`;
  }, [selectedFriends]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#F8FBFF', '#F0F6FF']} style={StyleSheet.absoluteFill} />

      <ScreenHeader
        title="Preview Vibe"
        subtitle="Sounds awesome! Ready to send?"
        showBack
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Recipient Card (Snapchat Style with Multi-Selection summary) */}
        <TouchableOpacity
          style={styles.recipientPill}
          onPress={() => setShowFriendPicker(true)}
          activeOpacity={0.8}
        >
          {selectedFriends.length <= 1 ? (
            <Avatar name={selectedFriends[0]?.name || 'Friend'} size={40} />
          ) : (
            <View style={styles.avatarCluster}>
              {selectedFriends.slice(0, 3).map((f, idx) => (
                <View
                  key={f.id}
                  style={[
                    styles.avatarClusterItem,
                    { left: idx * 22, zIndex: 10 - idx },
                  ]}
                >
                  <Avatar name={f.name} size={34} />
                </View>
              ))}
            </View>
          )}

          <View
            style={[
              styles.recipientInfo,
              selectedFriends.length > 1 && { marginLeft: Math.min(selectedFriends.length, 3) * 22 + 10 },
            ]}
          >
            <View style={styles.recipientLabelRow}>
              <Text style={styles.recipientLabel}>Send vibe to</Text>
              {selectedFriends.length > 1 && (
                <View style={styles.snapchatBadge}>
                  <Text style={styles.snapchatBadgeText}>{selectedFriends.length} friends</Text>
                </View>
              )}
            </View>
            <Text style={styles.recipientName} numberOfLines={1}>
              {recipientSummary}
            </Text>
          </View>

          <View style={styles.changeBtnPill}>
            <Text style={styles.changeFriendBtn}>
              {selectedFriends.length > 1 ? 'Edit' : '+ Add More'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Prompt card if present */}
        {params.prompt ? (
          <View style={styles.promptCard}>
            <Text style={styles.promptLabel}>Prompt</Text>
            <Text style={styles.promptText}>"{params.prompt}"</Text>
          </View>
        ) : null}

        {/* Audio Player Card */}
        <View style={styles.playerCard}>
          <View style={styles.waveformWrapper}>
            <Waveform
              data={waveformData}
              variant={isPlaying ? 'playing' : progress > 0 ? 'completed' : 'inactive'}
              progress={progress}
              height={56}
              barWidth={3}
              barGap={2}
              animated={isPlaying}
            />
          </View>

          <View style={styles.timeRow}>
            <Text style={styles.timeText}>
              {isPlaying ? formatDuration(currentTime) : '0:00'}
            </Text>
            <View style={styles.effectTag}>
              <Text style={styles.effectTagText}>
                {effect.icon} {effect.name}
              </Text>
            </View>
            <Text style={styles.timeText}>{formatDuration(durationSec)}</Text>
          </View>

          {/* Big play button */}
          <TouchableOpacity
            style={styles.playButton}
            onPress={handlePlayPause}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={isPlaying ? ['#E83E8C', '#8B5CF6'] : ['#1677FF', '#3B82F6']}
              style={styles.playGradient}
            >
              <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.sendBtn}
          onPress={handleSend}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#1677FF', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.sendGradient}
          >
            <Text style={styles.sendBtnText}>
              {selectedFriends.length === 0
                ? 'Choose Friends to Send 🚀'
                : selectedFriends.length === 1
                ? `Send Vibe to ${selectedFriends[0].name} 🚀`
                : `Send Vibe to ${selectedFriends.length} Friends 🚀`}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reRecordBtn}
          onPress={handleReRecord}
          activeOpacity={0.7}
        >
          <Text style={styles.reRecordText}>Re-record</Text>
        </TouchableOpacity>
      </View>

      {/* Snapchat-Style Multi-Friend Selector Modal */}
      <Modal
        visible={showFriendPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFriendPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal drag pill */}
            <View style={styles.modalDragBar} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Send To Friends</Text>
                <Text style={styles.modalSubtitle}>
                  Choose who receives your singing vibe
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowFriendPicker(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search Input Bar */}
            <View style={styles.searchBar}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search friends..."
                placeholderTextColor={Colors.text.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={styles.searchClearIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Quick Actions (Select All + Selected Count badge) */}
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={styles.selectAllBtn}
                onPress={handleToggleSelectAll}
                activeOpacity={0.7}
              >
                <Text style={styles.selectAllText}>
                  {selectedFriends.length === filteredFriends.length && filteredFriends.length > 0
                    ? 'Deselect All'
                    : 'Select All'}
                </Text>
              </TouchableOpacity>

              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>
                  {selectedFriends.length} of {friendsList.length} chosen
                </Text>
              </View>
            </View>

            {/* Horizontal Selected Friends Strip (Snapchat Style) */}
            {selectedFriends.length > 0 && (
              <View style={styles.chipsStripContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsScroll}
                >
                  {selectedFriends.map((f) => (
                    <TouchableOpacity
                      key={f.id}
                      style={styles.friendChip}
                      onPress={() => toggleFriend(f)}
                      activeOpacity={0.7}
                    >
                      <Avatar name={f.name} size={22} />
                      <Text style={styles.friendChipName} numberOfLines={1}>
                        {f.name}
                      </Text>
                      <View style={styles.chipRemoveIcon}>
                        <Text style={styles.chipRemoveText}>✕</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Friend List with Circular Checkboxes */}
            <FlatList
              data={filteredFriends}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.friendList}
              renderItem={({ item }) => {
                const selected = isFriendSelected(String(item.id));
                return (
                  <TouchableOpacity
                    style={[
                      styles.friendPickerItem,
                      selected && styles.friendPickerItemSelected,
                    ]}
                    onPress={() =>
                      toggleFriend({ id: String(item.id), name: item.username })
                    }
                    activeOpacity={0.7}
                  >
                    <Avatar name={item.username} size={44} />

                    <View style={styles.friendCol}>
                      <Text style={styles.friendPickerName}>{item.username}</Text>
                      <Text style={styles.friendPickerSub}>
                        {item.email || 'Vibely friend'}
                      </Text>
                    </View>

                    {/* Snapchat-style Circular Checkbox */}
                    <View
                      style={[
                        styles.checkboxCircle,
                        selected && styles.checkboxCircleSelected,
                      ]}
                    >
                      {selected ? (
                        <LinearGradient
                          colors={['#1677FF', '#8B5CF6']}
                          style={styles.checkboxGradient}
                        >
                          <Text style={styles.checkmarkIcon}>✓</Text>
                        </LinearGradient>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyFriendsContainer}>
                  <Text style={styles.noFriendsNotice}>
                    {searchQuery
                      ? `No friends found matching "${searchQuery}"`
                      : 'No friends yet. Add a friend first!'}
                  </Text>
                </View>
              }
            />

            {/* Bottom Modal CTA */}
            <View style={styles.modalBottomBar}>
              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  selectedFriends.length === 0 && styles.modalConfirmBtnDisabled,
                ]}
                onPress={() => {
                  setShowFriendPicker(false);
                }}
                disabled={selectedFriends.length === 0}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={
                    selectedFriends.length > 0
                      ? ['#1677FF', '#8B5CF6']
                      : ['#CBD5E1', '#94A3B8']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalConfirmGradient}
                >
                  <Text style={styles.modalConfirmText}>
                    {selectedFriends.length === 0
                      ? 'Select Friends'
                      : `Done (${selectedFriends.length} selected)`}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 20,
  },
  recipientPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(22, 119, 255, 0.12)',
    shadowColor: '#1677FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarCluster: {
    width: 60,
    height: 40,
    position: 'relative',
    justifyContent: 'center',
  },
  avatarClusterItem: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 19,
  },
  recipientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  recipientLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recipientLabel: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    color: Colors.text.secondary,
  },
  snapchatBadge: {
    backgroundColor: 'rgba(22, 119, 255, 0.10)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  snapchatBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.semiBold,
    color: Colors.brand.blue,
  },
  recipientName: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    color: Colors.text.primary,
    marginTop: 2,
  },
  changeBtnPill: {
    backgroundColor: 'rgba(22, 119, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  changeFriendBtn: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    color: Colors.brand.blue,
  },
  promptCard: {
    backgroundColor: 'rgba(232, 62, 140, 0.12)',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(232, 62, 140, 0.28)',
  },
  promptLabel: {
    fontSize: 11,
    fontFamily: FontFamily.semiBold,
    color: Colors.accent.pink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  promptText: {
    fontSize: 14,
    fontFamily: FontFamily.medium,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  playerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    gap: 20,
    borderWidth: 1,
    borderColor: 'rgba(22, 119, 255, 0.12)',
    shadowColor: '#1677FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  waveformWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  timeText: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
    color: Colors.text.muted,
  },
  effectTag: {
    backgroundColor: 'rgba(22, 119, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  effectTagText: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    color: Colors.brand.blue,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#1677FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  playGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    fontSize: 22,
    color: '#FFFFFF',
    marginLeft: 3,
  },
  actions: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 10,
  },
  sendBtn: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#1677FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  sendGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    color: '#FFFFFF',
  },
  reRecordBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  reRecordText: {
    fontSize: 14,
    fontFamily: FontFamily.medium,
    color: Colors.text.secondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
    maxHeight: '85%',
  },
  modalDragBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: FontFamily.bold,
    color: Colors.text.primary,
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.text.muted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    color: Colors.text.muted,
    fontFamily: FontFamily.semiBold,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F8FF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(22, 119, 255, 0.12)',
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.text.primary,
    paddingVertical: 0,
  },
  searchClearIcon: {
    fontSize: 13,
    color: Colors.text.muted,
    padding: 4,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 8,
  },
  selectAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  selectAllText: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    color: Colors.brand.blue,
  },
  countBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 11,
    fontFamily: FontFamily.semiBold,
    color: Colors.brand.blue,
  },
  chipsStripContainer: {
    marginBottom: 10,
  },
  chipsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  friendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F6FF',
    borderRadius: 16,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(22, 119, 255, 0.20)',
    gap: 6,
  },
  friendChipName: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: Colors.text.primary,
    maxWidth: 90,
  },
  chipRemoveIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(22, 119, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRemoveText: {
    fontSize: 9,
    fontFamily: FontFamily.bold,
    color: Colors.brand.blue,
  },
  friendList: {
    maxHeight: 280,
  },
  friendPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(22, 119, 255, 0.06)',
  },
  friendPickerItemSelected: {
    backgroundColor: 'rgba(22, 119, 255, 0.04)',
  },
  friendCol: {
    flex: 1,
    marginLeft: 12,
  },
  friendPickerName: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    color: Colors.text.primary,
  },
  friendPickerSub: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.text.muted,
    marginTop: 2,
  },
  checkboxCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  checkboxCircleSelected: {
    borderWidth: 0,
  },
  checkboxGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkIcon: {
    fontSize: 13,
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
  },
  emptyFriendsContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  noFriendsNotice: {
    textAlign: 'center',
    color: Colors.text.secondary,
    fontFamily: FontFamily.regular,
    fontSize: 13,
  },
  modalBottomBar: {
    marginTop: 14,
    paddingTop: 8,
  },
  modalConfirmBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalConfirmBtnDisabled: {
    opacity: 0.6,
  },
  modalConfirmGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    color: '#FFFFFF',
  },
});
