// Vibely — Chat Wallpaper Screen
// Soft pastel light theme presets with live chat bubble preview

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../../src/theme/colors';
import { FontFamily, FontSize } from '../../../src/theme/typography';
import { Radius } from '../../../src/theme/radius';
import { ScreenHeader } from '../../../src/components/layout/ScreenHeader';
import { WALLPAPERS } from '../../../src/constants/wallpapers';
import { Wallpaper } from '../../../src/types';

export default function WallpaperScreen() {
  const [selectedWallpaper, setSelectedWallpaper] = useState<Wallpaper>(WALLPAPERS[0]);

  const handleApply = () => {
    Alert.alert('Wallpaper Applied', `"${selectedWallpaper.name}" has been set for all your chats!`, [
      { text: 'Great', onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#F8FBFF', '#F0F6FF']} style={StyleSheet.absoluteFill} />
      <View style={styles.container}>
        <ScreenHeader title="Chat Wallpaper" subtitle="Pick a background style for conversations" showBack />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Live Preview Box */}
          <View style={styles.previewBoxWrapper}>
            <LinearGradient
              colors={selectedWallpaper.colors as [string, string]}
              style={styles.previewBox}
            >
              {/* Mock Chat Bubble inside preview */}
              <View style={styles.mockChatOther}>
                <Text style={styles.mockChatText}>Hey! Sing that song from earlier 🎵</Text>
              </View>

              <View style={styles.mockChatOwn}>
                <Text style={styles.mockChatOwnLabel}>🎵 Singing note (0:15)</Text>
                <View style={styles.mockWaveform}>
                  {[12, 24, 18, 30, 20, 15, 28, 14, 22, 10].map((h, i) => (
                    <View
                      key={i}
                      style={{
                        width: 3,
                        height: h,
                        backgroundColor: '#FFFFFF',
                        borderRadius: 2,
                      }}
                    />
                  ))}
                </View>
              </View>
            </LinearGradient>
          </View>

          <Text style={styles.sectionHeading}>Theme Presets</Text>

          <View style={styles.grid}>
            {WALLPAPERS.map((wp) => {
              const isSelected = selectedWallpaper.id === wp.id;
              return (
                <TouchableOpacity
                  key={wp.id}
                  style={[styles.gridItem, isSelected && styles.gridItemSelected]}
                  onPress={() => setSelectedWallpaper(wp)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={wp.colors as [string, string]}
                    style={styles.thumbnail}
                  >
                    {isSelected && (
                      <View style={styles.selectedBadge}>
                        <Text style={styles.selectedCheck}>✓</Text>
                      </View>
                    )}
                  </LinearGradient>
                  <Text style={[styles.wpName, isSelected && styles.wpNameSelected]}>
                    {wp.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Apply Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.85}>
            <LinearGradient
              colors={['#1677FF', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.applyGradient}
            >
              <Text style={styles.applyBtnText}>Apply to Chats</Text>
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
    backgroundColor: '#F8FBFF',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 110,
  },
  previewBoxWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(22, 119, 255, 0.15)',
    shadowColor: '#1677FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  previewBox: {
    height: 180,
    padding: 20,
    justifyContent: 'space-around',
  },
  mockChatOther: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignSelf: 'flex-start',
    maxWidth: '75%',
    borderWidth: 1,
    borderColor: 'rgba(22, 119, 255, 0.10)',
    shadowColor: '#1677FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  mockChatText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
  },
  mockChatOwn: {
    backgroundColor: '#1677FF',
    borderRadius: 16,
    padding: 12,
    alignSelf: 'flex-end',
    maxWidth: '80%',
    gap: 8,
  },
  mockChatOwnLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: '#FFFFFF',
  },
  mockWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
  },
  sectionHeading: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.text.primary,
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(22, 119, 255, 0.10)',
    shadowColor: '#1677FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  gridItemSelected: {
    borderColor: Colors.brand.blue,
    borderWidth: 2,
  },
  thumbnail: {
    height: 90,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedCheck: {
    color: Colors.brand.blue,
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
  wpName: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    paddingBottom: 4,
  },
  wpNameSelected: {
    color: Colors.brand.blue,
    fontFamily: FontFamily.bold,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(22, 119, 255, 0.08)',
  },
  applyBtn: {
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  applyGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  applyBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: '#FFFFFF',
  },
});
