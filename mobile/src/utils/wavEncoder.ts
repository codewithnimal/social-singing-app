/**
 * wavEncoder.ts
 *
 * Pure JavaScript PCM-to-WAV encoder.
 * No native dependencies. Works anywhere JavaScript runs.
 *
 * WAV format is: RIFF header + fmt chunk + data chunk.
 * All we do is prepend a 44-byte header to the raw PCM samples.
 *
 * Output: a base64 string of the WAV file, ready for expo-file-system to write.
 */

/**
 * Encodes a mono or stereo AudioBuffer's PCM data into a WAV-format base64 string.
 *
 * @param channelData  Array of Float32Array, one per channel (mono = 1, stereo = 2)
 * @param sampleRate   The sample rate of the audio (e.g. 44100)
 * @returns            Base64-encoded string of the WAV file bytes
 */
export function encodeWav(channelData: Float32Array[], sampleRate: number): string {
  const numChannels = channelData.length;
  const numSamples = channelData[0].length;
  const bitDepth = 16; // 16-bit PCM
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const bufferSize = 44 + dataSize;

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // -- RIFF Chunk Descriptor --
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);    // ChunkSize
  writeString(view, 8, 'WAVE');

  // -- fmt Sub-chunk --
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);              // SubChunk1Size (16 for PCM)
  view.setUint16(20, 1, true);              // AudioFormat = 1 (PCM, linear quantization)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // -- data Sub-chunk --
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // -- PCM Samples --
  // Interleave channels: L, R, L, R, ...
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      // Clamp Float32 (-1.0 to 1.0) to Int16 (-32768 to 32767)
      const sample = Math.max(-1, Math.min(1, channelData[ch][i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return arrayBufferToBase64(buffer);
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // Use global btoa — available in React Native's Hermes engine
  return btoa(binary);
}
