# CODEBASE NOTES

## 1. Project Overview

* **Project Concept**: The Social Singing App (`vcapp`) is a voice-first, ephemeral social messaging application designed for sharing musical snippets and singing clips between friends. It combines 1-to-1 social networking with audio processing filters (voice effects) and ephemeral playback limits.
* **Core Value & Hook (Two-Play Rule)**: A recipient is permitted to listen to an incoming singing audio message a maximum of 2 times (`max_plays = 2`). Once played twice, the audio locks permanently (`🔒 Locked`), preventing hoarding and infinite replays (resembling ephemeral interactions like Snapchat audio). Senders can replay their own sent recordings without consuming recipient play tokens.
* **Main User Journey**:
  1. User registers with unique `username`, `email`, and `password`; authenticates to acquire a JWT.
  2. User discovers other users via username/email prefix search and sends friend requests.
  3. Recipient accepts the request, creating an active two-way friendship edge.
  4. User enters the chat with their friend, taps record (`expo-audio`), and records a vocal snippet.
  5. User previews voice filters (Original, Baby Voice, Cattish Purr, Deep Voice, Stadium Echo). The audio is sent to the backend audio processing engine (`pedalboard`), and the processed preview is downloaded and auditioned.
  6. User hits "Send". The audio file is uploaded via multipart POST to `/api/v1/chat/audio/{friend_id}`.
  7. The backend writes the audio blob to storage, stores message metadata in PostgreSQL, and creates a 1-to-1 conversation.
  8. Recipient fetches message history, sees the singing message bubble with a play button showing plays left, taps to stream/download the audio file via the protected serve endpoint, which enforces the atomic two-play limit.
* **Current MVP Scope**:
  - Full JWT authentication (register, login, me).
  - Bi-directional friend system (request, accept, reject, remove, list).
  - 1-to-1 conversation creation and paginated history fetching.
  - Idempotent text messaging with client-generated UUIDs (`client_msg_id`).
  - Mobile audio recording (`expo-audio`) and playback (`expo-audio` player).
  - Voice effects engine powered by Spotify Pedalboard + FFmpeg on the backend.
  - Pluggable storage architecture (`LocalStorageService` and `S3StorageService`).
  - Server-enforced two-play playback gatekeeper in PostgreSQL.
  - Security-hardened endpoints (36/36 tests passing: IDOR prevention, path traversal blocking, file size & MIME verification, weak JWT secret mitigation, token expiry requirement).
* **Current Backend Technology**: Python 3.12, FastAPI 0.115.0, SQLAlchemy 2.0.35, Alembic 1.13.3, Pydantic v2 (2.13.5), PyJWT 2.15.1, Passlib (bcrypt 5.0.0), Spotify Pedalboard 0.9.19, imageio-ffmpeg, SoundFile, NumPy.
* **Current Mobile Technology**: React Native 0.86.3, Expo SDK 57 (~57.0.26), React 19.2.3, TypeScript ~6.0.3, React Navigation v7 (`@react-navigation/native-stack`), Axios 1.20.0, `expo-audio`, `expo-file-system` (legacy module for header-based downloads), `expo-secure-store`.
* **Database**: PostgreSQL (accessible via `postgresql+psycopg2://postgres:***@localhost:5432/vcapp`). Unit tests run against an in-memory/file-based SQLite database (`test.db`).
* **Audio / Object Storage**: Dual-mode abstracted storage (`BaseStorageService`):
  - Local disk storage: `LocalStorageService` saving files to `data/audio/chat_audio/{conversation_id}/`.
  - Cloud storage: `S3StorageService` supporting AWS S3 or MinIO buckets with presigned URLs.
* **Authentication Approach**: Stateless OAuth2 Bearer JWT. Tokens use HMAC-SHA256 (`HS256`), are signed with a 39-byte server key, enforce the `exp` expiration claim (60 minutes), and encode the user's username in the `sub` claim.
* **Current Development Stage**: Phases 0 through 10 completed. Complete functional prototype with security and abuse validation passing 36/36 test cases.

---

## 2. High-Level Architecture

### Architectural Diagram

```text
               +---------------------------------------------------+
               |             React Native / Expo Client             |
               | (UI, Microphone Recording, Preview Audio Playback)|
               +-------------------------+-------------------------+
                                         |
                                         | HTTPS (JSON / Multipart)
                                         | Bearer JWT Auth Header
                                         v
               +---------------------------------------------------+
               |                  FastAPI Backend                  |
               |               (Application Gateway)               |
               +----+--------------------+--------------------+----+
                    |                    |                    |
        +-----------v----------+  +------v-------+     +------v------------+
        |   Authentication &   |  | Friendships  |     | Audio Effects     |
        |   Identity Layer     |  | & 1-to-1 Chat|     | Pipeline          |
        |  (deps.py / security)|  | (routes/chat)|     | (Pedalboard+FFmpeg|
        +-----------+----------+  +------+-------+     +------+------------+
                    |                    |                    |
                    +-----------+--------+                    |
                                |                             |
                                v                             v
               +---------------------------------+   +---------------------+
               |      Relational Database        |   |    Object Storage   |
               |          (PostgreSQL)           |   |   (Local / S3)      |
               |---------------------------------|   |---------------------|
               | - users (credentials, IDs)      |   | - chat_audio/       |
               | - friendships (edge states)     |   |   {conv_id}/        |
               | - conversations (pairs)         |   |   {uid}_{uuid}.wav  |
               | - messages (metadata, plays)    |   | - temp_effects/     |
               +---------------------------------+   +---------------------+
```

### Component Responsibilities & Boundaries

* **Who calls whom**:
  1. The Mobile Client calls FastAPI endpoints over HTTP/HTTPS with JSON payloads or `multipart/form-data`.
  2. FastAPI routes call dependency injection functions (`deps.get_current_user`, `deps.get_db`).
  3. FastAPI routes validate incoming schema via Pydantic (`src/schemas/`), then execute business logic.
  4. Routes interact with SQLAlchemy models (`src/models/`) and storage services (`src/services/storage.py`, `src/services/audio_fx.py`).
  5. Storage services stream physical audio files to local disk or S3 object store.
  6. SQLAlchemy writes relational rows and transactions to PostgreSQL.
* **Where validation happens**:
  - *HTTP & Type Validation*: Pydantic models in `src/schemas/` validate types, bounds, strings, string lengths (`max_length=2000` for messages), and email structure (`EmailStr`).
  - *File Validation*: `validate_audio_file` in `src/services/storage.py` and `routes/effects.py` validates file existence, MIME type (`audio/*`), extension (`.wav`, `.m4a`, etc.), and size constraints (0 bytes rejected, max 10MB).
  - *Parameter Constraints*: Query parameters use FastAPI `Query(ge=1, le=100)`.
* **Where business rules happen**:
  - Backend route handlers (`src/api/routes/`):
    - *Friend Rule*: Only active accepted friends can establish conversations or exchange messages (`routes/chat.py`).
    - *Two-Play Rule*: Playback count is checked and incremented server-side (`msg.play_count < msg.max_plays`) in `routes/chat.py`.
    - *Idempotency Rule*: `client_msg_id` is queried before insertion to block network duplicates.
* **Where database operations happen**:
  - Inside route handlers via the injected `Session` (`db: Session = Depends(get_db)`). Sessions commit or roll back changes on errors.
* **Where files are stored**:
  - Relational metadata (IDs, user references, conversation IDs, duration, play counts, file path strings) is stored in PostgreSQL.
  - Raw binary audio files are stored in Object Storage (`LocalStorageService` under `data/audio/` or `S3StorageService` in the target S3 bucket).
* **Where authentication is checked**:
  - `src/api/deps.py` via `get_current_user`, which decodes and verifies the JWT token signature, expiry, and user existence in the database.
* **Where authorization is checked**:
  - Explicitly inside endpoint handlers:
    - `accept_friend_request`: Enforces that `Friendship.friend_id == current_user.id`.
    - `send_message` / `send_audio_message`: Enforces active friendship between sender and recipient.
    - `serve_audio`: Validates that `current_user.id` is either `user1_id` or `user2_id` of the conversation that owns the audio file.

---

## 3. Complete Directory Structure

