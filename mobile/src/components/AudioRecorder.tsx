import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import {
  useAudioRecorder,
  RecordingPresets,
  createAudioPlayer,
  AudioPlayer,
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
  setIsAudioActiveAsync,
} from 'expo-audio';
// Use the legacy API to keep downloadAsync available (new API lacks header support)
import * as FileSystem from 'expo-file-system/legacy';
import apiClient from '../api/client';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

type EffectKey = 'original' | 'baby' | 'cattish' | 'deep' | 'echo';

interface EffectDef {
  label: string;
  key: EffectKey;
}

const EFFECTS: EffectDef[] = [
  { key: 'original', label: 'Original' },
  { key: 'baby',     label: '🍼 Baby Voice' },
  { key: 'cattish',  label: '🐱 Cattish Purr' },
  { key: 'deep',     label: '🐻 Deep Voice' },
  { key: 'echo',     label: '🏟️ Stadium Echo' },
];

// Base URL without /api/v1 suffix for constructing download URLs
function getServerBase(): string {
  const base = apiClient.defaults.baseURL ?? 'http://localhost:8000/api/v1';
  return base.replace(/\/api\/v1\/?$/, '');
}

// ------------------------------------------------------------------
// Audio processing helpers
// ------------------------------------------------------------------

// Removed local offline audio context rendering. Processing is now strictly backend-driven.

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------

