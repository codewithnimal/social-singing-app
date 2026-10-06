import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

def test():
    try:
        from pedalboard.io import AudioFile
        print("AudioFile imported successfully.")
    except Exception as e:
        print("Error:", repr(e))

if __name__ == "__main__":
    test()
