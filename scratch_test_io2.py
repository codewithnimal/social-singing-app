import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))
from pedalboard.io import AudioFile
import numpy as np
import soundfile as sf

def test():
    sf.write("test_io.wav", np.zeros((44100, 2), dtype=np.float32), 44100)
    with AudioFile("test_io.wav") as f:
        audio = f.read(f.frames)
        print("AudioFile shape:", audio.shape)

if __name__ == "__main__":
    test()
