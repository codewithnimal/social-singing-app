# Audio Effects (Phase 6)

## 1. Selected Audio Processing Library
**Library:** `ffmpeg-kit-react-native`
**Why it was selected:** React Native and Expo (`expo-av`) do not have native APIs to manipulate audio data and save the result as a new file. They can only play audio with real-time effects. To fulfill the requirement of generating a persistent `echo.m4a` or `kongu.m4a` that can later be uploaded to a backend, we need a robust Digital Signal Processing (DSP) tool. FFmpeg is the industry standard for reliable audio manipulation.

## 2. Impact on Development Workflow (Expo Go vs Dev Build)
**Does Expo Go still work?** **NO.**
`ffmpeg-kit-react-native` relies on heavy C/C++ native bindings (the actual FFmpeg binaries) which are not bundled inside the standard Expo Go app. 
**Required Change:** We must switch to a **Custom Development Build**. 
Instead of scanning a QR code with the standard Expo Go app, we will use `npx expo run:android` (or EAS Build) to compile a standalone app that contains our custom native FFmpeg code. This requires Android Studio (or Xcode for iOS) to be installed locally if building locally.

## 3. The Processing Pipeline Architecture
We strictly enforce a "Star" topology (not a daisy-chain):
```text
             ┌→ Echo (aecho filter)
Original ────┼→ Kongu Mode (atempo + asetrate)
             └→ Deep Voice (atempo + asetrate)
```
Every effect is generated directly from `original.m4a` and saved as a uniquely named file (e.g., `kongu.m4a`).

## 4. The Effects
### Effect 1: Echo
- **Input:** `original.m4a`
- **Output:** `echo.m4a`
- **FFmpeg Filter:** `-filter_complex "aecho=0.8:0.9:500:0.3"` (Adds a decaying delay to the audio).

### Effect 2: 🎭 Kongu Mode (MVP)
- **Input:** `original.m4a`
- **Output:** `kongu.m4a`
- **FFmpeg Filter:** `-filter:a "asetrate=44100*1.15,atempo=1.05"`
- **Description:** Playful regional styling. It slightly raises the pitch and increases the speaking rate to give a bouncy, fast-paced prosody.
- **Limitation:** This is a DSP manipulation, not a neural dialect conversion. It does not alter vocabulary or grammar.

### Effect 3: Deep Voice
- **Input:** `original.m4a`
- **Output:** `deep.m4a`
- **FFmpeg Filter:** `-filter:a "asetrate=44100*0.8,atempo=1.25"`
- **Description:** Lowers the pitch by slowing the sample rate, then compensates for the speed reduction using `atempo` so the duration remains the same.

## 5. File Lifecycle & Storage
- Files are saved to the temporary cache directory (`FileSystem.cacheDirectory`).
- Repeatedly tapping an effect will overwrite the *previously processed* effect file (e.g., `kongu.m4a`), but will NEVER overwrite `original.m4a`.
- The user previews the effect and selects the final version.
- Cleanup (Two-play rule) is reserved for Phase 9.