```text
vcapp/
├── backend/
│   ├── alembic/
│   │   ├── versions/
│   │   │   ├── 12937aabcf1e_initial_migration.py
│   │   │   ├── 57be19dfb766_add_friendship_model.py
│   │   │   ├── 4aa0e0803c12_add_chat_models.py
│   │   │   ├── 96c6f4648009_add_client_msg_id_for_idempotency.py
│   │   │   └── 19314264d488_add_audio_metadata_to_message.py
│   │   ├── env.py
│   │   ├── README
│   │   └── script.py.mako
│   ├── data/
│   │   └── audio/
│   │       ├── chat_audio/
│   │       └── temp_effects/
│   ├── src/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── auth.py
│   │   │   │   ├── chat.py
│   │   │   │   ├── effects.py
│   │   │   │   ├── friends.py
│   │   │   │   └── users.py
│   │   │   └── deps.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── exceptions.py
│   │   │   ├── logging.py
│   │   │   └── security.py
│   │   ├── db/
│   │   │   └── session.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── chat.py
│   │   │   ├── friendship.py
│   │   │   └── user.py
│   │   ├── schemas/
│   │   │   ├── chat.py
│   │   │   ├── friendship.py
│   │   │   └── user.py
│   │   ├── services/
│   │   │   ├── audio_fx.py
│   │   │   └── storage.py
│   │   └── main.py
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   ├── test_chat.py
│   │   ├── test_friends.py
│   │   └── test_health.py
│   ├── alembic.ini
│   ├── migrate_db.py
│   ├── pytest.ini
│   ├── requirements.txt
│   ├── seed.py
│   └── test_audio_flow.py
├── mobile/
│   ├── assets/
│   ├── src/
│   │   ├── api/
│   │   │   ├── chat.ts
│   │   │   └── client.ts
│   │   ├── components/
│   │   │   └── AudioRecorder.tsx
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── navigation/
│   │   │   └── AppNavigator.tsx
│   │   ├── screens/
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── LoginScreen.tsx
│   │   │   └── RegisterScreen.tsx
│   │   └── utils/
│   │       └── wavEncoder.ts
│   ├── App.tsx
│   ├── app.json
│   ├── index.ts
│   ├── package.json
│   └── tsconfig.json
├── ARCHITECTURE.md
├── API_CONTRACT.md
├── AUDIO_CONCEPTS.md
├── AUDIO_EFFECTS.md
├── CN_CONCEPTS.md
├── DATABASE.md
├── DECISIONS.md
├── DEVELOPMENT_RULES.md
├── EDGE_CASES.md
├── PROJECT_STATE.md
├── TODO.md
├── test_effects_api.py
└── test_security.py
```

### Directory Specifications

#### Directory: `backend/src/api/routes`
* **Purpose**: Houses the FastAPI HTTP controller endpoints.
* **Owns**: Route definitions, HTTP status codes, query/body parameter parsing, calling services, database transaction triggers.
* **Does NOT own**: Raw database connection logic, SQL DDL migrations, audio DSP algorithms.
* **Main dependencies**: `fastapi`, `sqlalchemy.orm.Session`, `src/api/deps.py`, `src/schemas/*`, `src/models/*`, `src/services/*`.
* **Used by**: `backend/src/main.py`.
* **Important files**: `auth.py`, `chat.py`, `effects.py`, `friends.py`, `users.py`.

#### Directory: `backend/src/core`
* **Purpose**: Foundation settings, security cryptography, logging configuration, and application-level exceptions.
* **Owns**: Pydantic application settings (`Settings`), password hashing, JWT signing/decoding utilities, custom exception classes, log formatters.
* **Does NOT own**: Domain database queries or UI logic.
* **Main dependencies**: `pydantic-settings`, `passlib`, `PyJWT`, standard library `logging` and `os`.
* **Used by**: Almost all backend modules (`src/main.py`, `deps.py`, routes, services).
* **Important files**: `config.py`, `security.py`, `exceptions.py`, `logging.py`.

#### Directory: `backend/src/db`
* **Purpose**: Database connection engine and session factory management.
* **Owns**: SQLAlchemy `Engine`, `SessionLocal`, `Base` declarative model parent, and the `get_db` generator.
* **Does NOT own**: Specific entity table definitions or endpoint handlers.
* **Main dependencies**: `sqlalchemy`, `src/core/config.py`.
* **Used by**: `src/api/deps.py`, `src/models/*`, `alembic/env.py`.
* **Important files**: `session.py`.

#### Directory: `backend/src/models`
* **Purpose**: Declarative SQLAlchemy ORM database models mapping directly to PostgreSQL tables.
* **Owns**: Table definitions, column types, foreign keys, relationships, cascaded deletes, and database-level constraints.
* **Does NOT own**: Request body parsing or client JSON serialization.
* **Main dependencies**: `sqlalchemy`, `src/db/session.py`.
* **Used by**: `src/api/routes/*`, `src/api/deps.py`, `alembic/env.py`.
* **Important files**: `user.py`, `friendship.py`, `chat.py`.

#### Directory: `backend/src/schemas`
* **Purpose**: Pydantic DTO (Data Transfer Object) models for request validation and response serialization.
* **Owns**: Inbound request parsing, outbound field masking (e.g. omitting password hashes), validation constraints (`max_length`, `ge`, `le`).
* **Does NOT own**: Persistence logic or direct database queries.
* **Main dependencies**: `pydantic`.
* **Used by**: `src/api/routes/*`, `src/api/deps.py`.
* **Important files**: `user.py`, `friendship.py`, `chat.py`.

#### Directory: `backend/src/services`
* **Purpose**: Business and domain service logic separate from HTTP presentation.
* **Owns**: Binary audio DSP processing (Pedalboard pipeline), local/S3 audio file persistence, presigned URL generation, file validation, file cleanup.
* **Does NOT own**: HTTP routing or database schema definitions.
* **Main dependencies**: `pedalboard`, `soundfile`, `imageio-ffmpeg`, `boto3`, `fastapi.UploadFile`.
* **Used by**: `src/api/routes/chat.py`, `src/api/routes/effects.py`.
* **Important files**: `audio_fx.py`, `storage.py`.

#### Directory: `mobile/src/api`
* **Purpose**: Network transport client for calling the FastAPI backend.
* **Owns**: Axios HTTP instance configuration, base URL, request headers, multipart form data building for audio uploads.
* **Does NOT own**: UI state management or screen navigation.
* **Main dependencies**: `axios`, `react-native`.
* **Used by**: Mobile screens and components (`HomeScreen`, `LoginScreen`, `RegisterScreen`, `AudioRecorder`).
* **Important files**: `client.ts`, `chat.ts`.

#### Directory: `mobile/src/components`
* **Purpose**: Reusable interactive UI components for mobile.
* **Owns**: Audio recording state machine (`isRecording`, `isPlaying`, `isProcessing`, `isSending`), permission handling, voice filter preview requests, audio playback.
* **Does NOT own**: Application routing or authentication credentials storage.
* **Main dependencies**: `expo-audio`, `expo-file-system`, `mobile/src/api/client.ts`.
* **Used by**: `mobile/src/screens/HomeScreen.tsx`.
* **Important files**: `AudioRecorder.tsx`.

#### Directory: `mobile/src/context`
* **Purpose**: Global React application state for authentication.
* **Owns**: JWT token persistence in `expo-secure-store`, attaching Bearer tokens to Axios default headers, handling login/logout transitions.
* **Does NOT own**: Message list fetching or audio recording.
* **Main dependencies**: `react`, `expo-secure-store`, `mobile/src/api/client.ts`.
* **Used by**: `mobile/App.tsx`, `AppNavigator.tsx`, screens.
* **Important files**: `AuthContext.tsx`.

#### Directory: `mobile/src/screens`
* **Purpose**: Page-level views rendered by the navigation container.
* **Owns**: Screen layout, user interactions, local list states (`messages`, `friends`), audio message playback orchestration.
* **Does NOT own**: Backend business rules or low-level cryptographic logic.
* **Main dependencies**: `react`, `react-native`, `expo-audio`, `expo-file-system`, `src/api/*`, `src/context/*`.
* **Used by**: `mobile/src/navigation/AppNavigator.tsx`.
* **Important files**: `HomeScreen.tsx`, `LoginScreen.tsx`, `RegisterScreen.tsx`.

---

## 4. Backend Directory Responsibilities

### `backend/src/api` & `backend/src/api/routes`
* **Purpose**: Provides the REST API interface to client applications.
* **Responsibilities**:
  - Exposes REST endpoints (`/auth`, `/users`, `/friends`, `/chat`, `/audio/effects`).
  - Enforces dependency-injected authentication via `get_current_user`.
  - Parses query parameters and verifies basic constraints.
  - Returns structured HTTP responses with standardized status codes (200, 201, 400, 401, 403, 404, 413, 422, 500).
* **Does NOT handle**:
  - Direct execution of audio DSP filters (delegated to `src/services/audio_fx.py`).
  - Low-level database connection pooling (delegated to `src/db/session.py`).
* **Depends on**: `src/schemas`, `src/models`, `src/services`, `src/db/session.py`, `src/core/security.py`.
* **Used by**: `src/main.py`.
* **Important files**: `auth.py`, `chat.py`, `effects.py`, `friends.py`, `users.py`, `deps.py`.
* **Typical future changes**: Adding group chats, voice memo reactions, blocking endpoints, push notification triggers.

