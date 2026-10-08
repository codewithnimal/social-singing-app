// Vibely — Service: Audio

import {
  AudioModule,
  AudioPlayer,
  RecordingPresets,
  createAudioPlayer,
  setAudioModeAsync,
} from 'expo-audio';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { AudioEffect, AudioEffectId } from '../types';
import { AUDIO_EFFECTS } from '../constants/effects';
import { generateWaveform } from '../mock/messages';
import { effectsApi } from '../api/effectsApi';
import { tokenStore } from '../api/apiClient';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export interface RecordedAudioFile {
  uri: string;
  duration: number;
  waveformData: number[];
  effect: AudioEffect;
}

let _recorder: InstanceType<typeof AudioModule.AudioRecorder> | null = null;
let _recordingTimer: ReturnType<typeof setInterval> | null = null;
let _recordingDuration = 0;
let _playbackPlayer: AudioPlayer | null = null;
let _playbackSubscription: { remove: () => void } | null = null;
let _isPlaying = false;
let _currentPlayingUri: string | null = null;

let _lastRecordedFile: RecordedAudioFile | null = null;

/**
 * In Expo Go on Android, local files are stored in a directory named with the URL-encoded
 * project experience ID (e.g. `%40anonymous%2Fvibely-...`).
 *
 * When navigating across Expo Router screens (`/singing/effects` -> `/singing/preview`),
 * route parameters pass through URL search strings and get automatically decoded
 * (`%2540` -> `%40` -> `@` and `%252F` -> `%2F` -> `/`).
 *
 * When that happens, the physical directory on disk no longer matches the decoded string,
 * causing Android's ExoPlayer to fail with `Source error` (file not found).
 *
 * This function repairs the URI by restoring `%2540` and `%252F` so ExoPlayer can locate the file.
 */
export function repairAndroidExperienceDataUri(uri: string): string {
  if (Platform.OS !== 'android' || !uri) return uri;
  return uri.replace(
    /\/ExperienceData\/(@|%40)([^/%]+)(\/|%2F)/g,
    (_, _at, name) => `/ExperienceData/%2540${name}%252F`
  );
}

// ─── Error Classification ────────────────────────────────────────────────────
//
// All errors thrown/passed from this service carry one of these codes on their
// `.code` property so callers can branch without string-matching the message.
//
//   AUDIO_PERMISSION_DENIED      — microphone permission not granted
//   AUDIO_NO_ACTIVE_RECORDING    — stop/cancel called when nothing is recording
//   AUDIO_RECORD_FAILED          — MediaRecorder.start() / prepare failed
//   AUDIO_EMPTY_OUTPUT           — recording produced no file (empty URI)
//   AUDIO_MOCK_URI               — tried to play a mock:// placeholder URI
//   AUDIO_SOURCE_ERROR           — ExoPlayer ProgressiveMediaSource can't read
//                                  the file (wrong codec, empty file, bad path)
//   AUDIO_URI_BAD_ENCODING       — URI decoding produced an unusable string
//   AUDIO_MODE_FAILED            — setAudioModeAsync() rejected
//   AUDIO_PLAYER_INIT_FAILED     — createAudioPlayer() threw synchronously
//

export class AudioServiceError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'AudioServiceError';
    this.code = code;
  }
}

/** Classify an opaque ExoPlayer/AVPlayer status.error string */
function classifyStatusError(rawError: string): AudioServiceError {
  const lower = rawError.toLowerCase();
  if (
    lower.includes('source error') ||
    lower.includes('unrecognizedinputformat') ||
    lower.includes('datasource') ||
    lower.includes('failed to load')
  ) {
    return new AudioServiceError(
      'AUDIO_SOURCE_ERROR',
      `Playback failed: the audio file could not be read by the media player. ` +
        `This usually means the recording codec is mismatched or the file is ` +
        `incomplete. Try recording again. (raw: ${rawError})`
    );
  }
  if (lower.includes('not found') || lower.includes('enoent') || lower.includes('no such file')) {
    return new AudioServiceError(
      'AUDIO_SOURCE_ERROR',
      `Playback failed: the audio file no longer exists on device. ` +
        `It may have been cleared from the cache. (raw: ${rawError})`
    );
  }
  if (lower.includes('permission')) {
    return new AudioServiceError(
      'AUDIO_PERMISSION_DENIED',
      `Playback failed: storage or audio permission denied. (raw: ${rawError})`
    );
  }
  // Fallback
  return new AudioServiceError('AUDIO_SOURCE_ERROR', rawError);
}