export const AudioRecorder = ({ onSend }: { onSend?: (uri: string) => Promise<void> }) => {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const playerRef = useRef<AudioPlayer | null>(null);
  const [originalUri, setOriginalUri] = useState<string | null>(null);


  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [selectedEffect, setSelectedEffect] = useState<EffectKey>('original');
  const [processedUris, setProcessedUris] = useState<Partial<Record<EffectKey, string>>>({});

  // Cleanup player on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.remove();
        playerRef.current = null;
      }
    };
  }, []);

  // ------------------------------------------------------------------
  // Recording
  // ------------------------------------------------------------------

  async function startRecording() {
    try {
      const currentPerm = await getRecordingPermissionsAsync();
      if (!currentPerm.granted) {
        const { granted } = await requestRecordingPermissionsAsync();
        if (!granted) {
          Alert.alert('Permission Denied', 'Microphone permission is required.');
          return;
        }
      }

      await setIsAudioActiveAsync(true);
      await recorder.prepareToRecordAsync();
      recorder.record();

      setIsRecording(true);
      setOriginalUri(null);
      setProcessedUris({});
      setSelectedEffect('original');
    } catch (err) {
      console.error('startRecording error', err);
      Alert.alert('Recording Error', 'Could not start the microphone. Please try again.');
    }
  }

  async function stopRecording() {
    try {
      setIsRecording(false);
      await recorder.stop();
      const uri = recorder.uri;
      setOriginalUri(uri ?? null);
    } catch (err) {
      console.error('stopRecording error', err);
    }
  }

  // ------------------------------------------------------------------
  // Playback
  // ------------------------------------------------------------------

  async function playUri(uri: string | null) {
    if (!uri) return;
    try {
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.remove();
        playerRef.current = null;
      }
      setIsPlaying(true);
      const newPlayer = createAudioPlayer(uri);
      playerRef.current = newPlayer;
      newPlayer.addListener('playbackStatusUpdate', (status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
      newPlayer.play();
    } catch (err) {
      console.error('playUri error', err);
      setIsPlaying(false);
      Alert.alert('Playback Error', 'Could not play the audio file.');
    }
  }

  // ------------------------------------------------------------------
  // Effect processing
  // ------------------------------------------------------------------

  async function selectEffect(effect: EffectKey) {
    if (isProcessing) return; // guard against rapid taps
    setSelectedEffect(effect);

    if (effect === 'original') return; // nothing to generate

    // Already generated — skip
    if (processedUris[effect]) return;

    if (!originalUri) {
      Alert.alert('No Recording', 'Please record something first.');
      return;
    }

    setIsProcessing(true);
    try {
      // ── Step 1: Upload original recording to backend ──────────────
      const filename = originalUri.split('/').pop() || 'recording.m4a';
      // Detect MIME from extension (.m4a / .mp4 / .wav)
      const ext = filename.split('.').pop()?.toLowerCase();
      const mime = ext === 'wav' ? 'audio/wav' : ext === 'mp4' ? 'audio/mp4' : 'audio/m4a';

      const formData = new FormData();
      formData.append('file', { uri: originalUri, name: filename, type: mime } as any);
      formData.append('effect_id', effect);

      // Auth header is already on apiClient.defaults — axios merges it automatically.
      // We only override Content-Type so axios sets the correct multipart boundary.
      const uploadRes = await apiClient.post('/audio/effects/apply', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000, // 30s — processing heavy audio can take a moment
      });

      const serverUrl: string = uploadRes.data.url;
      if (!serverUrl) throw new Error('Server returned no preview URL');

      // ── Step 2: Download the processed WAV for local playback ──────
      const serverBase = getServerBase();
      const fullUrl = `${serverBase}${serverUrl}`;

      // Use a unique filename per recording session to avoid stale cache
      const sessionId = Date.now();
      const docDir = FileSystem.documentDirectory ?? '';
      const localPath = `${docDir}preview_${effect}_${sessionId}.wav`;

      const authHeader = apiClient.defaults.headers.common['Authorization'] as string;
      const downloadRes = await FileSystem.downloadAsync(fullUrl, localPath, {
        headers: { Authorization: authHeader },
      });

      if (downloadRes.status !== 200) {
        throw new Error(`Preview download failed with status ${downloadRes.status}`);
      }

      // Sanity-check: make sure we got actual audio bytes, not an HTML error page
      const info = await FileSystem.getInfoAsync(downloadRes.uri);
      if (!info.exists || (info as any).size === 0) {
        throw new Error('Downloaded preview file is empty');
      }

      setProcessedUris((prev) => ({ ...prev, [effect]: downloadRes.uri }));
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? err?.message ?? String(err);
      console.error(`Effect ${effect} failed:`, detail);
      Alert.alert('Processing Failed', `Could not apply the ${effect} effect.\n\n${detail}`);
      setSelectedEffect('original');
    } finally {
      setIsProcessing(false);
    }
  }

  // ------------------------------------------------------------------
  // Final selection
  // ------------------------------------------------------------------

  const [finalUri, setFinalUri] = useState<string | null>(null);

  async function chooseFinal() {
    const uri = selectedEffect === 'original'
      ? originalUri
      : (processedUris[selectedEffect] ?? null);
    
    if (uri) {
      setFinalUri(uri);
      if (onSend) {
        setIsSending(true);
        try {
          await onSend(uri);
          // Reset after send
          setOriginalUri(null);
          setProcessedUris({});
          setSelectedEffect('original');
          setFinalUri(null);
          Alert.alert("Success", "Audio message sent!");
        } catch (error: any) {
          console.error("Upload error:", error.response?.data || error);
          Alert.alert("Send Failed", "Could not upload the audio message.");
        } finally {
          setIsSending(false);
        }
      }
    }
  }

  // ------------------------------------------------------------------
  // Computed helpers
  // ------------------------------------------------------------------

  const currentPreviewUri =
    selectedEffect === 'original'
      ? originalUri
      : (processedUris[selectedEffect] ?? null);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.container}>
        <Text style={styles.title}>Your Recording 🎙️</Text>

        {/* Record controls */}
        <TouchableOpacity
          style={[styles.btn, isRecording ? styles.btnRed : styles.btnBlue]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
        >
          <Text style={styles.btnText}>
            {isRecording ? '⏹  Stop Recording' : '🎙  Start Recording'}
          </Text>
        </TouchableOpacity>

        {/* Play original */}
        {originalUri && (
          <TouchableOpacity
            style={[styles.btn, styles.btnGreen, (isPlaying || isProcessing) && styles.btnDisabled]}
            onPress={() => playUri(originalUri)}
            disabled={isPlaying || isProcessing}
          >
            <Text style={styles.btnText}>▶  Play Original</Text>
          </TouchableOpacity>
        )}

        {/* Effects */}
        {originalUri && (
          <>
            <Text style={styles.subtitle}>Voice Effects</Text>

            <View style={styles.effectGrid}>
              {EFFECTS.map((e) => {
                const isSelected = selectedEffect === e.key;
                const isDone = e.key === 'original' || !!processedUris[e.key];
                return (
                  <TouchableOpacity
                    key={e.key}
                    style={[
                      styles.effectBtn,
                      isSelected && styles.effectBtnSelected,
                      isProcessing && !isSelected && styles.btnDisabled,
                    ]}
                    onPress={() => selectEffect(e.key)}
                    disabled={isProcessing && !isSelected}
                  >
                    <Text style={[styles.effectBtnText, isSelected && styles.effectBtnTextSel]}>
                      {e.label}
                      {isDone && e.key !== 'original' ? ' ✓' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Processing indicator */}
            {isProcessing && (
              <View style={styles.processingRow}>
                <ActivityIndicator color="#3b82f6" />
                <Text style={styles.processingText}>
                  Applying {selectedEffect} effect…
                </Text>
              </View>
            )}

            {/* Preview */}
            {!isProcessing && currentPreviewUri && (
              <TouchableOpacity
                style={[styles.btn, styles.btnPurple, isPlaying && styles.btnDisabled]}
                onPress={() => playUri(currentPreviewUri)}
                disabled={isPlaying}
              >
                <Text style={styles.btnText}>
                  ▶  Preview ({selectedEffect})
                </Text>
              </TouchableOpacity>
            )}

            {/* Processing pending message */}
            {!isProcessing && !currentPreviewUri && selectedEffect !== 'original' && (
              <Text style={styles.hintText}>
                Tap "{EFFECTS.find(e => e.key === selectedEffect)?.label}" above to generate
              </Text>
            )}

            {/* Select final */}
            {!isProcessing && currentPreviewUri && (
              <TouchableOpacity 
                style={[styles.btn, styles.btnAmber, isSending && styles.btnDisabled]} 
                onPress={chooseFinal}
                disabled={isSending}
              >
                {isSending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>{onSend ? "🚀 Send Message" : "[ Use This ]"}</Text>
                )}
              </TouchableOpacity>
            )}

            {/* Final chosen (if no onSend provided) */}
            {finalUri && !onSend && (
              <View style={styles.finalBox}>
                <Text style={styles.finalText}>✅ Final audio selected!</Text>
                <Text style={styles.finalPath} numberOfLines={2}>{finalUri}</Text>
                <Text style={styles.finalHint}>Ready for Phase 7 upload.</Text>
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
};

// ------------------------------------------------------------------
// Styles
// ------------------------------------------------------------------

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, alignItems: 'center' },
  container: {
    width: '90%',
    backgroundColor: '#1E1E2E',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    alignItems: 'center',
  },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  subtitle: { color: '#E5E7EB', fontSize: 15, fontWeight: '600', marginTop: 20, marginBottom: 10 },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 5,
    width: '100%',
  },
  btnBlue:     { backgroundColor: '#3b82f6' },
  btnRed:      { backgroundColor: '#ef4444' },
  btnGreen:    { backgroundColor: '#10b981' },
  btnPurple:   { backgroundColor: '#8b5cf6' },
  btnAmber:    { backgroundColor: '#f59e0b' },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  effectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 12,
  },
  effectBtn: {
    backgroundColor: '#374151',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  effectBtnSelected: { backgroundColor: '#3b82f6' },
  effectBtnText:    { color: '#9CA3AF', fontWeight: '500' },
  effectBtnTextSel: { color: '#fff' },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  processingText: { color: '#9CA3AF', marginLeft: 10 },
  hintText: { color: '#6B7280', marginVertical: 8, fontStyle: 'italic' },
  finalBox: {
    marginTop: 16,
    backgroundColor: '#052e16',
    borderRadius: 10,
    padding: 14,
    width: '100%',
    alignItems: 'center',
  },
  finalText: { color: '#4ade80', fontWeight: 'bold', fontSize: 15 },
  finalPath: { color: '#6ee7b7', fontSize: 11, marginTop: 6, textAlign: 'center' },
  finalHint: { color: '#86efac', marginTop: 4, fontSize: 12 },
});
