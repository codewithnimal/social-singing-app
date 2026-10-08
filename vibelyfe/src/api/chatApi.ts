// Vibely — Chat API
// Real backend endpoints for text + audio messages

import { apiClient, API_BASE } from './apiClient';
import { BackendMessageResponse, BackendPaginatedMessages } from './types';
import { tokenStore } from './apiClient';

export const chatApi = {
  /**
   * GET /api/v1/chat/history/{friend_id}?page=&size=
   */
  async history(
    friendId: number,
    page = 1,
    size = 50
  ): Promise<BackendPaginatedMessages> {
    return apiClient.get<BackendPaginatedMessages>(
      `/chat/history/${friendId}?page=${page}&size=${size}`
    );
  },

  /**
   * POST /api/v1/chat/send/{friend_id}
   * Body: { content: string, client_msg_id?: string }
   */
  async sendText(
    friendId: number,
    content: string,
    clientMsgId?: string
  ): Promise<BackendMessageResponse> {
    return apiClient.post<BackendMessageResponse>(`/chat/send/${friendId}`, {
      content,
      client_msg_id: clientMsgId ?? null,
    });
  },

  /**
   * POST /api/v1/chat/audio/{friend_id}
   * multipart: file, client_msg_id?, audio_duration_ms?
   */
  async sendAudio(
    friendId: number,
    fileUri: string,
    filename: string,
    audioDurationMs?: number,
    clientMsgId?: string
  ): Promise<BackendMessageResponse> {
    const form = new FormData();
    form.append('file', {
      uri: fileUri,
      name: filename,
      type: filename.toLowerCase().endsWith('.m4a') ? 'audio/mp4' : 'audio/wav',
    } as unknown as Blob);
    if (clientMsgId) form.append('client_msg_id', clientMsgId);
    if (audioDurationMs !== undefined)
      form.append('audio_duration_ms', String(audioDurationMs));

    return apiClient.postForm<BackendMessageResponse>(`/chat/audio/${friendId}`, form);
  },

  /**
   * Build a URL for serving audio that includes the Bearer token
   * as a query param (since fetch from Audio player doesn't support
   * custom headers easily). The backend serves directly from file system.
   * We pass the token via a custom header in a manual fetch-and-blob approach.
   * Returns the full URL; callers use the authenticated fetchAudioBlob helper.
   */
  getAudioServeUrl(filePath: string): string {
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    const baseRoot = API_BASE.replace(/\/api\/v1\/?$/, '');
    if (filePath.startsWith('/api/v1')) {
      return `${baseRoot}${filePath}`;
    }
    if (filePath.startsWith('/')) {
      return `${API_BASE}${filePath}`;
    }
    return `${API_BASE}/chat/audio/serve/${filePath}`;
  },

  /**
   * Fetch audio blob with auth header — returns a local blob URI.
   * Used before passing to AudioPlayer.
   */
  async fetchAudioBlob(filePath: string): Promise<string> {
    const token = await tokenStore.get();
    const url = chatApi.getAudioServeUrl(filePath);

    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      throw new Error(`Audio fetch failed: ${response.status}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  },
};