/**
 * Build flat, platform-specific recording options from the cross-platform shape.
 * This mirrors what expo-audio's internal createRecordingOptions() does, ensuring
 * the Kotlin/Swift constructors receive the correct flat structure.
 */
function buildPlatformRecordingOptions(): Record<string, unknown> {
  const common = {
    extension: '.m4a',
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
    isMeteringEnabled: true,
  };

  if (Platform.OS === 'android') {
    return {
      ...common,
      // Android MediaRecorder expects these at the TOP level (flat)
      outputFormat: 'mpeg4',
      audioEncoder: 'aac',
    };
  }

  if (Platform.OS === 'ios') {
    return {
      ...common,
      // iOS AVFoundation output format code (4-char code, trailing space is intentional)
      outputFormat: 'aac ',
      audioQuality: 0x7f, // AudioQuality.MAX
    };
  }

  // Web / other
  return common;
}

/**
 * Full cross-platform shape (needed for prepareToRecordAsync which calls
 * expo-audio's createRecordingOptions() shim internally).
 */
const FULL_RECORDING_OPTIONS = {
  extension: '.m4a',
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 128000,
  isMeteringEnabled: true,
  android: {
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
  },
  ios: {
    outputFormat: 'aac ',
    audioQuality: 0x7f,
  },
} as const;

/**
 * Downloads a backend-served effect audio URL (which requires an Authorization header)
 * to a local temp file and returns the local file:// URI.
 *
 * ExoPlayer (Android) and AVPlayer (iOS) cannot attach Bearer tokens when playing
 * an http:// URL directly — the server returns 403 and the player reports "Source error".
 * Downloading first gives us a file:// URI that the player can read without any auth.
 */
