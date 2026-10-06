import apiClient from './client';
import { Platform } from 'react-native';

export const uploadAudioMessage = async (
  friendId: number, 
  audioUri: string, 
  durationMs: number = 1000,
  clientMsgId?: string
) => {
  const formData = new FormData();
  
  // React Native FormData requires specific properties for files
  const filename = audioUri.split('/').pop() || 'audio.wav';
  formData.append('file', {
    uri: Platform.OS === 'ios' ? audioUri.replace('file://', '') : audioUri,
    name: filename,
    type: 'audio/wav',
  } as any);

  if (clientMsgId) {
    formData.append('client_msg_id', clientMsgId);
  }
  formData.append('audio_duration_ms', durationMs.toString());

  try {
    const response = await apiClient.post(`/chat/audio/${friendId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // Note: axios might need transformRequest to be disabled for FormData in some RN versions
      // but usually it handles it automatically.
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

