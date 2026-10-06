# TODO Roadmap

## Phase 0 — System + CN Foundation
- [x] Initial architecture documentation
- [x] Computer networking basics mapping

## Phase 1 — Project Architecture
- [x] Setup FastAPI + React Native skeletons

## Phase 2 — Authentication
- [x] JWT, User models, Register/Login endpoints

## Phase 3 — Friends
- [x] Send, accept, reject, remove, list friends

## Phase 4 — 1-to-1 Text Chat
- [x] Create conversation model (2 users)
- [x] Create text message model
- [x] Send text message endpoint
- [x] List messages with pagination
- [x] Edge cases (empty, long, unauthorized, etc.)

## Phase 5 — Audio Recording
- [x] expo-audio recording UI
- [x] Audio permission handling

## Phase 6 — Audio Effects (Baby, Cattish, Deep, Echo)
- [x] Backend pedalboard DSP pipeline
- [x] ffmpeg m4a → wav conversion
- [x] 4 effects: baby, cattish, deep, echo
- [x] Frontend effect picker in AudioRecorder

## Phase 7 — Audio Upload + Local Storage
- [x] LocalStorageService with UUID filenames
- [x] Authenticated audio serve endpoint
- [x] File validation (size, content-type, extension)

## Phase 8 — Singing Messages
- [x] Attach processed audio to chat messages
- [x] Play count enforcement (2-play Snapchat style)
- [x] Frontend chat UI with locked/unlocked state

## Phase 9 — Two-Play Enforcement
- [x] DB play_count + max_plays columns
- [x] Backend enforces limit on serve_audio endpoint
- [x] Frontend shows plays remaining / locked state

## Phase 10 — Security Hardening ✅ COMPLETE
- [x] 36-test security suite (test_security.py)
- [x] JWT secret key → 39 bytes (RFC 7518 compliant)
- [x] JWT `exp` claim now required
- [x] IDOR: conversation + audio access verified
- [x] Path traversal: blocked in serve URL and filename
- [x] Upload abuse: oversized, wrong type, shell script blocked
- [x] Input validation: malformed JSON, SQL inject, pagination abuse
- [x] Error leakage: no stack traces or paths in responses
- [ ] Rate limiting (deferred — use reverse proxy in prod)

## Phase 11 — Secure Playback
- [ ] Pre-signed download URLs on demand

## Phase 12 — Wallpaper + Singing UI
- [ ] Frontend aesthetic polish

## Phase 13 — Notifications
- [ ] Real-time updates via WebSockets

## Phase 14 — Network Failure Testing
- [ ] Offline support / retry logic

## Phase 15 — End-to-End Testing
- [ ] Integration tests

## Phase 16 — Deployment
- [ ] Docker, reverse proxy, production DB