async function downloadEffectAudio(remoteUrl: string): Promise<string> {
  const token = await tokenStore.get();
  const filename = `effect_preview_${Date.now()}.wav`;
  const cacheRoot = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '';
  const localUri = `${cacheRoot}${filename}`;

  const result = await FileSystem.downloadAsync(remoteUrl, localUri, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (result.status < 200 || result.status >= 300) {
    throw new AudioServiceError(
      'AUDIO_SOURCE_ERROR',
      `Failed to download effect preview (HTTP ${result.status}). Check your network or re-apply the effect.`
    );
  }

  return result.uri;
}

export const audioService = {
  // ─── Recording ─────────────────────────────────────────────────────────────

  async requestMicrophonePermission(): Promise<boolean> {
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    return permission.granted;
  },

  async startRecording(onTick: (duration: number, waveformBar: number) => void): Promise<void> {
    if (_recorder) {
      await this.cancelRecording();
    }

    if (!(await this.requestMicrophonePermission())) {
      throw new AudioServiceError(
        'AUDIO_PERMISSION_DENIED',
        'Microphone permission was denied. Please allow access in device settings.'
      );
    }

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    }).catch((err) => {
      console.warn('[AudioService] setAudioModeAsync(record) failed:', err);
    });

    _recordingDuration = 0;

    // Build the flat, platform-specific options for the native constructor.
    // The constructor does NOT go through expo-audio's createRecordingOptions shim.
    const platformOptions = buildPlatformRecordingOptions();
    console.log('[AudioService] startRecording platformOptions:', JSON.stringify(platformOptions));

    let recorder: InstanceType<typeof AudioModule.AudioRecorder>;
    try {
      recorder = new AudioModule.AudioRecorder(platformOptions as any);
    } catch (err: unknown) {
      throw new AudioServiceError(
        'AUDIO_RECORD_FAILED',
        `Failed to create AudioRecorder: ${err instanceof Error ? err.message : String(err)}`
      );
    }
    _recorder = recorder;

    try {
      // prepareToRecordAsync goes through the expo-audio shim which calls
      // createRecordingOptions() internally — the FULL nested shape is correct here.
      await recorder.prepareToRecordAsync(FULL_RECORDING_OPTIONS as any);
      recorder.record();
    } catch (error) {
      _recorder = null;
      recorder.release();
      throw new AudioServiceError(
        'AUDIO_RECORD_FAILED',
        `Failed to prepare/start recording: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    _recordingTimer = setInterval(() => {
      const status = recorder.getStatus();
      _recordingDuration = status.durationMillis / 1000;
      const bar =
        status.metering === undefined
          ? 0.3
          : Math.max(0.1, Math.min(1, (status.metering + 60) / 60));
      onTick(_recordingDuration, bar);
    }, 100);
  },

  async stopRecording(): Promise<RecordedAudioFile> {
    if (_recordingTimer) {
      clearInterval(_recordingTimer);
      _recordingTimer = null;
    }

    const recorder = _recorder;
    if (!recorder) {
      throw new AudioServiceError(
        'AUDIO_NO_ACTIVE_RECORDING',
        'There is no active recording to stop.'
      );
    }

    let uri: string | null;
    let duration: number;
    try {
      await recorder.stop();
      uri = recorder.uri;
      duration = Math.round(
        recorder.getStatus().durationMillis / 1000 || _recordingDuration
      );
    } finally {
      recorder.release();
      if (_recorder === recorder) {
        _recorder = null;
      }
      // Release the recording audio session immediately so the player can take over
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      }).catch((err) => {
        console.warn('[AudioService] setAudioModeAsync(playback) after stop failed:', err);
      });
    }

    if (!uri) {
      throw new AudioServiceError(
        'AUDIO_EMPTY_OUTPUT',
        'The recording finished without producing an audio file. ' +
          'This may indicate a codec configuration error on this device.'
      );
    }

    console.log('[AudioService] stopRecording uri:', uri, 'duration:', duration!);

    const recordingId = `recording-${Date.now()}`;
    const result: RecordedAudioFile = {
      uri,                              // raw, percent-encoded file:// URI — do NOT decode
      duration: Math.max(1, duration!),
      waveformData: generateWaveform(recordingId),
      effect: AUDIO_EFFECTS[0],
    };
    _lastRecordedFile = result;
    return result;
  },

  getLastRecordedFile(): RecordedAudioFile | null {
    return _lastRecordedFile;
  },

  setLastRecordedFile(file: RecordedAudioFile | null): void {
    _lastRecordedFile = file;
  },

  async cancelRecording(): Promise<void> {
    if (_recordingTimer) {
      clearInterval(_recordingTimer);
      _recordingTimer = null;
    }

    const recorder = _recorder;
    _recorder = null;
    _recordingDuration = 0;

    if (recorder) {
      try {
        if (recorder.isRecording) {
          await recorder.stop();
        }
      } finally {
        recorder.release();
      }
    }
  },

  async applyEffect(file: RecordedAudioFile, effectId: AudioEffectId): Promise<RecordedAudioFile> {
    const effect = AUDIO_EFFECTS.find((e) => e.id === effectId) ?? AUDIO_EFFECTS[0];

    // If original, no processing needed.
    if (effectId === 'original') {
      const updated = { ...file, effect };
      if (_lastRecordedFile?.uri === file.uri) {
        _lastRecordedFile = updated;
      }
      return updated;
    }

    try {
      console.log(`[AudioService] Applying backend effect '${effectId}'...`);
      const res = await effectsApi.applyEffect(file.uri, effectId);
      if (!res?.url) {
        throw new AudioServiceError(
          'AUDIO_SOURCE_ERROR',
          `The audio effect service did not return a preview URL for '${effectId}'.`
        );
      }

      const remoteUrl = effectsApi.getEffectServeUrl(res.url);
      console.log(`[AudioService] Backend effect applied, downloading locally: ${remoteUrl}`);

      // ExoPlayer / AVPlayer cannot pass auth headers when given an http:// URL.
      // Download the processed WAV to a local temp file so the player reads a
      // file:// URI with no authentication required.
      const localUri = await downloadEffectAudio(remoteUrl);
      console.log(`[AudioService] Effect audio cached locally: ${localUri}`);

      const updated: RecordedAudioFile = {
        ...file,
        uri: localUri,
        effect,
      };
      _lastRecordedFile = updated;
      return updated;
    } catch (err) {
      const message =
        err instanceof AudioServiceError
          ? err.message
          : err instanceof Error
            ? err.message
            : `Could not process effect '${effectId}'.`;

      console.error(`[AudioService] Backend effect processing failed for '${effectId}':`, err);
      throw new AudioServiceError('AUDIO_SOURCE_ERROR', message);
    }
  },

  // ─── Playback ──────────────────────────────────────────────────────────────

  playAudio(
    uri: string,
    duration: number,
    onProgress: (progress: number, currentTime: number) => void,
    onComplete: () => void,
    onError?: (error: AudioServiceError) => void
  ): () => void {
    if (!uri || uri.startsWith('mock://')) {
      throw new AudioServiceError(
        'AUDIO_MOCK_URI',
        'This recording does not contain playable audio.'
      );
    }

    // Resolve the actual URI to play:
    const getFileName = (u: string) => u.split('?')[0].split('/').pop() || '';
    const reqFile = getFileName(uri);

    let safeUri = uri;
    if (_lastRecordedFile && getFileName(_lastRecordedFile.uri) === reqFile) {
      safeUri = _lastRecordedFile.uri;
      console.log('[AudioService] playAudio using preserved native recorder URI:', safeUri);
    } else {
      safeUri = repairAndroidExperienceDataUri(uri);
      if (safeUri !== uri) {
        console.log('[AudioService] playAudio repaired ExperienceData URI:', safeUri);
      }
    }

    // If the exact same track is already loaded and paused, resume playback smoothly
    if (_playbackPlayer && _currentPlayingUri === safeUri && !_isPlaying) {
      try {
        _playbackPlayer.play();
        _isPlaying = true;
        return () => this.pausePlayback();
      } catch {
        // Fallback to fresh player if resume fails
      }
    }

    // Otherwise stop any previous player and create fresh instance
    this.stopPlayback();
    _currentPlayingUri = safeUri;

    let player: AudioPlayer | null = null;
    let finished = false;
    let isDisposed = false;

    const dispose = () => {
      if (isDisposed) return;
      isDisposed = true;
      if (_playbackPlayer === player) {
        this.stopPlayback();
      }
    };

    console.log('[AudioService] playAudio safeUri:', safeUri, 'duration:', duration);

    void setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    })
      .catch((err) => {
        console.warn('[AudioService] setAudioModeAsync before play failed:', err);
      })
      .then(() => {
        if (isDisposed) return;
        try {
          player = createAudioPlayer(safeUri, { updateInterval: 100 });
          _playbackPlayer = player;
          _isPlaying = true;

          _playbackSubscription = player.addListener('playbackStatusUpdate', (status) => {
            if (status.error) {
              const classified = classifyStatusError(status.error);
              console.warn(
                `[AudioService] playbackStatusUpdate error [${classified.code}]:`,
                classified.message
              );
              dispose();
              onError?.(classified);
              return;
            }

            _isPlaying = status.playing;

            const totalDuration = status.duration || duration;
            if (status.isLoaded && totalDuration > 0) {
              onProgress(
                Math.min(status.currentTime / totalDuration, 1),
                status.currentTime
              );
            }

            if (status.didJustFinish && !finished) {
              finished = true;
              _isPlaying = false;
              _currentPlayingUri = null;
              dispose();
              onComplete();
            }
          });

          player.play();
        } catch (err: unknown) {
          const wrapped = new AudioServiceError(
            'AUDIO_PLAYER_INIT_FAILED',
            `Player could not be initialised: ${err instanceof Error ? err.message : String(err)}`
          );
          console.warn('[AudioService] createAudioPlayer threw:', wrapped.message);
          dispose();
          onError?.(wrapped);
        }
      });

    return dispose;
  },

  /** Pauses the currently playing audio without destroying the player position */
  pausePlayback(): void {
    if (_playbackPlayer) {
      try {
        _playbackPlayer.pause();
      } catch (e) {
        console.warn('[AudioService] pause failed:', e);
      }
      _isPlaying = false;
    }
  },

  /** Resumes playback from the current paused position */
  resumePlayback(): void {
    if (_playbackPlayer && !_isPlaying) {
      try {
        _playbackPlayer.play();
        _isPlaying = true;
      } catch (e) {
        console.warn('[AudioService] resume failed:', e);
      }
    }
  },

  /** Stops playback completely and releases native player resources */
  stopPlayback(): void {
    if (_playbackPlayer) {
      try {
        _playbackPlayer.pause();
      } catch {}
      _playbackSubscription?.remove();
      _playbackSubscription = null;
      try {
        _playbackPlayer.remove();
      } catch {}
      _playbackPlayer = null;
    }
    _isPlaying = false;
    _currentPlayingUri = null;
  },

  isCurrentlyPlaying(): boolean {
    return _isPlaying;
  },

  async sendAudio(
    chatId: string,
    file: RecordedAudioFile,
    onProgress: (progress: number) => void
  ): Promise<string> {
    // Simulate upload with progress
    for (let i = 0; i <= 10; i++) {
      await delay(150);
      onProgress(i / 10);
    }
    return `uploaded://audio/${chatId}/${Date.now()}.m4a`;
  },

  getEffects(): AudioEffect[] {
    return AUDIO_EFFECTS;
  },
};