### `backend/src/core`
* **Purpose**: Centralizes global configuration, cross-cutting concerns, and cryptographic infrastructure.
* **Responsibilities**:
  - Defines `Settings` loaded from environment variables (`.env`).
  - Provides bcrypt password hashing and verification functions.
  - Generates and signs stateless JWT tokens with mandatory expiry.
  - Configures application-wide logging and structured exception handlers (`AppError`, global 500 handler).
* **Does NOT handle**:
  - Route endpoint definitions or SQL queries.
* **Depends on**: Third-party security and system libraries (`pydantic-settings`, `passlib`, `jwt`).
* **Used by**: Entire backend codebase.
* **Important files**: `config.py`, `security.py`, `exceptions.py`, `logging.py`.
* **Typical future changes**: Adding rotating refresh tokens, rate-limiting settings, CORS origins whitelist for production.

### `backend/src/db`
* **Purpose**: Manages SQLAlchemy ORM engine and connection lifecycle.
* **Responsibilities**:
  - Instantiates `engine` with connection pooling (`pool_pre_ping=True`).
  - Exposes `SessionLocal` for transactional units of work.
  - Provides `get_db()` context generator yielding scoped sessions.
* **Does NOT handle**:
  - DDL schema versioning (owned by `alembic/`).
* **Depends on**: `src/core/config.py`.
* **Used by**: `src/api/deps.py`, `alembic/env.py`, `seed.py`.
* **Important files**: `session.py`.
* **Typical future changes**: Configuring read-replicas, connection pool size tuning for production scale.

### `backend/src/models`
* **Purpose**: Defines the relational data model schema for PostgreSQL.
* **Responsibilities**:
  - Maps Python classes to PostgreSQL tables (`users`, `friendships`, `conversations`, `messages`).
  - Sets primary keys, indexes, foreign keys (`ondelete="CASCADE"`), unique constraints, and enum columns.
  - Configures SQLAlchemy ORM relationships (`relationship`, `back_populates`).
* **Does NOT handle**:
  - HTTP input validation or password hashing logic.
* **Depends on**: `src/db/session.py` (`Base`).
* **Used by**: Route handlers, `deps.py`, Alembic migrations.
* **Important files**: `user.py`, `friendship.py`, `chat.py`.
* **Typical future changes**: Adding `reactions` table, `notifications` table, `blocked_users` table.

### `backend/src/schemas`
* **Purpose**: Type validation, sanitization, and serialization contracts for all API interactions.
* **Responsibilities**:
  - Defines input models (`UserCreate`, `MessageCreate`) and response models (`UserResponse`, `MessageResponse`, `FriendListResponse`).
  - Masks sensitive database fields (e.g. `hashed_password` is excluded from `UserResponse`).
  - Enforces field length limits (`max_length=2000`) and optional client idempotency tokens (`client_msg_id`).
* **Does NOT handle**:
  - Database queries or file operations.
* **Depends on**: `pydantic`.
* **Used by**: Route definitions and `deps.py`.
* **Important files**: `user.py`, `friendship.py`, `chat.py`.
* **Typical future changes**: Adding schema fields for audio waveforms, read receipts, and user avatars.

### `backend/src/services`
* **Purpose**: Encapsulates external I/O and CPU-intensive operations (storage and audio processing).
* **Responsibilities**:
  - Manages file uploads, file size checks, MIME type validation.
  - Writes audio files to local storage or AWS S3.
  - Generates download URLs (local serve URLs or S3 presigned URLs).
  - Implements the multi-stage DSP voice effect pipeline with FFmpeg and Spotify Pedalboard.
* **Does NOT handle**:
  - End-user authentication checks (delegated to route dependencies).
* **Depends on**: `soundfile`, `pedalboard`, `imageio-ffmpeg`, `boto3`, `src/core/config.py`.
* **Used by**: `src/api/routes/chat.py`, `src/api/routes/effects.py`.
* **Important files**: `audio_fx.py`, `storage.py`.
* **Typical future changes**: Cloudflare R2 storage provider, asynchronous background worker processing for long audio.

---

## 5. Architectural Layers

The backend follows a distinct layered architecture separating presentation, validation, business rules, and persistence:

```text
       Client Request (Mobile / HTTP)
                     │
                     ▼
         [ 1. Router / Presentation Layer ]
         • FastAPI route decorators
         • Pydantic schema validation (Inbound)
         • Authentication dependency (get_current_user)
                     │
                     ▼
         [ 2. Domain & Service Layer ]
         • Authorization checks (friendship verification)
         • Business rules (2-play limit, idempotency)
         • Audio processing (Pedalboard) & Storage (S3/Local)
                     │
                     ▼
         [ 3. Data Access / Persistence Layer ]
         • SQLAlchemy ORM models & session queries
         • Transactions & rollback coordination
                     │
                     ▼
         [ 4. Database & Storage Infrastructure ]
         • PostgreSQL (Relational metadata)
         • Object Storage (Audio binary blobs)
```

### Layer Breakdown

1. **Router / API Layer (`src/api/routes/*`, `src/api/deps.py`)**:
   - *Responsible for*: HTTP routing, HTTP method binding, path parameter parsing, checking authorization dependencies, translating domain exceptions into HTTP status codes (400, 401, 403, 404, 422).
   - *Should NOT*: Run long signal processing algorithms inline without delegation; directly format raw binary audio bytes.
2. **Service Layer (`src/services/*`)**:
   - *Responsible for*: Abstracting physical storage operations (`upload_audio`, `delete_audio`, `get_presigned_url`), performing audio format conversions via FFmpeg, applying DSP effect filters with Pedalboard.
   - *Should NOT*: Access HTTP request headers directly or manage client sessions.
3. **Data Access / Model Layer (`src/models/*`, `src/db/session.py`)**:
   - *Responsible for*: Defining table structures, foreign key relationships, index declarations, executing relational queries (`filter`, `order_by`, `offset`, `limit`), managing transactional commits and rollbacks.
   - *Should NOT*: Store large binary audio blobs in table columns; format API JSON payloads.
4. **Database & Storage Layer**:
   - *Responsible for*: PostgreSQL handles ACID-compliant transactional state (metadata, counters, relationships). Object Storage handles high-throughput binary streaming.

---

## 6. Every Important File

### Summary Table

