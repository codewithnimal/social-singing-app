// Vibely — Audio Effects API
// Backend PRESETS: baby, cattish, deep, echo
// Reference shows: Original, Soft, Warm, Echo, Studio
// Only 'echo' maps directly. Others (baby, cattish, deep) exposed as-is.
// 'Original' = no effect (local-only, not sent to backend).

import { apiClient, API_BASE } from './apiClient';
import { BackendEffectId, BackendEffectResponse } from './types';
import { tokenStore } from './apiClient';

/** Effect definitions that the backend actually supports */
export const SUPPORTED_EFFECTS: Array<{
  id: BackendEffectId;
  label: string;
  icon: string;
}> = [
  { id: 'echo', label: 'Echo', icon: '🔁' },
  { id: 'baby', label: 'Baby', icon: '👶' },
  { id: 'cattish', label: 'Cattish', icon: '🐱' },
  { id: 'deep', label: 'Deep', icon: '🎚️' },
];

export const audioApi = {
  /**
   * POST /api/v1/audio/effects/apply
   * multipart: file (.wav), effect_id
   * Returns { url, effect_id, status, processing_time_ms }
   */
  async applyEffect(
    fileUri: string,
    filename: string,
    effectId: BackendEffectId
  ): Promise<BackendEffectResponse> {
    const form = new FormData();
    form.append('file', {
      uri: fileUri,
      name: filename,
      type: 'audio/wav',
    } as unknown as Blob);
    form.append('effect_id', effectId);

    return apiClient.postForm<BackendEffectResponse>('/audio/effects/apply', form);
  },

  /**
   * Fetch effect preview audio blob with auth header.
   * The serve URL returned by the effect is relative to API_BASE.
   */
  async fetchEffectPreview(relativeUrl: string): Promise<string> {
    const token = await tokenStore.get();
    const url = relativeUrl.startsWith('http')
      ? relativeUrl
      : `${API_BASE}${relativeUrl.startsWith('/api/v1') ? relativeUrl.replace('/api/v1', '') : relativeUrl}`;

    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      throw new Error(`Effect preview fetch failed: ${response.status}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  },
};
