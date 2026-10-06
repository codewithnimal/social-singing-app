import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))
from src.services.audio_fx import apply_effect

def test():
    try:
        # Create a dummy valid WAV file using soundfile
        import soundfile as sf
        import numpy as np
        dummy_path = "backend/data/audio/dummy.wav"
        os.makedirs("backend/data/audio", exist_ok=True)
        sf.write(dummy_path, np.zeros(44100, dtype=np.float32), 44100)
        
        print("Testing with WAV:")
        apply_effect(dummy_path, "backend/data/audio/out.wav", "baby")
        print("WAV success!")
        
    except Exception as e:
        print("Error:", repr(e))

if __name__ == "__main__":
    test()