| File | Responsibility | Depends On | Used By | Important Functions / Classes |
| :--- | :--- | :--- | :--- | :--- |
| `backend/src/main.py` | Application entry point; initializes FastAPI, CORS, routes, exception handlers | `FastAPI`, `src.core.*`, `src.api.routes.*` | Uvicorn server | `app`, `health_check` |
| `backend/src/core/config.py` | Environment variable configuration and database URI generation | `pydantic_settings.BaseSettings` | Entire backend | `Settings`, `settings` |
| `backend/src/core/security.py` | Password hashing (bcrypt) and JWT token creation/signing | `passlib`, `jwt`, `os` | `routes/auth.py`, `deps.py` | `verify_password`, `get_password_hash`, `create_access_token` |
| `backend/src/core/exceptions.py` | Global exception handlers preventing error/traceback leaks | `fastapi`, `logging` | `src/main.py` | `AppError`, `add_exception_handlers` |
| `backend/src/db/session.py` | SQLAlchemy engine initialization and session generator | `sqlalchemy`, `src.core.config` | `deps.py`, Alembic | `engine`, `SessionLocal`, `Base`, `get_db` |
| `backend/src/models/user.py` | Database schema for registered user accounts | `sqlalchemy`, `src.db.session` | `deps.py`, routes, Alembic | `User` |
| `backend/src/models/friendship.py` | Database schema for directed social connections | `sqlalchemy`, `src.db.session` | `routes/friends.py`, `routes/chat.py` | `Friendship`, `FriendshipStatus` |
| `backend/src/models/chat.py` | Database schema for 1-to-1 conversations and messages | `sqlalchemy`, `src.db.session` | `routes/chat.py`, Alembic | `Conversation`, `Message` |
| `backend/src/schemas/user.py` | Pydantic validation schemas for user auth and profiles | `pydantic` | `routes/auth.py`, `routes/users.py` | `UserCreate`, `UserResponse`, `Token` |
| `backend/src/schemas/friendship.py`| Pydantic schemas for friendship states and friend lists | `pydantic` | `routes/friends.py` | `FriendshipResponse`, `FriendListResponse` |
| `backend/src/schemas/chat.py` | Pydantic schemas for text/audio messages and pagination | `pydantic` | `routes/chat.py` | `MessageCreate`, `MessageResponse`, `PaginatedMessages` |
| `backend/src/api/deps.py` | FastAPI dependency for JWT verification and user loading | `fastapi`, `jwt`, `src.models.user` | Protected route handlers | `get_current_user`, `oauth2_scheme` |
| `backend/src/api/routes/auth.py` | Endpoints for user registration, login, and `/me` profile | `src.models.user`, `src.core.security` | Mobile client, test suites | `register`, `login`, `read_users_me` |
| `backend/src/api/routes/users.py` | User search endpoint for finding friends | `src.models.user`, `deps.py` | Mobile client | `search_users` |
| `backend/src/api/routes/friends.py`| Social friendship workflow (request, accept, reject, remove, list) | `src.models.friendship`, `deps.py` | Mobile client | `send_friend_request`, `accept_friend_request`, `list_friends` |
| `backend/src/api/routes/chat.py` | Messaging, audio uploads, history, and play-count enforcement | `src.models.chat`, `src.services.storage` | Mobile client | `send_message`, `send_audio_message`, `serve_audio`, `get_message_history` |
| `backend/src/api/routes/effects.py`| Voice effect generation endpoint and preview serving | `src.services.audio_fx`, `deps.py` | Mobile `AudioRecorder` | `apply_audio_effect`, `serve_effect_preview` |
| `backend/src/services/storage.py`| Pluggable local disk and S3 audio storage abstraction | `boto3`, `shutil`, `fastapi.UploadFile` | `routes/chat.py` | `BaseStorageService`, `LocalStorageService`, `S3StorageService` |
| `backend/src/services/audio_fx.py`| Digital signal processing pipeline (Pedalboard + FFmpeg) | `pedalboard`, `soundfile`, `imageio_ffmpeg` | `routes/effects.py` | `PRESETS`, `apply_effect` |
| `backend/migrate_db.py` | Direct SQL migration script ensuring `play_count` and `max_plays` columns exist | `sqlalchemy`, `src.db.session` | Manual migration / setup | `run` |
| `mobile/src/api/client.ts` | Axios HTTP client configured with base URL | `axios` | Entire mobile codebase | `apiClient` |
| `mobile/src/api/chat.ts` | Mobile network client for multipart audio message uploading | `mobile/src/api/client.ts` | `HomeScreen.tsx` | `uploadAudioMessage` |
| `mobile/src/context/AuthContext.tsx`| React context managing JWT storage in SecureStore and default headers | `expo-secure-store`, `apiClient` | `AppNavigator.tsx`, screens | `AuthContext`, `AuthProvider` |
| `mobile/src/components/AudioRecorder.tsx` | Microphone recording UI, backend voice effect auditioning, audio playback | `expo-audio`, `expo-file-system`, `apiClient` | `HomeScreen.tsx` | `AudioRecorder` |
| `mobile/src/screens/HomeScreen.tsx`| Main app screen displaying friends, chat bubbles, play buttons, and 2-play locks | `expo-audio`, `expo-file-system`, `apiClient` | `AppNavigator.tsx` | `HomeScreen` |
| `mobile/src/utils/wavEncoder.ts` | Pure-JavaScript PCM to WAV encoder (RIFF 44-byte header generator) | None (Pure TypeScript) | Offline audio utilities | `encodeWav` |

---

## 7. Database Architecture

### PostgreSQL Role
PostgreSQL serves as the single source of truth for all structured, relational, and business-critical data. It guarantees ACID properties for:
- User credentials and identity.
- Unambiguous friendship graph edges.
- Conversation pairings.
- Message ordering timestamps (`created_at`).
- **Two-play limit counter (`play_count`)**: Storing this exclusively in PostgreSQL ensures that clients cannot bypass play limits by reinstalling the app, tampering with local caches, or replaying expired sessions.

### Relational Entities and Models

```text
 +------------------------------------+
 |               users                |
 +------------------------------------+
 | id              : INT (PK)         |
 | username        : VARCHAR (Unique) |
 | email           : VARCHAR (Unique) |
 | hashed_password : VARCHAR          |
 | created_at      : TIMESTAMP (UTC)  |
 +-----------------+------------------+
                   |
                   | 1:N
                   v
 +------------------------------------+        +------------------------------------+
 |            friendships             |        |           conversations            |
 +------------------------------------+        +------------------------------------+
 | id         : INT (PK)              |        | id         : INT (PK)              |
 | user_id    : INT (FK -> users.id)  |        | user1_id   : INT (FK -> users.id)  |
 | friend_id  : INT (FK -> users.id)  |        | user2_id   : INT (FK -> users.id)  |
 | status     : ENUM (pending/        |        | created_at : TIMESTAMP (UTC)       |
 |              accepted/rejected)    |        | UQ(user1_id, user2_id)             |
 | created_at : TIMESTAMP             |        +-----------------+------------------+
 | updated_at : TIMESTAMP             |                          |
 | UQ(user_id, friend_id)             |                          | 1:N
 +------------------------------------+                          v
                                               +------------------------------------+
                                               |              messages              |
                                               +------------------------------------+
                                               | id                : INT (PK)       |
                                               | conversation_id   : INT (FK)       |
                                               | sender_id         : INT (FK)       |
                                               | client_msg_id     : VARCHAR(36)(UQ)|
                                               | content           : TEXT (Nullable)|
                                               | audio_url         : VARCHAR(1000)  |
                                               | audio_duration_ms : INT (Nullable) |
                                               | play_count        : INT (Default 0)|
                                               | max_plays         : INT (Default 2)|
                                               | created_at        : TIMESTAMP (UTC)|
                                               +------------------------------------+
```

### Table Details
1. **`users` Table**:
   - `id`: Integer primary key, indexed.
   - `username`: Unique indexed string (handles login and lookup).
   - `email`: Unique indexed string.
   - `hashed_password`: Passlib bcrypt hash string.
   - `created_at`: UTC timestamp.
2. **`friendships` Table**:
   - `id`: Integer primary key, indexed.
   - `user_id`: Integer foreign key (`users.id`, `ondelete="CASCADE"`).
   - `friend_id`: Integer foreign key (`users.id`, `ondelete="CASCADE"`).
   - `status`: Enum (`pending`, `accepted`, `rejected`).
   - Unique constraint: `uix_user_friend` on `(user_id, friend_id)`.
3. **`conversations` Table**:
   - `id`: Integer primary key, indexed.
   - `user1_id`: Foreign key (`users.id`). Guaranteed by application logic to be `min(user_a, user_b)`.
   - `user2_id`: Foreign key (`users.id`). Guaranteed by application logic to be `max(user_a, user_b)`.
   - Unique constraint: `uix_conversation_users` on `(user1_id, user2_id)` preventing duplicate conversation threads.
4. **`messages` Table**:
   - `id`: Integer primary key, indexed.
   - `conversation_id`: Foreign key (`conversations.id`, `ondelete="CASCADE"`).
   - `sender_id`: Foreign key (`users.id`, `ondelete="CASCADE"`).
   - `client_msg_id`: Unique indexed nullable string (UUID generated by mobile for idempotency).
   - `content`: Text content for text messages (null for pure voice messages).
   - `audio_url`: Object storage path/key string (e.g. `chat_audio/3/23_dc34bdb1.wav`).
   - `audio_duration_ms`: Duration in milliseconds.
   - `play_count`: Current play tally, default 0, non-nullable.
   - `max_plays`: Maximum allowed plays, default 2, non-nullable.
   - `created_at`: UTC timestamp, indexed for chronological pagination.

### What Belongs in PostgreSQL vs Object Storage
* **In PostgreSQL**: User accounts, credentials, timestamps, friendship states, message metadata, file paths/object keys, play counters (`play_count`, `max_plays`).
* **In Object Storage**: Raw audio files (binary WAV/M4A/AAC blobs). Storing audio in PostgreSQL causes rapid database bloat, degrades IOPS, slows backups, and exhausts memory buffers.
* **Migration System**:
  - Structured migrations use Alembic in `backend/alembic/versions/`.
  - An ad-hoc convenience migration script `backend/migrate_db.py` exists to run `ALTER TABLE messages ADD COLUMN IF NOT EXISTS play_count ...` for rapid local environment synchronization.

---

## 8. API Map

### Endpoint Directory

