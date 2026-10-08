// Vibely — Singing Sending Screen
// Real backend: POST /api/v1/chat/audio/{friend_id} with multi-friend (Snapchat-style) batch sending

import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../src/theme/colors';
import { FontFamily, FontSize } from '../../src/theme/typography';
import { chatApi } from '../../src/api/chatApi';
import { audioService, repairAndroidExperienceDataUri } from '../../src/services/audioService';

interface FriendTarget {
  id: string;
  name: string;
}

export default function SingingSendingScreen() {
  const params = useLocalSearchParams<{
    chatId?: string;
    friendId?: string;
    friendName?: string;
    friends?: string;
    isReply?: string;
    replyToMessageId?: string;
    prompt?: string;
    audioUri?: string;
    duration?: string;
    effectId?: string;
  }>();

  // Parse multi-friend recipients
  const targetFriends = useMemo<FriendTarget[]>(() => {
    try {
      if (params.friends) {
        const parsed = JSON.parse(params.friends);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    const singleId = params.friendId || params.chatId;
    if (singleId) {
      return [{ id: String(singleId), name: params.friendName || 'Friend' }];
    }
    return [];
  }, [params.friends, params.friendId, params.chatId, params.friendName]);

  const [progress, setProgress] = useState(0.15);
  const [isDone, setIsDone] = useState(false);
  const [currentFriendName, setCurrentFriendName] = useState(
    targetFriends[0]?.name || 'Friend'
  );
  const [sentFriendIds, setSentFriendIds] = useState<string[]>([]);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let isMounted = true;

    // Start pulsing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();

    async function sendSongToAll() {
      try {
        const durationSec = Math.max(1, parseInt(params.duration || '5', 10));
        const durationMs = durationSec * 1000;
        const lastFile = audioService.getLastRecordedFile();
        const rawUri = lastFile?.uri || params.audioUri || '';
        const uri = repairAndroidExperienceDataUri(rawUri);

        const total = targetFriends.length || 1;

        if (targetFriends.length === 0) {
          // Fallback simulation if no friends passed
          await new Promise((r) => setTimeout(r, 1200));
          if (isMounted) {
            setProgress(1.0);
            setIsDone(true);
          }
          setTimeout(() => {
            if (isMounted) router.replace('/(main)/home' as any);
          }, 800);
          return;
        }

        // Loop over each friend and send audio message
        for (let i = 0; i < targetFriends.length; i++) {
          if (!isMounted) break;
          const friend = targetFriends[i];
          setCurrentFriendName(friend.name);
          const stepProgress = (i + 0.3) / total;
          setProgress(Math.max(0.2, stepProgress));

          const targetId = Number(friend.id);
          try {
            if (targetId && uri && !uri.startsWith('mock://')) {
              const clientMsgId = `vibe_${Date.now()}_${targetId}`;
              const filename = `singing_${Date.now()}.m4a`;
              await chatApi.sendAudio(
                targetId,
                uri,
                filename,
                durationMs,
                clientMsgId
              );
            } else {
              // Simulated delay for simulator/mock
              await new Promise((r) => setTimeout(r, 600));
            }
          } catch (sendErr) {
            console.warn(`Failed to send to friend ${friend.id}:`, sendErr);
          }

          if (isMounted) {
            setSentFriendIds((prev) => [...prev, friend.id]);
            setProgress((i + 1) / total);
          }
        }

        if (isMounted) {
          setProgress(1.0);
          setIsDone(true);
        }

        setTimeout(() => {
          if (!isMounted) return;
          if (targetFriends.length === 1) {
            // Single recipient: jump directly to their chat
            router.replace({
              pathname: '/(main)/chats/[chatId]',
              params: {
                chatId: targetFriends[0].id,
                friendName: targetFriends[0].name,
              },
            } as any);
          } else {
            // Multi recipient: go to Chats tab so user sees all updated chats!
            router.replace('/(main)/chats/index' as any);
          }
        }, 1100);
      } catch (err: any) {
        console.warn('Error sending audio note:', err);
        if (isMounted) {
          setProgress(1.0);
          setIsDone(true);
        }
        setTimeout(() => {
          if (!isMounted) return;
          router.replace('/(main)/chats/index' as any);
        }, 1000);
      }
    }

    sendSongToAll();

    return () => {
      isMounted = false;
    };
  }, [targetFriends, params.audioUri, params.duration, scaleAnim]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#F8FBFF', '#EEF5FF']} style={StyleSheet.absoluteFill} />

      <View style={styles.content}>
        {/* Animated Singing Orb */}
        <Animated.View style={[styles.orbWrapper, { transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient
            colors={isDone ? ['#22C55E', '#1677FF'] : ['#E83E8C', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.orbGradient}
          >
            <Text style={styles.orbEmoji}>{isDone ? '✨' : '🎵'}</Text>
          </LinearGradient>
        </Animated.View>

        {/* Title */}
        <Text style={styles.title}>
          {isDone
            ? targetFriends.length > 1
              ? `Vibes Sent to All ${targetFriends.length} Friends! 🎉`
              : `Vibe Sent to ${targetFriends[0]?.name || 'Friend'}! 🎉`
            : targetFriends.length > 1
            ? `Sending to ${currentFriendName}...`
            : `Sending to ${currentFriendName}...`}
        </Text>

        <Text style={styles.subtitle}>
          {isDone
            ? targetFriends.length > 1
              ? `Shared with ${targetFriends.map((f) => f.name).join(', ')}`
              : 'Your singing note is on its way!'
            : targetFriends.length > 1
            ? `Delivering ${sentFriendIds.length} of ${targetFriends.length} vibes`
            : 'Uploading your voice note to the server'}
        </Text>

        {/* Progress Bar */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${Math.round(progress * 100)}%` }]}>
            <LinearGradient
              colors={isDone ? ['#22C55E', '#1677FF'] : ['#E83E8C', '#1677FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
        </View>

        <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>

        {/* Snapchat-style recipient progress chips */}
        {targetFriends.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.friendsProgressScroll}
            style={styles.friendsProgressWrapper}
          >
            {targetFriends.map((f) => {
              const isSent = sentFriendIds.includes(f.id);
              return (
                <View
                  key={f.id}
                  style={[
                    styles.recipientProgressChip,
                    isSent && styles.recipientProgressChipSent,
                  ]}
                >
                  <Text style={styles.chipStatusIcon}>
                    {isSent ? '✓' : '⏳'}
                  </Text>
                  <Text
                    style={[
                      styles.chipFriendName,
                      isSent && styles.chipFriendNameSent,
                    ]}
                    numberOfLines={1}
                  >
                    {f.name}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  orbWrapper: {
    width: 130,
    height: 130,
    borderRadius: 65,
    marginBottom: 28,
    shadowColor: '#E83E8C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  orbGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbEmoji: {
    fontSize: 54,
  },
  title: {
    fontSize: 21,
    fontFamily: FontFamily.bold,
    color: Colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
    maxWidth: '90%',
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(22, 119, 255, 0.10)',
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressPercent: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
    color: Colors.brand.blue,
    marginBottom: 16,
  },
  friendsProgressWrapper: {
    maxHeight: 46,
    marginTop: 6,
  },
  friendsProgressScroll: {
    gap: 8,
    paddingHorizontal: 4,
  },
  recipientProgressChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(22, 119, 255, 0.12)',
    gap: 6,
  },
  recipientProgressChipSent: {
    backgroundColor: '#F0FDF4',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  chipStatusIcon: {
    fontSize: 12,
    color: Colors.brand.blue,
  },
  chipFriendName: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: Colors.text.primary,
    maxWidth: 90,
  },
  chipFriendNameSent: {
    color: '#15803D',
    fontFamily: FontFamily.semiBold,
  },
});
