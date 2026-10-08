// Vibely — Effects API
// Real backend endpoint: POST /api/v1/audio/effects/apply & GET /serve/{filename}

import { apiClient, API_BASE, tokenStore } from './apiClient';

export interface ApplyEffectResponse {
  url: string;
  effect_id: string;
  status: string;
  processing_time_ms: number;
}

export const effectsApi = {
  /**
   * POST /api/v1/audio/effects/apply
   * Sends the recorded audio to the backend DSP engine (Pedalboard)
   */
  async applyEffect(fileUri: string, effectId: string): Promise<ApplyEffectResponse> {
    const filename = `effect_input_${Date.now()}.m4a`;
    const form = new FormData();
    form.append('file', {
      uri: fileUri,
      name: filename,
      type: 'audio/mp4',
    } as unknown as Blob);
    form.append('effect_id', effectId);

    return apiClient.postForm<ApplyEffectResponse>('/audio/effects/apply', form);
  },

  /**
   * Resolves the full URL for the processed effect audio preview
   */
  getEffectServeUrl(relativeOrFullUrl: string): string {
    if (relativeOrFullUrl.startsWith('http://') || relativeOrFullUrl.startsWith('https://')) {
      return relativeOrFullUrl;
    }
    const baseRoot = API_BASE.replace(/\/api\/v1\/?$/, '');
    if (relativeOrFullUrl.startsWith('/api/v1')) {
      return `${baseRoot}${relativeOrFullUrl}`;
    }
    return `${API_BASE}${relativeOrFullUrl}`;
  },
};
