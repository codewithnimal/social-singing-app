# Frontend Guide: Vibely Mobile App

This document outlines the architecture, features, and setup instructions for the Vibely frontend mobile application. 

## 🏗 Technology Stack

- **Framework**: React Native with Expo (Managed Workflow)
- **Routing/Navigation**: React Navigation (Native Stack)
- **Networking**: Axios (with centralized Interceptor for JWT injection)
- **State Management**: React Context API (`AuthContext`)
- **Audio Recording**: `expo-audio`
- **Audio Processing / DSP**: `react-native-audio-api` (for local effects, if applicable) or relying on backend endpoints (`/apply`)
- **File System**: `expo-file-system` (handling WAV encoding and temporary cache)
- **Secure Storage**: `expo-secure-store` (for JWT persistence)

## 📂 Directory Structure

The mobile application is located within the `mobile/` directory.

```text
mobile/
├── App.tsx                   # Entry point of the Expo application
├── src/
│   ├── api/                  # Axios clients and API request functions
│   │   ├── client.ts         # Base Axios instance with JWT interceptors
│   │   └── chat.ts           # Chat/Audio related API wrappers
│   ├── components/           # Reusable UI components
│   │   └── AudioRecorder.tsx # Component handling microphone permissions & recording
│   ├── context/              # Global React Contexts
│   │   └── AuthContext.tsx   # Manages JWT tokens, user state, login/logout
│   ├── navigation/           # Navigation setup
│   │   └── AppNavigator.tsx  # Stack navigator (Auth vs Authenticated screens)
│   ├── screens/              # Full-screen views
│   │   ├── HomeScreen.tsx    # Main chat and friend list interface
│   │   ├── LoginScreen.tsx   # User authentication
│   │   └── RegisterScreen.tsx# Account creation
│   └── utils/                # Helper functions
│       └── wavEncoder.ts     # Handles encoding audio chunks to WAV format
```

## ✨ Core Features & Flows

### 1. Authentication
- JWTs are securely stored on the device using `expo-secure-store`.
- `client.ts` automatically attaches the `Authorization: Bearer <token>` header to all outgoing requests.
- `AuthContext` dynamically switches the router between the `LoginScreen` and the `HomeScreen` based on token presence.

### 2. Friend System (Social Graph)
- Users can send, accept, or reject friend requests.
- The UI restricts chat and audio features solely to accepted friends.

### 3. Voice Recording & Chat
- Utilizes `expo-audio` to capture microphone input.
- Audio is encoded to `.wav` using custom utilities to ensure it meets backend standards.
- Files are uploaded using `multipart/form-data` to the backend.

### 4. Audio Effects (DSP)
- Users can preview their voice with custom effects (e.g., Pitch shifting, Echo).
- This is achieved by either processing the audio via native modules or sending it to the backend's `/audio/effects/apply` endpoint, receiving a temporary URL, and playing the modified stream.

### 5. The "Two-Play" Gatekeeper
- The core product feature: Voice notes can only be played twice.
- The mobile app UI handles the states: "Unplayed", "Played Once", and "Locked".
- The backend enforces this strictly, so the mobile app must gracefully handle HTTP 403 Forbidden errors if a user attempts a third playback or if the local state is out of sync.

## 🚀 Setup & Running Locally

1. **Navigate to the mobile directory**:
   ```bash
   cd mobile
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   Ensure that the backend API URL in `mobile/src/api/client.ts` (or your `.env` file) points to your running backend server (e.g., `http://10.0.2.2:8000` for Android emulator, or your local IP address for physical devices).

4. **Start the Metro Bundler**:
   ```bash
   npx expo start
   ```

5. **Run on Device / Emulator**:
   - Press `a` to open on an Android emulator.
   - Press `i` to open on an iOS simulator (Mac only).
   - Or scan the QR code with the Expo Go app on a physical device.

## 🛡 Error Handling & Edge Cases
- **Network Failures**: Axios interceptors catch network timeouts and display user-friendly alerts.
- **Permissions**: Microphone and Storage permissions are requested gracefully. If denied, fallback UI is shown.
- **Token Expiry**: If a `401 Unauthorized` is returned from the backend, the Axios interceptor triggers a logout, returning the user to the `LoginScreen`.
