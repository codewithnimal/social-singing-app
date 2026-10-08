// Vibely — Profile Screen
// Real backend user profile from useAuth(), preferences & settings links

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../../src/theme/colors';
import { FontFamily, FontSize } from '../../../src/theme/typography';
import { useAuth } from '../../../src/context/AuthContext';
import { Avatar } from '../../../src/components/profile/Avatar';
import { PhotoSelectionModal } from '../../../src/components/profile/PhotoSelectionModal';
import { avatarService } from '../../../src/services/avatarService';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  useEffect(() => {
    avatarService.getAvatar().then((stored) => {
      if (stored) setAvatarUri(stored);
    });
  }, []);

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of Vibely?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/auth/login' as any);
        },
      },
    ]);
  };

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#F8FBFF', '#F0F6FF']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity
          onPress={() => router.push('/(main)/profile/settings' as any)}
          style={styles.settingsHeaderBtn}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* User Hero Card */}
        <View style={styles.userCard}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={() => setShowPhotoModal(true)}
            activeOpacity={0.85}
          >
            <Avatar
              name={user?.username || 'Vibely User'}
              avatarUrl={avatarUri}
              size={92}
            />
            <View style={styles.cameraBadge}>
              <Text style={styles.cameraBadgeIcon}>📷</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowPhotoModal(true)}
            style={styles.changePhotoPill}
            activeOpacity={0.7}
          >
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>

          <Text style={styles.userName}>{user?.username || 'Vibely Singer'}</Text>
          <Text style={styles.userHandle}>@{user?.username || 'user'}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>

          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => router.push('/(main)/profile/edit' as any)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#1677FF', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.editProfileGradient}
            >
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <PhotoSelectionModal
          visible={showPhotoModal}
          onClose={() => setShowPhotoModal(false)}
          onAvatarChanged={(newUri) => setAvatarUri(newUri)}
          hasCurrentPhoto={!!avatarUri}
        />

        {/* Preferences Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.menuHeading}>Preferences & Setup</Text>

          <TouchableOpacity
            onPress={() => router.push('/(main)/profile/wallpaper' as any)}
            activeOpacity={0.7}
            style={styles.menuItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.12)' }]}>
              <Text style={styles.menuIcon}>🎨</Text>
            </View>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Chat Theme & Wallpaper</Text>
              <Text style={styles.menuSubtitle}>Customize chat background styles</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(main)/profile/notifications' as any)}
            activeOpacity={0.7}
            style={styles.menuItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(22, 119, 255, 0.12)' }]}>
              <Text style={styles.menuIcon}>🔔</Text>
            </View>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Notifications</Text>
              <Text style={styles.menuSubtitle}>Voice note alerts & friend vibes</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(main)/profile/settings' as any)}
            activeOpacity={0.7}
            style={styles.menuItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(232, 62, 140, 0.16)' }]}>
              <Text style={styles.menuIcon}>🎚️</Text>
            </View>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Audio & Voice Quality</Text>
              <Text style={styles.menuSubtitle}>Vocal DSP presets & recording quality</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(main)/friends' as any)}
            activeOpacity={0.7}
            style={styles.menuItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
              <Text style={styles.menuIcon}>👥</Text>
            </View>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Friends Management</Text>
              <Text style={styles.menuSubtitle}>Manage connections & invitations</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: FontFamily.bold,
    color: Colors.text.primary,
  },
  settingsHeaderBtn: {
    padding: 6,
  },
  settingsIcon: {
    fontSize: 22,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    alignItems: 'center',
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(22, 119, 255, 0.10)',
    shadowColor: '#1677FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarWrapper: {
    marginBottom: 12,
    position: 'relative',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1677FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cameraBadgeIcon: {
    fontSize: 13,
  },
  changePhotoPill: {
    backgroundColor: 'rgba(22, 119, 255, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(22, 119, 255, 0.18)',
  },
  changePhotoText: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: Colors.brand.blue,
  },
  userName: {
    fontSize: 20,
    fontFamily: FontFamily.bold,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  userHandle: {
    fontSize: 14,
    fontFamily: FontFamily.medium,
    color: Colors.brand.blue,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.text.secondary,
    marginBottom: 16,
  },
  editProfileBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  editProfileGradient: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
  },
  editProfileText: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    color: '#FFFFFF',
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(22, 119, 255, 0.08)',
    shadowColor: '#1677FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  menuHeading: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginVertical: 8,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(22, 119, 255, 0.06)',
  },
  menuIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 18,
  },
  menuInfo: {
    flex: 1,
    marginLeft: 14,
  },
  menuTitle: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    color: Colors.text.primary,
  },
  menuSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  menuArrow: {
    fontSize: 22,
    color: Colors.text.muted,
    marginRight: 4,
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.20)',
  },
  logoutText: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    color: Colors.status.error,
  },
});
