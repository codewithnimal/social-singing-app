// Vibely — Chat Conversation Screen
// Real backend: GET /chat/history/{friend_id}, POST /chat/send/{friend_id}, Audio playback & Two-Play Gatekeeper

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { safeAudioPlayer } from '../../../src/utils/safeAudioPlayer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../../src/theme/colors';
import { FontFamily, FontSize } from '../../../src/theme/typography';
import { chatApi } from '../../../src/api/chatApi';
import { BackendMessageResponse } from '../../../src/api/types';
import { useAuth } from '../../../src/context/AuthContext';
import { tokenStore } from '../../../src/api/apiClient';

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
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

function formatDurationMs(ms: number | null): string {
  if (!ms || ms <= 0) return '0:05';
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function formatMsgTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function ChatDetailScreen() {
  const insets = useSafeAreaInsets();
  const { chatId, friendName, friendEmail } = useLocalSearchParams<{
    chatId: string;
    friendName?: string;
    friendEmail?: string;
  }>();

  const { user } = useAuth();
  const friendId = Number(chatId);

  const [messages, setMessages] = useState<BackendMessageResponse[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [playingMsgId, setPlayingMsgId] = useState<number | null>(null);
  const [loadingMsgId, setLoadingMsgId] = useState<number | null>(null);
  const waveformAnim = useRef(new Animated.Value(0)).current;

  const flatListRef = useRef<FlatList>(null);

  const stopCurrentSound = useCallback(() => {
    safeAudioPlayer.stop();
    setPlayingMsgId(null);
    setLoadingMsgId(null);
    waveformAnim.stopAnimation();
    waveformAnim.setValue(0);
  }, [waveformAnim]);

  // Animate waveform when playing
  useEffect(() => {
    if (playingMsgId !== null) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveformAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(waveformAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      waveformAnim.stopAnimation();
      waveformAnim.setValue(0);
    }
  }, [playingMsgId, waveformAnim]);

  useEffect(() => {
    return () => {
      stopCurrentSound();
    };
  }, [stopCurrentSound]);

  const loadHistory = useCallback(async () => {
    if (!friendId) return;
    try {
      const res = await chatApi.history(friendId, 1, 50);
      // messages from backend: reverse so oldest is top if not inverted, or newest first if inverted
      setMessages(res.items || []);
    } catch (err: any) {
      console.warn('Failed to load chat history:', err);
    } finally {
      setLoading(false);
    }
  }, [friendId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSendText = async () => {
    if (!inputText.trim() || sending || !friendId) return;
    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const sent = await chatApi.sendText(friendId, textToSend);
      setMessages((prev) => [sent, ...prev]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send message');
      setInputText(textToSend);
    } finally {
      setSending(false);
    }
  };

  const handlePlayAudio = async (msg: BackendMessageResponse) => {
    if (!msg.audio_url) return;

    // If already playing this message — stop it
    if (playingMsgId === msg.id) {
      await stopCurrentSound();
      return;
    }

    const isOwn = msg.sender_id === user?.id;
    // Two-Play Gatekeeper: if not own and plays >= max_plays, locked!
    if (!isOwn && msg.play_count >= msg.max_plays) {
      Alert.alert(
        'Vibe Expired',
        'This singing note has already been played 2 times and is now locked.'
      );
      return;
    }

    await stopCurrentSound();
    setLoadingMsgId(msg.id);

    try {
      const token = await tokenStore.get();
      const audioUrl = chatApi.getAudioServeUrl(msg.audio_url);
      // Optimistically increment play count locally for recipient
      if (!isOwn) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, play_count: m.play_count + 1 } : m))
        );
      }

      setLoadingMsgId(null);
      setPlayingMsgId(msg.id);

      await safeAudioPlayer.play(
        audioUrl,
        token ? { Authorization: `Bearer ${token}` } : {},
        () => {
          stopCurrentSound();
        },
        msg.audio_duration_ms || 3000
      );
    } catch (err: any) {
      console.warn('Playback error:', err);
      stopCurrentSound();
      if (err?.message?.includes('403') || err?.status === 403) {
        Alert.alert('Limit Reached', 'This voice note has reached its maximum 2 plays.');
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, play_count: m.max_plays } : m))
        );
      } else {
        Alert.alert('Playback Error', 'Unable to play this audio message.');
      }
    }
  };

  const handleSingBack = () => {
    router.push({
      pathname: '/singing/prompt',
      params: {
        chatId: String(friendId),
        friendId: String(friendId),
        friendName: friendName || 'Friend',
      },
    } as any);
  };

  const renderMessageItem = ({ item }: { item: BackendMessageResponse }) => {
    const isOwn = item.sender_id === user?.id;
    const isAudio = !!item.audio_url;

    if (!isAudio) {
      // Text message
      return (
        <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}>
          <View
            style={[
              styles.textBubble,
              isOwn ? styles.textBubbleOwn : styles.textBubbleOther,
            ]}
          >
            <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
              {item.content}
            </Text>
            <Text style={[styles.timeText, isOwn && styles.timeTextOwn]}>
              {formatMsgTime(item.created_at)}
            </Text>
          </View>
        </View>
      );
    }

    // Audio / Singing message
    const isLocked = !isOwn && item.play_count >= item.max_plays;
    const isPlaying = playingMsgId === item.id;
    const playsLeft = Math.max(0, item.max_plays - item.play_count);

    return (
      <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}>
        <View
          style={[
            styles.audioCard,
            isOwn ? styles.audioCardOwn : styles.audioCardOther,
            isLocked && styles.audioCardLocked,
          ]}
        >
          {/* Header row in audio card */}
          <View style={styles.audioTopRow}>
            <View style={styles.audioTag}>
              <Text style={styles.audioTagIcon}>🎵</Text>
              <Text style={styles.audioTagText}>
                {isOwn ? 'Your Singing Vibe' : 'Singing Note'}
              </Text>
            </View>

            {/* Play gatekeeper badge */}
            {!isOwn ? (
              <View
                style={[
                  styles.playsBadge,
                  isLocked ? styles.playsBadgeLocked : styles.playsBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.playsBadgeText,
                    isLocked ? styles.playsBadgeTextLocked : styles.playsBadgeTextActive,
                  ]}
                >
                  {isLocked ? '🔒 Expired (2/2)' : `🔥 ${playsLeft} play left`}
                </Text>
              </View>
            ) : (
              <Text style={styles.ownPlaysLabel}>Sent</Text>
            )}
          </View>

          {/* Player controls row */}
          <View style={styles.playerControlsRow}>
            <TouchableOpacity
              onPress={() => handlePlayAudio(item)}
              disabled={isLocked || loadingMsgId === item.id}
              style={[styles.playBtn, isLocked && styles.playBtnDisabled]}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  isLocked
                    ? ['#94A3B8', '#64748B']
                    : isPlaying
                    ? ['#E83E8C', '#8B5CF6']
                    : ['#1677FF', '#3B82F6']
                }
                style={styles.playBtnGradient}
              >
                {loadingMsgId === item.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.playBtnIcon}>
                    {isLocked ? '🔒' : isPlaying ? '⏸' : '▶'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.waveformContainer}>
              {/* Animated waveform bars */}
              <View style={styles.barsRow}>
                {[40, 70, 30, 85, 60, 95, 45, 80, 50, 75, 90, 60, 40, 70].map((h, idx) => {
                  const barColor = isLocked ? '#CBD5E1' : isPlaying ? '#E83E8C' : isOwn ? '#3B82F6' : '#1677FF';
                  const baseHeight = (h / 100) * 24;
                  if (isPlaying) {
                    const phase = (idx / 14) * Math.PI * 2;
                    const animHeight = waveformAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [baseHeight * 0.5, baseHeight],
                    });
                    return (
                      <Animated.View
                        key={idx}
                        style={[
                          styles.waveformBar,
                          { height: animHeight, backgroundColor: barColor, opacity: 0.85 + 0.15 * Math.sin(phase) },
                        ]}
                      />
                    );
                  }
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.waveformBar,
                        { height: baseHeight, backgroundColor: barColor },
                      ]}
                    />
                  );
                })}
              </View>
              <Text style={styles.audioDurationText}>
                {formatDurationMs(item.audio_duration_ms)}
              </Text>
            </View>
          </View>

          {/* Footer & Sing Back button for incoming vibes */}
          <View style={styles.audioFooterRow}>
            <Text style={styles.audioTimestamp}>{formatMsgTime(item.created_at)}</Text>

            {!isOwn && (
              <TouchableOpacity
                onPress={handleSingBack}
                style={styles.singBackBtn}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#E83E8C', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.singBackGradient}
                >
                  <Text style={styles.singBackText}>🎤 Sing Back</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#F8FBFF', '#F0F6FF']} style={StyleSheet.absoluteFill} />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Avatar name={friendName || 'Friend'} size={38} />
          <View style={styles.headerNameCol}>
            <View style={styles.nameOnlineRow}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {friendName || 'Friend'}
              </Text>
              <View style={styles.headerOnlineDot} />
            </View>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {friendEmail || 'Vibely Friend'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSingBack}
          style={styles.headerSingBtn}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#E83E8C', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerSingGradient}
          >
            <Text style={styles.headerSingText}>🎤 Sing</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* KAV wraps message list + composer so it resizes smoothly on iOS & Android */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Message List — flex:1 absorbs any height reduction */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.brand.blue} />
            <Text style={styles.loadingText}>Loading conversation...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            inverted
            keyExtractor={(item) => String(item.id)}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyConversation}>
                <Text style={styles.emptyIcon}>🎶</Text>
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptyDesc}>
                  Send a quick text or record a singing note for {friendName || 'your friend'}!
                </Text>
              </View>
            }
          />
        )}

        {/* Composer — always pinned at the bottom of the KAV */}
        <View style={[styles.composerContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity
            onPress={handleSingBack}
            style={styles.composerMicBtn}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#E83E8C', '#8B5CF6']}
              style={styles.composerMicGradient}
            >
              <Text style={styles.composerMicIcon}>🎤</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.composerInputWrap}>
            <TextInput
              style={styles.composerInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Send a message..."
              placeholderTextColor={Colors.text.muted}
              selectionColor={Colors.brand.blue}
              multiline
              maxLength={500}
            />
          </View>

          <TouchableOpacity
            onPress={handleSendText}
            disabled={!inputText.trim() || sending}
            style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                inputText.trim() ? ['#1677FF', '#8B5CF6'] : ['#E2E8F0', '#CBD5E1']
              }
              style={styles.sendBtnGradient}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendBtnIcon}>↑</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(22, 119, 255, 0.08)',
    shadowColor: '#1677FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  backBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
  },
  backBtnText: {
    fontSize: 32,
    color: Colors.brand.blue,
    lineHeight: 34,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerNameCol: {
    marginLeft: 10,
    flex: 1,
  },
  nameOnlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: Colors.text.primary,
  },
  headerOnlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.status.online,
    marginLeft: 6,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.text.secondary,
    marginTop: 1,
  },
  headerSingBtn: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  headerSingGradient: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },
  headerSingText: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: FontFamily.medium,
    color: Colors.text.secondary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyConversation: {
    transform: [{ scaleY: -1 }],
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: Colors.text.primary,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  bubbleRow: {
    marginVertical: 5,
    flexDirection: 'row',
  },
  bubbleRowOwn: {
    justifyContent: 'flex-end',
  },
  bubbleRowOther: {
    justifyContent: 'flex-start',
  },
  textBubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  textBubbleOwn: {
    backgroundColor: '#1677FF',
    borderBottomRightRadius: 4,
  },
  textBubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(22, 119, 255, 0.10)',
    shadowColor: '#1677FF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    fontFamily: FontFamily.regular,
    color: Colors.text.primary,
    lineHeight: 21,
  },
  messageTextOwn: {
    color: '#FFFFFF',
  },
  timeText: {
    fontSize: 10,
    fontFamily: FontFamily.regular,
    color: Colors.text.muted,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  timeTextOwn: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  audioCard: {
    width: '84%',
    borderRadius: 20,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(22, 119, 255, 0.12)',
    shadowColor: '#1677FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  audioCardOwn: {
    backgroundColor: '#F5F9FF',
    borderColor: 'rgba(22, 119, 255, 0.22)',
    borderBottomRightRadius: 4,
  },
  audioCardOther: {
    borderBottomLeftRadius: 4,
  },
  audioCardLocked: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  audioTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  audioTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  audioTagIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  audioTagText: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    color: Colors.text.primary,
  },
  playsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  playsBadgeActive: {
    backgroundColor: 'rgba(232, 62, 140, 0.16)',
  },
  playsBadgeLocked: {
    backgroundColor: '#F1F5F9',
  },
  playsBadgeText: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
  },
  playsBadgeTextActive: {
    color: '#E83E8C',
  },
  playsBadgeTextLocked: {
    color: '#64748B',
  },
  ownPlaysLabel: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    color: Colors.text.muted,
  },
  playerControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  playBtnDisabled: {
    opacity: 0.7,
  },
  playBtnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnIcon: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  waveformContainer: {
    flex: 1,
    marginLeft: 12,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 26,
    gap: 3,
  },
  waveformBar: {
    width: 3,
    borderRadius: 2,
  },
  audioDurationText: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    color: Colors.text.muted,
    marginTop: 4,
  },
  audioFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(22, 119, 255, 0.06)',
  },
  audioTimestamp: {
    fontSize: 10,
    fontFamily: FontFamily.regular,
    color: Colors.text.muted,
  },
  singBackBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  singBackGradient: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  singBackText: {
    fontSize: 11,
    fontFamily: FontFamily.semiBold,
    color: '#FFFFFF',
  },
  composerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(22, 119, 255, 0.08)',
  },
  composerMicBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    marginRight: 8,
  },
  composerMicGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerMicIcon: {
    fontSize: 18,
  },
  composerInputWrap: {
    flex: 1,
    backgroundColor: '#F4F8FF',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    borderWidth: 1.5,
    borderColor: 'rgba(22, 119, 255, 0.15)',
    minHeight: 44,
    maxHeight: 120,
    justifyContent: 'center',
  },
  composerInput: {
    fontSize: 15,
    fontFamily: FontFamily.regular,
    color: Colors.text.primary,
    paddingTop: 0,
    paddingBottom: 0,
    textAlignVertical: 'center',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginLeft: 8,
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnIcon: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    color: '#FFFFFF',
  },
});