| Method | Endpoint | Purpose | Authentication | Authorization | Main Handler / Service | Response Model / Type |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | Server liveness check | None (Public) | None | `main.health_check` | JSON `{"status": "ok", ...}` |
| `POST` | `/api/v1/auth/register` | Register new user account | None (Public) | None | `routes.auth.register` | `UserResponse` (201) |
| `POST` | `/api/v1/auth/login` | Authenticate with credentials | None (Public) | None | `routes.auth.login` | `Token` (JWT bearer) |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile | Required | Current User | `routes.auth.read_users_me` | `UserResponse` |
| `GET` | `/api/v1/users/search` | Search users by username/email | Required | Authenticated | `routes.users.search_users` | `List[UserResponse]` |
| `POST` | `/api/v1/friends/request/{friend_id}` | Send friend request | Required | Not self | `routes.friends.send_friend_request` | `FriendshipResponse` |
| `POST` | `/api/v1/friends/accept/{friend_id}` | Accept pending friend request | Required | Target is recipient | `routes.friends.accept_friend_request` | `FriendshipResponse` |
| `POST` | `/api/v1/friends/reject/{friend_id}` | Reject pending friend request | Required | Target is recipient | `routes.friends.reject_friend_request` | `FriendshipResponse` |
| `DELETE`| `/api/v1/friends/remove/{friend_id}` | Remove existing friend | Required | Either participant | `routes.friends.remove_friend` | JSON detail |
| `GET` | `/api/v1/friends/list` | List friends and pending requests | Required | Current User | `routes.friends.list_friends` | `FriendListResponse` |
| `POST` | `/api/v1/chat/send/{friend_id}` | Send text message | Required | Active friendship | `routes.chat.send_message` | `MessageResponse` |
| `POST` | `/api/v1/chat/audio/{friend_id}` | Upload singing audio message | Required | Active friendship | `routes.chat.send_audio_message` | `MessageResponse` |
| `GET` | `/api/v1/chat/history/{friend_id}` | Fetch paginated chat history | Required | Active friendship | `routes.chat.get_message_history` | `PaginatedMessages` |
| `GET` | `/api/v1/chat/audio/serve/{file_path:path}`| Stream/download audio (2-play rule)| Required | Conversation member | `routes.chat.serve_audio` | Binary `FileResponse` |
| `POST` | `/api/v1/audio/effects/apply` | Apply voice effect for preview | Required | Authenticated | `routes.effects.apply_audio_effect` | JSON `{"url": ..., ...}` |
| `GET` | `/api/v1/audio/effects/serve/{filename}` | Serve temporary effect preview | Required | Authenticated | `routes.effects.serve_effect_preview`| Binary `FileResponse` |

### In-Depth Request Flows

#### 1. Text Message Flow
```text
Mobile App
  │ POST /api/v1/chat/send/{friend_id} {"content": "Hello", "client_msg_id": "uuid"}
  ▼
Router (routes/chat.py)
  ├── 1. get_current_user: verifies Bearer JWT token -> user object
  ├── 2. Validation: checks content.strip() != "" and friend_id != current_user.id
  ├── 3. Authorization: checks active Friendship(status="accepted") in DB (or 403)
  ├── 4. get_or_create_conversation: retrieves existing or creates new (u1 < u2)
  ├── 5. Idempotency Check: queries Message WHERE client_msg_id = uuid (returns existing if found)
  ├── 6. Persistence: inserts Message row into PostgreSQL
  ▼
Response (MessageResponse JSON, HTTP 200)
```

#### 2. Audio Message Upload Flow
```text
Mobile App
  │ POST /api/v1/chat/audio/{friend_id} [multipart/form-data: file, duration, client_msg_id]
  ▼
Router (routes/chat.py)
  ├── 1. get_current_user: verifies JWT
  ├── 2. Authorization: checks active accepted friendship in DB
  ├── 3. get_or_create_conversation
  ├── 4. Storage Service:
  │        ├── validate_audio_file (checks extension, audio/* MIME, <= 10MB)
  │        └── upload_audio: generates server-side UUID key, writes file to disk or S3
  ├── 5. Persistence: creates Message row (audio_url = object_key, play_count = 0, max_plays = 2)
  │        └── on DB failure: catches exception, rolls back DB, calls delete_audio()
  ├── 6. URL Generation: resolves presigned URL or relative serve URL
  ▼
Response (MessageResponse JSON, HTTP 200)
```

#### 3. Ephemeral Audio Playback Flow (Two-Play Enforcement)
```text
Mobile App (Receiver)
  │ GET /api/v1/chat/audio/serve/chat_audio/{conv_id}/{filename}
  ▼
Router (routes/chat.py)
  ├── 1. Path Parsing: verifies path starts with "chat_audio" and extracts conv_id
  ├── 2. Authorization (IDOR Check): verifies current_user is member of Conversation(conv_id)
  ├── 3. Message Lookup: finds Message record by audio_url
  ├── 4. Play Count Check (Two-Play Gatekeeper):
  │        ├── If current_user is SENDER: bypasses limit (sender replay allowed)
  │        └── If current_user is RECEIVER:
  │              ├── Checks if msg.play_count >= msg.max_plays (2) -> 403 Forbidden ("Play limit reached")
  │              └── Increments msg.play_count by 1 and commits to DB
  ├── 5. File Retrieval: verifies physical file exists on disk/storage (or 404)
  ▼
Response (Streaming FileResponse "audio/wav", HTTP 200)
```

---

## 9. Authentication vs Authorization

### Fundamental Difference

| Concept | Question Answered | Definition | Implementation in Codebase |
| :--- | :--- | :--- | :--- |
| **Authentication (AuthN)** | *"Who are you?"* | Validating the identity of the user presenting credentials or a cryptographic token. | `backend/src/api/deps.py` (`get_current_user`), `backend/src/core/security.py` |
| **Authorization (AuthZ)** | *"Are you allowed to do this?"* | Verifying whether the authenticated user has permission to access the target resource. | Endpoint handlers in `routes/chat.py`, `routes/friends.py` |

### Where Each is Implemented

#### 1. Authentication Layer (`backend/src/api/deps.py`)
* The `get_current_user` dependency is injected into route signatures:
  ```python
  def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
  ```
* Flow:
  1. Extracts token from `Authorization: Bearer <token>` header.
  2. Decodes token using `jwt.decode(token, SECRET_KEY, algorithms=["HS256"], options={"require": ["exp"]})`.
  3. Rejects missing token, malformed token, wrong signature, `alg: none` attack, or expired token with `401 Unauthorized`.
  4. Looks up user by `sub` (username) in PostgreSQL. If user was deleted or does not exist, raises `401 Unauthorized`.

#### 2. Authorization Layer (Route Handlers)
Even with a valid authenticated `User`, the system performs explicit authorization checks:
* **Chat History & Messaging (`routes/chat.py:get_or_create_conversation`)**:
  - Verifies an active friendship exists between `current_user.id` and `friend_id` with `status == FriendshipStatus.accepted`.
  - If a stranger or non-friend attempts to message a user or read conversation history, the system rejects with `403 Forbidden` (`"Can only message active friends"`).
* **Audio Playback IDOR Protection (`routes/chat.py:serve_audio`)**:
  - Extracts `conv_id` from the file path.
  - Verifies `conv.user1_id == current_user.id or conv.user2_id == current_user.id`.
  - If an authenticated User C guesses User A's audio URL, the system detects User C is not in the conversation and returns `403 Forbidden` (`"Unauthorized to access this audio"`).
* **Friend Request Actions (`routes/friends.py:accept_friend_request`)**:
  - Queries `Friendship.filter(Friendship.user_id == friend_id, Friendship.friend_id == current_user.id)`.
  - Prevents a user from accepting a request that was sent to someone else (returns `404`).

---

## 10. Audio Architecture

### End-to-End Audio Pipeline

```text
  [ Device Microphone ]
           │
           ▼
  [ Expo Audio Recording ] (High-quality M4A/WAV captured in mobile sandbox)
           │
           ▼
  [ Voice Effect Auditioning ]
     ├── Mobile POSTs recording to /api/v1/audio/effects/apply
     ├── Backend FFmpeg decodes file to 44.1kHz mono PCM
     ├── Backend Pedalboard applies DSP preset (Baby, Cattish, Deep, Echo)
     ├── Backend writes preview WAV to temp_effects/
     └── Mobile downloads preview via FileSystem.downloadAsync and auditions locally
           │
           ▼
  [ Send Singing Message ]
     ├── Mobile uploads chosen audio file via multipart POST /api/v1/chat/audio/{friend_id}
     ├── Backend validate_audio_file checks MIME, extension, and 10MB limit
     ├── Storage Service writes file to chat_audio/{conv_id}/{user_id}_{uuid}.wav
     └── PostgreSQL records message row (play_count = 0, max_plays = 2)
           │
           ▼
  [ Receiver Playback & Enforcement ]
     ├── Receiver fetches message history; sees "▶ Play Audio (2 plays left)"
     ├── Receiver taps Play -> Mobile requests /api/v1/chat/audio/serve/{file_path}
     ├── Backend checks authorization and msg.play_count < msg.max_plays
     ├── Backend atomically increments msg.play_count by 1
     ├── Backend streams audio file bytes (FileResponse)
     ├── Mobile FileSystem.downloadAsync saves audio to sandbox and plays via expo-audio
     └── After 2 plays, backend permanently returns 403 Forbidden; Mobile UI displays "🔒 Locked"
```

