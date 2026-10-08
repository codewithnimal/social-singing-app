# Frontend Guide

The Expo React Native application is in `vibelyfe/`. It uses Expo Router, `expo-audio`, AsyncStorage, and the backend API for authentication, chat, and audio effects.

## Run the app

```powershell
Set-Location vibelyfe
npm install
npx expo start
```

Scan the Expo CLI QR code with Expo Go. For a physical device, set `EXPO_PUBLIC_API_URL` to an API address reachable from that device before starting Expo. Android emulators can use `http://10.0.2.2:8000/api/v1`.

## App structure

- `app/` contains Expo Router screens and route layouts.
- `src/api/` contains the API client and endpoint wrappers.
- `src/context/` contains app-wide authentication state.
- `src/components/` contains reusable interface components.
- `src/services/` contains audio, chat, and profile-avatar services.
- `src/theme/` contains shared design tokens.

Audio effects are processed by the backend. The app downloads authenticated preview audio to a local file before playback.
