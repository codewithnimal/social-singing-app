// Vibely — Singing Prompt Screen (Inspirational song prompts & freestyle option)

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../src/theme/colors';
import { FontFamily, FontSize } from '../../src/theme/typography';
import { Radius } from '../../src/theme/radius';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';
import { GlassCard } from '../../src/components/cards/GlassCard';
import { SINGING_PROMPTS } from '../../src/constants/prompts';

export default function SingingPromptScreen() {
  const params = useLocalSearchParams<{
    chatId: string;
    friendId: string;
    friendName: string;
    isReply?: string;
    replyToMessageId?: string;
  }>();

  const [selectedPrompt, setSelectedPrompt] = useState<string>(SINGING_PROMPTS[0]);
  const [promptsList, setPromptsList] = useState<string[]>(SINGING_PROMPTS);

  const handleShuffle = () => {
    const shuffled = [...promptsList].sort(() => Math.random() - 0.5);
    setPromptsList(shuffled);
    setSelectedPrompt(shuffled[0]);
  };

  const handleProceed = (promptToUse?: string) => {
    router.push({
      pathname: '/singing/permission',
      params: {
        chatId: params.chatId,
        friendId: params.friendId,
        friendName: params.friendName,
        isReply: params.isReply,
        replyToMessageId: params.replyToMessageId,
        prompt: promptToUse !== undefined ? promptToUse : selectedPrompt,
      },
    } as any);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScreenHeader
          title={params.isReply ? `Sing back to ${params.friendName || 'friend'}` : 'Sing a Song'}
          subtitle="Pick a prompt for inspiration or sing freely"
          showBack
          rightAction={
            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          }
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Banner */}
          <LinearGradient
            colors={['#3B1464', '#1F0D36']}
            style={styles.heroBanner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroIconBadge}>
              <Text style={{ fontSize: 28 }}>🎙️</Text>
            </View>
            <Text style={styles.heroTitle}>
              {params.isReply ? 'Singing is conversation' : 'What feels right to sing today?'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {params.friendName
                ? `Singing a 15–30 second melody to ${params.friendName}. Don't worry about being perfect — just have fun!`
                : "Sing a short tune to brighten someone's day."}
            </Text>
          </LinearGradient>

          {/* Shuffle bar */}
          <View style={styles.promptHeaderRow}>
            <Text style={styles.sectionHeading}>Inspiration Prompts</Text>
            <TouchableOpacity style={styles.shuffleBtn} onPress={handleShuffle}>
              <Text style={styles.shuffleText}>🔀 Shuffle</Text>
            </TouchableOpacity>
          </View>

          {/* Prompts List */}
          <View style={styles.promptsContainer}>
            {promptsList.slice(0, 5).map((item, index) => {
              const isSelected = selectedPrompt === item;
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedPrompt(item)}
                  activeOpacity={0.8}
                >
                  <GlassCard
                    style={[
                      styles.promptCard,
                      isSelected && styles.promptCardSelected,
                    ]}
                  >
                    <View style={styles.promptRadio}>
                      <View
                        style={[
                          styles.radioDot,
                          isSelected && styles.radioDotActive,
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.promptCardText,
                        isSelected && styles.promptCardTextSelected,
                      ]}
                    >
                      "{item}"
                    </Text>
                  </GlassCard>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Freestyle Option */}
          <TouchableOpacity
            onPress={() => handleProceed('')}
            style={styles.freestyleBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.freestyleIcon}>✨</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.freestyleTitle}>Skip prompts & Sing Freestyle</Text>
              <Text style={styles.freestyleSubtitle}>Just hit record and sing whatever you like</Text>
            </View>
            <Text style={styles.freestyleArrow}>→</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => handleProceed()}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={Colors.gradient.primary as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueGradient}
            >
              <Text style={styles.continueText}>Continue to Microphone 🎤</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: Colors.text.muted,
    fontSize: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 16,
  },
  heroBanner: {
    borderRadius: Radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.brand.purple + '40',
    alignItems: 'flex-start',
    gap: 8,
  },
  heroIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.brand.purple + '50',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.text.primary,
  },
  heroSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  promptHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sectionHeading: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.text.primary,
  },
  shuffleBtn: {
    backgroundColor: Colors.surface.dark,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  shuffleText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.brand.violet,
  },
  promptsContainer: {
    gap: 10,
  },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: Radius.lg,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  promptCardSelected: {
    borderColor: Colors.brand.violet,
    backgroundColor: Colors.brand.purple + '25',
  },
  promptRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.text.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'transparent',
  },
  radioDotActive: {
    backgroundColor: Colors.brand.violet,
  },
  promptCardText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  promptCardTextSelected: {
    fontFamily: FontFamily.semiBold,
    color: Colors.text.primary,
  },
  freestyleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.dark,
    padding: 16,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    gap: 14,
    marginTop: 8,
  },
  freestyleIcon: {
    fontSize: 24,
  },
  freestyleTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
  },
  freestyleSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  freestyleArrow: {
    fontSize: 18,
    color: Colors.brand.violet,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.surface.border,
  },
  continueBtn: {
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  continueGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  continueText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.text.primary,
  },
});