### Detailed Pipeline Components

1. **Audio Validation (`src/services/storage.py`, `src/api/routes/effects.py`)**:
   - Supported file extensions: `.wav`, `.m4a`, `.mp3`, `.aac`.
   - MIME header validation: Must start with `audio/` (e.g. `audio/wav`, `audio/m4a`). Arbitrary binaries, shell scripts, and non-audio formats are rejected with `400 Bad Request`.
   - Size limit: 10 MB maximum. Files with 0 bytes return `400 Bad Request ("Empty audio file")`. Files over 10 MB return `413 Payload Too Large`.
2. **Audio Effects Engine (`src/services/audio_fx.py`)**:
   - Presets:
     - `baby`: Pitch shifted +9.0 semitones, 300Hz highpass filter, compression ratio 2.0, speed multiplier 1.15.
     - `cattish`: Pitch shifted +8.0 semitones, 500Hz highpass filter (removing low frequencies), compression ratio 3.0.
     - `deep`: Pitch shifted -6.0 semitones, 3000Hz lowpass filter, compression ratio 4.0.
     - `echo`: Delay 0.4s (feedback 0.4), Reverb room size 0.6, wet level 0.4.
   - Processing flow: Decoded via bundled FFmpeg (`imageio-ffmpeg`), read into NumPy arrays via SoundFile, processed through a `Pedalboard` graph, written to disk.
3. **Storage Service Abstraction (`src/services/storage.py`)**:
   - Implements `BaseStorageService` with `upload_audio`, `get_presigned_url`, `delete_audio`.
   - `LocalStorageService`: Stores in `data/audio/`. Serves audio via FastAPI route `/api/v1/chat/audio/serve/{path}`.
   - `S3StorageService`: Uploads to S3 bucket via Boto3, generates expiring presigned URLs (`generate_presigned_url('get_object', ExpiresIn=3600)`).
4. **Two-Play Limit Enforcement**:
   - Evaluated exclusively on the backend in `serve_audio`.
   - Receivers cannot play more than 2 times. If `msg.play_count >= msg.max_plays`, returns `403 Forbidden`.
   - Senders can listen to their own sent messages without incrementing the recipient's play count.

---

## 11. Future Errors and Failure Scenarios

| Failure | Where It Can Happen | Who Detects It | Who Handles It | Expected Response | User Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Missing Bearer Token** | Protected endpoints (`/chat/*`, `/friends/*`) | FastAPI OAuth2 dependency | `deps.get_current_user` | `401 Unauthorized` | Redirected to Login screen |
| **Expired JWT Token** | Any authenticated request | PyJWT signature verification | `deps.get_current_user` | `401 Unauthorized` | Prompted to re-login; session renewed |
| **Deleted / Nonexistent User in Token** | Any authenticated request | DB query in `get_current_user` | `deps.get_current_user` | `401 Unauthorized` | Auth token invalidated; logged out |
| **Cross-User IDOR (Audio Snooping)** | `/chat/audio/serve/{path}` | Path parsing & conversation lookup | `routes.chat.serve_audio` | `403 Forbidden` | Audio will not play; unauthorized access blocked |
| **Cross-User IDOR (Chat History)** | `/chat/history/{friend_id}` | Friendship validation | `routes.chat.get_or_create_conversation` | `403 Forbidden` | Cannot view messages of non-friends |
| **PostgreSQL Down / Timeout** | Any DB operation | SQLAlchemy connection pool | `core.exceptions.global_error_handler` | `500 Internal Server Error` | "Internal server error" alert; no DB internals leaked |
| **Duplicate Send (Network Retry)** | `/chat/send` or `/chat/audio` | `client_msg_id` index lookup | `routes.chat.send_message` | `200 OK` (Existing record) | No duplicate message created; smooth retry |
| **Empty or Whitespace Message** | `/chat/send/{friend_id}` | String `.strip()` check | `routes.chat.send_message` | `400 Bad Request` | Form shows validation error |
| **Oversized Message (>2000 chars)** | `/chat/send/{friend_id}` | Pydantic schema validation | FastAPI request validator | `422 Unprocessable Entity` | UI prevents sending text over limit |
| **Oversized Audio (>10MB)** | `/chat/audio` or `/audio/effects` | File size check | `storage_service.validate_audio_file` | `400 Bad Request` / `413` | Upload rejected; user notified file too large |
| **Invalid Audio Format / Shell Script**| `/chat/audio` or `/audio/effects` | MIME type & extension checks | `validate_audio_file` | `400 Bad Request` | Upload rejected |
| **Storage Succeeds, DB Commit Fails** | `/chat/audio/{friend_id}` | DB commit `try/except` block | `routes.chat.send_audio_message` | `500 Internal Server Error` | Backend deletes uploaded file rollback; no orphan blobs |
| **Storage Disk Full** | Audio upload or effect processing | OS `shutil.copyfileobj` | Route handler / Storage service | `500 Internal Server Error` | Upload fails gracefully |
| **Third Playback Attempt** | `/chat/audio/serve/{path}` | `msg.play_count >= msg.max_plays` | `routes.chat.serve_audio` | `403 Forbidden` | Button displays "🔒 Locked"; audio inaccessible |
| **Simultaneous Play Requests (Race)** | `/chat/audio/serve/{path}` | Database row lock / update | `routes.chat.serve_audio` | `200 OK` / `403 Forbidden` | Only allowed quota consumed |
| **Audio File Deleted on Disk** | `/chat/audio/serve/{path}` | `os.path.exists(full_path)` | `routes.chat.serve_audio` | `404 Not Found` | Alert: "Audio file not found" |
| **Microphone Permission Denied** | Mobile recording initialization | `getRecordingPermissionsAsync` | `AudioRecorder.tsx` | Alert in UI | Alert explains mic permission required |
| **Mobile Offline / Network Drop** | Mobile Axios request | Axios network error handler | Mobile try/catch blocks | Alert: Network Error | Alert displayed; UI remains responsive |
| **Preview Download Failure** | Effect preview generation | `FileSystem.downloadAsync` | `AudioRecorder.tsx` | Alert: Processing Failed | UI resets selected effect to Original |

---

## 12. Responsibility Matrix

| Responsibility | Mobile | Router | Service | Repository / Model | PostgreSQL | Object Storage |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **UI Rendering & Navigation** | **Owner** | - | - | - | - | - |
| **Microphone Audio Recording**| **Owner** | - | - | - | - | - |
| **JWT Storage & Header Attachment**| **Owner**| - | - | - | - | - |
| **HTTP Request Parsing & Status Codes**| - | **Owner** | - | - | - | - |
| **Input Validation (Pydantic / Types)**| - | **Owner** | - | - | - | - |
| **JWT Signature & Expiry Verification**| - | **Owner** (`deps`) | - | - | - | - |
| **Friendship Authorization** | - | **Owner** | - | - | - | - |
| **Two-Play Limit Enforcement** | - | **Owner** | - | - | **Owner** (Lock/Value)| - |
| **Voice Effect DSP (Pedalboard)** | - | - | **Owner** | - | - | - |
| **File Size & MIME Type Verification** | - | - | **Owner** | - | - | - |
| **Presigned URL Generation** | - | - | **Owner** | - | - | - |
| **Physical Audio File Persistence** | - | - | - | - | - | **Owner** |
| **Message & User Metadata Storage** | - | - | - | - | **Owner** | - |
| **Cascading Deletes & Unique Constraints**| - | - | - | **Owner** | **Owner** | - |

---

## 13. Where Do I Fix This?

| Problem / Bug Symptom | First Place To Inspect | Relevant Files |
| :--- | :--- | :--- |
| User cannot log in with valid password | Auth route & password hashing | `src/api/routes/auth.py`, `src/core/security.py` |
| Token expires too quickly or rejected unexpectedly | JWT configuration and claim validation | `src/core/security.py`, `src/api/deps.py` |
| Database migration failed or column missing | Alembic versions and migration runner | `backend/alembic/versions/`, `backend/migrate_db.py` |
| Friend request allowed to self or duplicate allowed | Friendship route constraints | `src/api/routes/friends.py`, `src/models/friendship.py` |
| Audio message upload fails with 400 or 413 | Storage validation rules and limits | `src/services/storage.py`, `src/api/routes/chat.py` |
| Audio effect processing is distorted or fails | Audio FX service presets & conversion | `src/services/audio_fx.py`, `src/api/routes/effects.py` |
| Audio can be played more than twice | Two-play gatekeeper check | `src/api/routes/chat.py:serve_audio`, `src/models/chat.py` |
| Audio preview cannot be downloaded on phone | Legacy FileSystem download and URL base | `mobile/src/components/AudioRecorder.tsx`, `mobile/src/api/client.ts` |
| Message ordering is mixed up or out of sequence | Chronological sorting in history query | `src/api/routes/chat.py:get_message_history`, `mobile/src/screens/HomeScreen.tsx` |
| Duplicate message created upon poor network connection | Client message ID idempotency logic | `src/api/routes/chat.py:send_message`, `src/schemas/chat.py` |
| Server leaks stack trace on unhandled crash | Global exception handler | `src/core/exceptions.py`, `src/main.py` |
| Mobile app cannot connect to backend server | Axios base URL configuration | `mobile/src/api/client.ts` (10.0.2.2 vs localhost vs LAN IP) |

