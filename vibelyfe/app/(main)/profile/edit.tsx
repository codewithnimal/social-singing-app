// Vibely — Edit Profile Screen
// Integrated with useAuth(), soft light theme

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
import { TextInput } from '../../../src/components/inputs/Inputs';
import { useAuth } from '../../../src/context/AuthContext';

function Avatar({ name, size = 90 }: { name: string; size?: number }) {
  const initial = name?.charAt(0)?.toUpperCase() ?? '?';
  const colors: Array<[string, string]> = [
    ['#1677FF', '#8B5CF6'],
    ['#E83E8C', '#8B5CF6'],
    ['#1677FF', '#3B82F6'],
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

export default function EditProfileScreen() {
  const { user } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState('Singing vibes with friends 🎵');
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    if (!username.trim()) {
      Alert.alert('Required Field', 'Username cannot be empty.');
      return;
    }

    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      Alert.alert('Saved', 'Profile settings updated locally.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }, 400);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#F8FBFF', '#F0F6FF']} style={StyleSheet.absoluteFill} />
      <View style={styles.container}>
        <ScreenHeader title="Edit Profile" showBack />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Avatar edit section */}
          <View style={styles.avatarSection}>
            <Avatar name={username || 'User'} size={90} />
            <TouchableOpacity style={styles.changePhotoBtn} activeOpacity={0.8}>
              <Text style={styles.changePhotoText}>Change Avatar</Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            <TextInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              autoCapitalize="none"
            />

            <TextInput
              label="Bio / Status"
              value={bio}
              onChangeText={setBio}
              placeholder="Write a short singing bio..."
              multiline
              numberOfLines={3}
            />

            <View style={styles.readOnlySection}>
              <Text style={styles.readOnlyLabel}>Email (Backend Account)</Text>
              <Text style={styles.readOnlyValue}>{user?.email || 'N/A'}</Text>
            </View>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#1677FF', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveGradient}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
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
    gap: 20,
    paddingBottom: 100,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  changePhotoBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(22, 119, 255, 0.15)',
    shadowColor: '#1677FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  changePhotoText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.brand.blue,
  },
  form: {
    gap: 16,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(22, 119, 255, 0.08)',
    shadowColor: '#1677FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  readOnlySection: {
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(22, 119, 255, 0.06)',
  },
  readOnlyLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  readOnlyValue: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
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
  saveBtn: {
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  saveGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  saveBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: '#FFFFFF',
  },
});
