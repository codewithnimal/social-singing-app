import os
import soundfile as sf
import numpy as np
from dataclasses import dataclass
from typing import Dict
from pedalboard import Pedalboard, PitchShift, HighpassFilter, LowpassFilter, Chorus, Distortion, Reverb, Compressor, Delay

@dataclass
class EffectPreset:
    id: str
    name: str
    pitch_shift: float = 0.0 # Semitones
    formant_shift: float = 0.0 # Semitones (Conceptual: achieved implicitly via PitchShift if Formant Shift isn't natively separate)
    eq_highpass_hz: float = 0.0
    eq_lowpass_hz: float = 0.0
    compression_threshold_db: float = 0.0
    compression_ratio: float = 1.0
    chorus_rate_hz: float = 0.0
    chorus_depth: float = 0.0
    saturation_drive_db: float = 0.0
    reverb_room_size: float = 0.0
    reverb_wet_level: float = 0.15
    delay_seconds: float = 0.0
    delay_feedback: float = 0.0
    speed: float = 1.0

PRESETS: Dict[str, EffectPreset] = {
    "baby": EffectPreset(
        id="baby",
        name="BABY",
        pitch_shift=9.0,          # Increased from 7 for a more childlike squeak
        eq_highpass_hz=300.0,     # Increased from 250 to remove more bass
        compression_threshold_db=-20.0,
        compression_ratio=2.0,
        speed=1.15                # Slightly faster (was 1.1)
    ),
    "cattish": EffectPreset(
        id="cattish",
        name="CATTISH",
        pitch_shift=8.0,          # Very high pitch
        eq_highpass_hz=500.0,     # Remove all bass
        compression_threshold_db=-15.0,
        compression_ratio=3.0,
        speed=1.0
    ),
    "deep": EffectPreset(
        id="deep",
        name="DEEP VOICE",
        pitch_shift=-6.0,         # Very low pitch
        eq_lowpass_hz=3000.0,     # Cut high frequencies
        compression_threshold_db=-15.0,
        compression_ratio=4.0
    ),
    "echo": EffectPreset(
        id="echo",
        name="ECHO",
        delay_seconds=0.4,
        delay_feedback=0.4,
        reverb_room_size=0.6,
        reverb_wet_level=0.4
    )
}

def apply_effect(input_path: str, output_path: str, preset_id: str) -> str:
    """
    Applies the specified effect preset to the input audio file and saves it to output_path.
    Returns the output_path on success.
    """
    preset = PRESETS.get(preset_id)
    if not preset:
        raise ValueError(f"Unknown preset {preset_id}")
    
    # Step 1: Convert input to a temporary WAV using bundled ffmpeg.
    # This handles .m4a, .mp4, .aac, .ogg etc. from any mobile device.
    import subprocess
    import imageio_ffmpeg

    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    converted_path = input_path + "_converted.wav"

    try:
        proc = subprocess.run(
            [ffmpeg_exe, "-y", "-i", input_path,
             "-ar", "44100",   # resample to 44.1kHz
             "-ac", "1",       # mono
             "-f", "wav",
             converted_path],
            capture_output=True, timeout=30
        )
        if proc.returncode != 0:
            err = proc.stderr.decode(errors="replace")
            raise ValueError(f"Failed to decode audio: {err[-300:]}")
    except subprocess.TimeoutExpired:
        raise ValueError("Audio conversion timed out")

    # Step 2: Read the converted WAV with soundfile (always works on WAV)
    audio, sample_rate = sf.read(converted_path, dtype="float32", always_2d=True)
    audio = audio.T  # soundfile gives (samples, ch), pedalboard wants (ch, samples)

    # Clean up the converted temp file now that it's in memory
    try:
        os.remove(converted_path)
    except OSError:
        pass

    if audio.size == 0:
        raise ValueError("Audio file is empty or corrupted")

    plugins = []
    
    # EQ
    if preset.eq_highpass_hz > 0:
        plugins.append(HighpassFilter(cutoff_frequency_hz=preset.eq_highpass_hz))
    if preset.eq_lowpass_hz > 0:
        plugins.append(LowpassFilter(cutoff_frequency_hz=preset.eq_lowpass_hz))
        
    # Pitch Shifting
    # Pedalboard's PitchShift algorithm handles pitch well. Without a formant parameter, 
    # pitching up naturally shifts formants up, which perfectly fits the "Baby/Chipmunk" and "Cat" vibe.
    if preset.pitch_shift != 0:
        plugins.append(PitchShift(semitones=preset.pitch_shift))
        
    # Chorus / Modulation (Purr)
    if preset.chorus_depth > 0:
        plugins.append(Chorus(rate_hz=preset.chorus_rate_hz, depth=preset.chorus_depth, mix=0.5))
        
    # Saturation
    if preset.saturation_drive_db > 0:
        plugins.append(Distortion(drive_db=preset.saturation_drive_db))
        
    # Compression
    if preset.compression_ratio > 1.0:
        plugins.append(Compressor(threshold_db=preset.compression_threshold_db, ratio=preset.compression_ratio))
        
    # Reverb & Delay
    if preset.delay_seconds > 0:
        plugins.append(Delay(delay_seconds=preset.delay_seconds, feedback=preset.delay_feedback, mix=0.5))
    if preset.reverb_room_size > 0:
        plugins.append(Reverb(room_size=preset.reverb_room_size, wet_level=preset.reverb_wet_level))
        
    board = Pedalboard(plugins)
    
    # Process audio
    processed = board(audio, sample_rate)
    
    # Handle Speed adjustment
    # Primitive resample: writing with a lower sample rate plays faster
    out_sr = int(sample_rate * (1.0 / preset.speed)) if preset.speed != 1.0 else sample_rate
    
    # Write using pedalboard.io or soundfile (soundfile expects (samples, channels) so we transpose)
    processed = processed.T if processed.shape[0] > 1 else processed.squeeze()
    
    sf.write(output_path, processed, out_sr)
    
    return output_path
