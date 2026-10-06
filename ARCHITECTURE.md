# System Architecture

## 1. Components
- **Mobile Client**: Built with React Native and Expo. Handles UI, local audio recording, applying effects, and playing audio.
- **API Server**: Built with FastAPI (Python). Exposes RESTful endpoints for the mobile client.
- **Database**: PostgreSQL (via SQLAlchemy). Stores relational data (users, friendships, message metadata, play counts).
- **Object Storage**: S3-compatible storage (e.g., AWS S3, MinIO). Stores the physical audio files.
- **Realtime Server**: Simple WebSocket manager within the FastAPI application.

## 2. Responsibilities
- **Mobile Client**: Rendering the UI, gathering user input, handling audio recording/playback logic locally, displaying realtime notifications. It is specifically untrusted for business logic (like play limits).
- **API Server**: Authentication, enforcing the Two-Play rule, generating presigned URLs, orchestrating data between the Database and the Mobile Client.
- **Database**: Ensuring data consistency, transactional integrity, tracking the exact number of times a message has been requested for playback.
- **Object Storage**: Serving static binary blobs securely (using short-lived presigned URLs).
- **Realtime Server**: Pushing lightweight notifications to the client (e.g., "New message received", "Friend signed up").

## 3. Data Flow
- **General Flow**: 
  Mobile Client → HTTPS Request → FastAPI Server → PostgreSQL Query → FastAPI Response → HTTPS Response → Mobile Client.

## 4. Audio Flow
- **Recording**: Captured by device microphone via Expo AV.
- **Upload**: Client requests a presigned upload URL from FastAPI. FastAPI generates it. Client PUTs the audio directly to Object Storage. Client notifies FastAPI that upload is complete.
- **Playback**: Client requests audio access from FastAPI. FastAPI checks Two-Play rule. If valid, FastAPI increments counter and returns a presigned download URL. Client fetches audio directly from Object Storage.

## 5. Authentication Flow
- **Login/Signup**: User provides credentials. FastAPI validates and issues a stateless JSON Web Token (JWT).
- **Authorization**: The JWT is attached to the `Authorization: Bearer <token>` header on subsequent requests. FastAPI verifies the token signature before processing the request.

## 6. Message Flow
- **Creation**: User records audio. Uploads to Object Storage. Client sends message metadata (recipient_id, object_key, duration) to FastAPI.
- **Storage**: FastAPI creates a `Message` record in PostgreSQL.
- **Notification**: FastAPI publishes a "new message" event to the WebSocket manager, which pushes it to the recipient if they are connected.

## 7. Two-Play Playback Flow
- **Strict Enforcement**: The two-play rule is enforced exclusively by the backend API.
- **Flow**:
  1. Client sends `POST /messages/{id}/play` or requests the serve URL.
  2. FastAPI issues an atomic SQL `UPDATE` to increment the `play_count`: `UPDATE messages SET play_count = play_count + 1 WHERE id = X AND play_count < 2 RETURNING play_count`.
  3. If the query returns 0 updated rows, it means the count was already 2 (or message doesn't exist). FastAPI responds with `403 Forbidden` (or 404).
  4. By using a database-level lock/atomic increment, we prevent race conditions where simultaneous requests read a low count and increment it in memory.
  5. If successful, FastAPI generates a short-lived presigned URL from Object Storage (or serves the local path).
  6. FastAPI responds with `200 OK` and the URL.
  7. Mobile client uses the URL to stream the audio.

## 8. Storage Architecture
- **PostgreSQL**: Stores relational metadata. Entities: `Users`, `Friendships`, `Messages`.
- **Object Storage**: A flat bucket structure (e.g., `messages/`). Files are named using UUIDs to prevent guessing (e.g., `messages/{uuid}.m4a`).

## 9. Realtime Architecture
- **WebSocket Connection**: Established upon app launch, authenticated via JWT.
- **Pub/Sub Mechanism**: FastAPI maintains an in-memory dictionary mapping `user_id` to `WebSocket` connection.
- **Events**: Sent as JSON payloads. Used purely for signaling (e.g., pulling a new list of messages), not for heavy payload transfer.

## 10. Deployment Architecture (Target)
- **Mobile**: Compiled to iOS/Android via Expo Application Services (EAS).
- **Backend API**: Containerized via Docker, deployed to a Platform as a Service (e.g., Render, Heroku) or a VPS.
- **Database**: Managed PostgreSQL instance (e.g., Supabase, Neon, AWS RDS).
- **Object Storage**: Managed bucket (e.g., AWS S3, Cloudflare R2).