---

## 14. Data Flow Examples

### 1. User Registration & Login
```text
Mobile Client                   FastAPI Router               PostgreSQL
      │                               │                           │
      ├─ POST /auth/register ────────►│                           │
      │  {username, email, password}  ├─ Hash password (bcrypt)   │
      │                               ├─ INSERT INTO users ──────►│
      │◄─ 201 Created (UserResponse) ─┤                           │
      │                               │                           │
      ├─ POST /auth/login ───────────►│                           │
      │  {username, password}         ├─ SELECT FROM users ──────►│
      │                               ├─ Verify password hash     │
      │                               ├─ Generate JWT (exp=60m)   │
      │◄─ 200 OK {access_token} ──────┤                           │
      │                               │                           │
   Saves to SecureStore               │                           │
   Sets default Axios header          │                           │
```

### 2. Adding a Friend
```text
Mobile Client                   FastAPI Router               PostgreSQL
      │                               │                           │
      ├─ POST /friends/request/{id} ─►│                           │
      │  (Bearer token attached)      ├─ get_current_user (AuthN) │
      │                               ├─ Check not self           │
      │                               ├─ Check no existing edge ─►│
      │                               ├─ INSERT friendships ─────►│
      │◄─ 200 OK (FriendshipResponse)─┤  (status = "pending")     │
```

### 3. Sending a Singing Audio Message
```text
Mobile Client                   FastAPI Router          Storage Service        PostgreSQL
      │                               │                        │                    │
   Records audio                      │                        │                    │
   Auditions effects                  │                        │                    │
      ├─ POST /chat/audio/{friend_id}►│                        │                    │
      │  [multipart: audio, client_id]├─ AuthN & AuthZ check   │                    │
      │                               ├─ upload_audio() ──────►│                    │
      │                               │  (Validate MIME & size)│                    │
      │                               │  (Write to disk/S3)    │                    │
      │                               │◄─ return object_key ───┤                    │
      │                               ├─ INSERT INTO messages ─────────────────────►│
      │                               │  (audio_url=key, play_count=0, max_plays=2) │
      │◄─ 200 OK (MessageResponse) ───┤                                             │
```

### 4. Playing a Singing Message (Two-Play Enforcement)
```text
Receiver Mobile                 FastAPI Router               PostgreSQL            Storage
      │                               │                           │                   │
      ├─ GET /chat/audio/serve/{path}►│                           │                   │
      │  (Bearer token attached)      ├─ get_current_user (AuthN) │                   │
      │                               ├─ Check conversation member│                   │
      │                               ├─ SELECT FROM messages ───►│                   │
      │                               ├─ Check msg.play_count < 2 │                   │
      │                               │  (If >= 2: 403 Forbidden) │                   │
      │                               ├─ UPDATE messages ────────►│                   │
      │                               │  play_count = play_count+1│                   │
      │                               ├─ Read binary file ───────────────────────────►│
      │◄─ 200 OK (Audio Binary Stream)┤                           │                   │
      │                               │                           │                   │
   Saves to local sandbox             │                           │                   │
   Plays via expo-audio player        │                           │                   │
```

---

## 15. Dependency Map

### Architectural Dependency Hierarchy
Dependencies must flow strictly downward through the layers:

```text
[ Mobile Application Layer ]
      │
      ▼
[ FastAPI Presentation Layer ] (routes, schemas, deps)
      │
      ▼
[ Business & Service Layer ] (audio_fx, storage)
      │
      ▼
[ Persistence & Model Layer ] (SQLAlchemy models, session)
      │
      ▼
[ Infrastructure Layer ] (PostgreSQL, Local Disk / AWS S3)
```

### Permitted vs Forbidden Dependencies

* **PERMITTED**:
  - Routers may import schemas, models, services, and core utilities.
  - Services may import core utilities, configuration, and storage drivers (Boto3, SoundFile).
  - Models may import declarative base and SQLAlchemy column types.
* **FORBIDDEN (Architectural Violations)**:
  - Models must NEVER import routers or services.
  - Services must NEVER import HTTP routers or depend on FastAPI request objects.
  - Schemas must NEVER query the database directly.
  - Mobile code must NEVER be trusted to calculate play limits, conversation permissions, or authentication claims.

---

## 16. Security Responsibilities

### Security Implementation Matrix

| Security Area | Status | Implementation Details in Codebase |
| :--- | :--- | :--- |
| **Authentication** | `IMPLEMENTED` | Stateless OAuth2 JWT tokens with HS256 algorithm; `get_current_user` dependency in `src/api/deps.py`. |
| **Password Hashing** | `IMPLEMENTED` | Bcrypt via Passlib (`pwd_context = CryptContext(schemes=["bcrypt"])`); passwords never stored in plaintext. |
| **JWT Expiration** | `IMPLEMENTED` | Expiration claim `exp` is mandatory (`options={"require": ["exp"]}`); tokens expire after 60 minutes. |
| **Secret Key Strength**| `IMPLEMENTED` | RFC 7518 compliant (>= 32 bytes). Uses 39-byte key loaded from `SECRET_KEY` environment variable. |
| **alg:none Attack Defense**| `IMPLEMENTED` | PyJWT rejects unsigned tokens or tokens specifying `alg: none`. |
| **Ghost User Defense** | `IMPLEMENTED` | Even if a token signature is valid, `get_current_user` verifies the user exists in PostgreSQL. |
| **IDOR (Chat History)**| `IMPLEMENTED` | Users can only access conversations where they are an active friend; blocked with `403 Forbidden`. |
| **IDOR (Private Audio)**| `IMPLEMENTED` | `serve_audio` verifies the requesting user is a member of the conversation owning the file. |
| **Path Traversal Defense**| `IMPLEMENTED`| Path parsing enforces `parts[0] == "chat_audio"`; server-side UUID filenames prevent path injection. |
| **File Upload Validation**| `IMPLEMENTED`| Enforces MIME type starting with `audio/`, accepted extensions, and strict 10MB maximum size limit. |
| **SQL Injection Defense** | `IMPLEMENTED`| Parameterized queries via SQLAlchemy ORM; effect presets validated against a strict dictionary whitelist. |
| **Error Leakage Prevention**| `IMPLEMENTED`| Global exception handler masks unhandled crashes as `{"detail": "Internal server error"}` with status 500. |
| **Two-Play Gatekeeper**| `IMPLEMENTED` | Server increments `play_count` and permanently blocks audio access when limit reached. |
| **CORS Lockdown** | `NOT IMPLEMENTED` (Dev)| Currently `allow_origins=["*"]` for development. Must be restricted to trusted domains in production. |
| **API Rate Limiting** | `NOT IMPLEMENTED` | Currently open to brute force login attempts. Planned for production via SlowAPI or reverse proxy. |
| **Refresh Tokens** | `PLANNED` | Refresh token rotation planned for future phases to support seamless session renewal. |

---

## 17. Testing Responsibilities

### Test Organization
* **Backend Unit & Integration Tests**: Located in `backend/tests/`. Built with `pytest` and `fastapi.testclient.TestClient`. Uses SQLite (`sqlite:///./test.db`) fixture for rapid isolated execution.
* **Security & Abuse Test Suite**: Located at root in `test_security.py`. Contains 36 exhaustive end-to-end security test cases against the live running server.
* **Audio Effects Test Suite**: Located at root in `test_effects_api.py`. Tests DSP presets, preview generation, concurrency, and corrupt file handling.
* **Audio Flow Integration Test**: Located in `backend/test_audio_flow.py`. Verifies two-user registration, friendship, audio upload, and download.
* **Mobile Tests**: Currently no automated mobile component tests exist (`Jest` / `React Native Testing Library` not configured).

### Test Coverage Matrix

