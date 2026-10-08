// Vibely — Component: PhotoSelectionModal
// Bottom sheet modal for selecting profile photo (Camera, Gallery, Presets, Remove)

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../theme/colors';
import { FontFamily, FontSize } from '../../theme/typography';
import { Radius } from '../../theme/radius';
import { PRESET_AVATARS, avatarService } from '../../services/avatarService';

interface PhotoSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onAvatarChanged: (avatarUriOrPreset: string | null) => void;
  hasCurrentPhoto: boolean;
}

export function PhotoSelectionModal({
  visible,
  onClose,
  onAvatarChanged,
  hasCurrentPhoto,
}: PhotoSelectionModalProps) {
  const [showPresetsView, setShowPresetsView] = useState(false);

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission',
          'Camera access is required to take a profile photo. Please enable it in Settings.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        const uri = result.assets[0].uri;
        await avatarService.setAvatar(uri);
        onAvatarChanged(uri);
        onClose();
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not launch camera.');
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Photo Library Permission',
          'Photo gallery access is required to choose a profile photo. Please enable it in Settings.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        const uri = result.assets[0].uri;
        await avatarService.setAvatar(uri);
        onAvatarChanged(uri);
        onClose();
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not select photo.');
    }
  };

  const handleSelectPreset = async (presetId: string) => {
    await avatarService.setAvatar(presetId);
    onAvatarChanged(presetId);
    setShowPresetsView(false);
    onClose();
  };

  const handleRemovePhoto = async () => {
    await avatarService.removeAvatar();
    onAvatarChanged(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handleBar} />

          <Text style={styles.title}>
            {showPresetsView ? 'Choose Vibely Avatar' : 'Profile Photo'}
          </Text>

          {showPresetsView ? (
            <View style={styles.presetsContainer}>
              <View style={styles.presetsGrid}>
                {PRESET_AVATARS.map((preset) => (
                  <TouchableOpacity
                    key={preset.id}
                    style={styles.presetItem}
                    onPress={() => handleSelectPreset(preset.id)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={preset.gradient}
                      style={styles.presetCircle}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.presetEmoji}>{preset.emoji}</Text>
                    </LinearGradient>
                    <Text style={styles.presetName} numberOfLines={1}>
                      {preset.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.backOptionBtn}
                onPress={() => setShowPresetsView(false)}
              >
                <Text style={styles.backOptionText}>← Back to Options</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.optionsList}>
              <TouchableOpacity
                style={styles.optionRow}
                onPress={handleTakePhoto}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(22, 119, 255, 0.1)' }]}>
                  <Text style={styles.optionIcon}>📷</Text>
                </View>
                <Text style={styles.optionText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionRow}
                onPress={handlePickFromGallery}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                  <Text style={styles.optionIcon}>🖼️</Text>
                </View>
                <Text style={styles.optionText}>Choose from Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => setShowPresetsView(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(232, 62, 140, 0.14)' }]}>
                  <Text style={styles.optionIcon}>👤</Text>
                </View>
                <Text style={styles.optionText}>Choose Avatar</Text>
              </TouchableOpacity>

              {hasCurrentPhoto && (
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={handleRemovePhoto}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                    <Text style={styles.optionIcon}>🗑️</Text>
                  </View>
                  <Text style={[styles.optionText, { color: '#EF4444' }]}>Remove Photo</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 34,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  optionsList: {
    gap: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Radius.lg,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: 'rgba(22, 119, 255, 0.08)',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionIcon: {
    fontSize: 20,
  },
  optionText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.text.primary,
  },
  cancelBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: Radius.full,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  cancelText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.text.secondary,
  },
  presetsContainer: {
    gap: 16,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  presetItem: {
    width: '30%',
    alignItems: 'center',
    padding: 10,
    borderRadius: Radius.lg,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: 'rgba(22, 119, 255, 0.08)',
  },
  presetCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  presetEmoji: {
    fontSize: 26,
  },
  presetName: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  backOptionBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  backOptionText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.brand.blue,
  },
});