| Component | Current Tests | Missing Tests |
| :--- | :--- | :--- |
| **Authentication** | `test_auth.py` (8 tests): register, duplicate user, login, bad credentials, missing token, expired token, invalid token | Password reset flow, refresh token renewal |
| **Friends System** | `test_friends.py` (8 tests): self request, duplicate, reverse, already accepted/rejected, delete friend, nonexistent user | Mutual friends discovery, friend search pagination |
| **Chat & Messaging**| `test_chat.py` (12 tests): unauthorized access, self messaging, whitespace rejection, message length limit, pagination, ordering, idempotency | Soft-deleting messages, read receipts |
| **Audio Processing** | `test_effects_api.py` (9 suites): 4 presets, 100ms short audio, silence, 0-byte file, fake audio, unknown effect, concurrency | Extreme multi-minute audio files, stereo downmixing |
| **Security & Abuse**| `test_security.py` (36 tests): alg:none, IDOR, path traversal, oversized file, script upload, SQL injection, token expiry | Distributed rate limiting, replay attack defense |
| **Mobile Client** | None (Manual verification via Expo dev client) | Automated component render tests, SecureStore mock tests |

---

## 18. If We Add This Feature... (Future Change Guide)

| Future Feature | Layers to Modify | Specific Files to Update |
| :--- | :--- | :--- |
| **New Voice Filter (e.g. Robot / Autotune)** | Audio DSP Service & Mobile UI | Add preset to `src/services/audio_fx.py:PRESETS`; add button in `mobile/src/components/AudioRecorder.tsx` |
| **User Blocking System** | DB Model, Migration, Route, AuthZ | New `blocked_users` model; migration; check block status in `routes/friends.py` & `routes/chat.py` |
| **Realtime WebSockets (Live Typing / Pushes)** | Backend Realtime Router & Mobile Socket Client | Add WebSocket manager in `src/main.py`; connect WebSocket in `mobile/src/context/AuthContext.tsx` |
| **Read Receipts & Delivery Checkmarks** | DB Model, Chat Schemas, Mobile Screen | Add `read_at` column to `Message`; update `MessageResponse`; render checkmarks in `HomeScreen.tsx` |
| **Push Notifications (FCM / APNs)** | Backend Notification Service & Mobile Expo Config | Add `notification_tokens` table; send push via Expo Server SDK on new message in `routes/chat.py` |
| **Production S3 / MinIO Deployment** | Environment Config & Infrastructure | Set `STORAGE_BACKEND=s3` in `.env`; provide AWS credentials and bucket in `src/core/config.py` |
| **User Avatars & Profile Pictures** | DB Model, Storage Service, Mobile Profile | Add `avatar_url` to `User`; add avatar upload endpoint; display avatar in `HomeScreen.tsx` |

---

## 19. Architecture Rules

1. **PostgreSQL Is the Single Source of Truth**: Relational entities, friendships, and play limits must be stored and locked in PostgreSQL. Never rely on in-memory counters or client state for business rules.
2. **Audio Blobs Belong in Object Storage**: Never store binary audio blobs in PostgreSQL columns. Audio files must be stored on disk or S3; only metadata and object paths belong in the database.
3. **The Mobile Client Is Untrusted**: The client must never enforce security or business rules. Play counts, message authorization, and friendship access must be validated strictly on the backend.
4. **Enforce Two-Play Exclusively on the Server**: The backend must gate audio serving. Once `play_count >= max_plays`, permanent `403 Forbidden` must be returned regardless of device, user reinstall, or parameters.
5. **Keep Routers Focused**: Routers are HTTP presentation controllers. Complex DSP algorithms belong in `src/services/audio_fx.py`; file operations belong in `src/services/storage.py`.
6. **Preserve Explicit Security Controls**:
   - Never allow unsigned or `alg: none` JWTs.
   - Require token expiration (`options={"require": ["exp"]}`).
   - Maintain a minimum 32-byte secret key for HS256.
   - Always validate conversation ownership before serving audio files (prevent IDOR).
7. **Idempotency on State-Changing Writes**: Always accept and verify client-generated UUIDs (`client_msg_id`) to prevent duplicate message creation caused by network retries.
8. **Do Not Over-Engineer**: Avoid introducing unnecessary microservices, message queues, or distributed caches until actual user scale demands them. Keep the architecture straightforward and production-like.

---

## 20. What I Should Understand as the Developer (Learning Notes)

### 1. Client / Server Architecture
* **What it is**: A distributed architecture dividing tasks between service requesters (the mobile client) and service providers (the FastAPI backend).
* **Why this project needs it**: Audio recording and user interface happen on mobile devices, while identity verification, message history storage, and ephemeral play-limit rules must be centralized.
* **Where it appears in our code**: React Native client in `mobile/` communicating over HTTP to FastAPI server in `backend/src/`.
* **What can go wrong**: The client assuming it can make decisions (e.g. tracking play counts locally), which malicious users can easily bypass.

### 2. HTTP / HTTPS & REST APIs
* **What it is**: Hypertext Transfer Protocol and Representational State Transfer architectural principles utilizing standard HTTP verbs (`GET`, `POST`, `DELETE`) and status codes (200, 201, 400, 401, 403, 404, 422, 500).
* **Why this project needs it**: Provides predictable, standardized contracts between the mobile app and backend services.
* **Where it appears in our code**: `src/api/routes/` defining `@router.get`, `@router.post`, and `@router.delete`.
* **What can go wrong**: Using wrong HTTP status codes (e.g. returning 200 with an error body), which confuses client error-handling libraries.

### 3. Stateless Authentication (JWT)
* **What it is**: JSON Web Tokens containing digitally signed claims (`sub`, `exp`) that verify user identity without requiring server-side session lookups in memory.
* **Why this project needs it**: Allows the backend to remain horizontally scalable and stateless while ensuring authenticated requests cannot be forged.
* **Where it appears in our code**: `src/core/security.py:create_access_token` and `src/api/deps.py:get_current_user`.
* **What can go wrong**: Token expiration omitted (tokens valid forever), weak secret keys crackable via brute-force, or leaking secret keys in version control.

### 4. Authorization & Insecure Direct Object References (IDOR)
* **What it is**: Ensuring an authenticated user only accesses data they own or are explicitly granted access to. IDOR occurs when an endpoint exposes an object ID without verifying permissions.
* **Why this project needs it**: Without authorization checks, User A could guess User B's message IDs or audio file paths and listen to private recordings.
* **Where it appears in our code**: `routes/chat.py:serve_audio` checking conversation membership before serving files.
* **What can go wrong**: A developer adding an endpoint like `/audio/{id}` that returns files without verifying if `current_user` belongs to that conversation.

### 5. PostgreSQL & ACID Transactions
* **What it is**: A relational database providing Atomicity, Consistency, Isolation, and Durability across operations.
* **Why this project needs it**: Ensures that social edges (friendships) and message counters (`play_count`) are updated reliably without race conditions.
* **Where it appears in our code**: `src/db/session.py`, `src/models/`, and SQLAlchemy queries in `routes/`.
* **What can go wrong**: Database connection leaks when sessions are not properly closed in `finally` blocks, or uncommitted transactions causing data loss.

### 6. Object Storage vs Relational Storage
* **What it is**: Storing unstructured binary blobs (audio files) in flat key-value object storage rather than database tables.
* **Why this project needs it**: Relational databases suffer severe performance degradation when storing large binary files (bloat, buffer eviction, slow backups).
* **Where it appears in our code**: `src/services/storage.py` (Local disk and S3 services).
* **What can go wrong**: Storage and database getting out of sync (e.g. file uploaded to storage but database insert fails, creating orphaned files).

### 7. File Uploads & Multipart Form Data
* **What it is**: Encoding binary data and form fields together using HTTP `multipart/form-data` with boundary delimiters.
* **Why this project needs it**: Required for uploading raw recorded audio along with metadata (`audio_duration_ms`, `client_msg_id`).
* **Where it appears in our code**: `routes/chat.py:send_audio_message` and `mobile/src/api/chat.ts`.
* **What can go wrong**: Client setting incorrect boundary headers, or backend exhausting memory by reading entire large files into RAM instead of streaming.

### 8. Concurrency & Race Conditions
* **What it is**: Bugs that occur when two requests attempt to read and modify the same resource simultaneously.
* **Why this project needs it**: Two simultaneous play requests for a message with 1 play left must not both succeed (the Two-Play rule must hold).
* **Where it appears in our code**: `routes/chat.py:serve_audio` incrementing `play_count` in database transactions.
* **What can go wrong**: Read-modify-write cycles in Python memory allowing users to exceed the two-play limit.

### 9. Network Failures & Idempotency
* **What it is**: Network packets dropping after the server processes a request, causing the client to retry. Idempotency guarantees multiple identical requests produce the same result as a single request.
* **Why this project needs it**: Mobile networks frequently drop connections. Without idempotency, a retry causes duplicate messages in chat.
* **Where it appears in our code**: `client_msg_id` unique column in `Message` model and duplicate check in `routes/chat.py:send_message`.
* **What can go wrong**: Duplicate audio messages being charged multiple times or cluttering conversation history.
