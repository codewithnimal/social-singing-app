# Audio Processing and Upload Pipeline

This document maps the entire end-to-end pipeline of the Social Singing App from the moment the user clicks "Record" to when the receiver downloads the audio. It also outlines the potential errors that can occur at each node.

## Pipeline Architecture Graph

```mermaid
flowchart TD
    subgraph Mobile Client
        A[User Records Audio] --> B[OfflineAudioContext DSP Filters]
        B --> C[File System WAV Encoding]
        C --> D[Multipart API Request]
    end

    subgraph Backend API
        D -->|POST /chat/audio/{friend_id}| E[FastAPI Auth & Validation]
        E --> F[Storage Service (Local/S3)]
        F --> G[PostgreSQL Metadata Save]
    end

    subgraph Receiver Client
        H[Fetch Chat History] -->|GET /chat/history/{friend_id}| I[FastAPI Returns Presigned URL]
        I --> J[Receiver Downloads Audio]
        J -->|GET /chat/audio/serve/{path}| K[FastAPI Serves Local Audio File]
    end
    
    G -.-> H
```

## Nodes and Potential Errors

### 1. Mobile Client (Recording)
* **Node:** `User Records Audio` (`expo-audio`)
* **Possible Errors:**
  * `PermissionDeniedError`: User denied microphone permissions.
  * `DeviceResourceError`: OS killed the recording process or microphone is occupied by another app.

### 2. Mobile Client (DSP Filters)
* **Node:** `OfflineAudioContext DSP Filters` (Pitch, Echo, Kongu logic)
* **Possible Errors:**
  * `OutOfMemory (OOM)`: Buffer size too large if recording is extremely long.
  * `ContextFailedError`: Browser engine failed to allocate audio context limits.

### 3. Mobile Client (WAV Encoding)
* **Node:** `File System WAV Encoding` (`expo-file-system`)
* **Possible Errors:**
  * `StorageFullError`: User's device is out of storage space.
  * `WriteAccessError`: App cache directory is corrupted or inaccessible.

### 4. Mobile Client (Network Upload)
* **Node:** `Multipart API Request`
* **Possible Errors:**
  * `NetworkTimeout`: Poor connection drops the large file upload.
  * `NetworkRequestFailed`: Backend server is down or unreachable.

### 5. Backend (Validation)
* **Node:** `FastAPI Auth & Validation` (`api/routes/chat.py`)
* **Possible Errors:**
  * `401 Unauthorized`: Token expired or invalid.
  * `403 Forbidden`: Users are no longer active friends.
  * `400 Bad Request`: File size > 10MB (`Payload Too Large`), or unsupported `.txt` file instead of audio (`Invalid content type`).

### 6. Backend (Object Storage)
* **Node:** `Storage Service` (`services/storage.py`)
* **Possible Errors:**
  * `500 Internal Server Error`: Disk full on server, missing folder permissions, or MinIO/S3 bucket is unreachable (`boto3.exceptions.ClientError`).

### 7. Backend (Database Save)
* **Node:** `PostgreSQL Metadata Save`
* **Possible Errors:**
  * `OperationalError`: Database connection dropped.
  * `IntegrityError`: `client_msg_id` collision (though handled idempotently).
  * **Note:** We implemented rollback consistency so if this node fails, the storage node deletes the uploaded file to avoid orphaned audio.

### 8. Receiver (Fetch History)
* **Node:** `Fetch Chat History`
* **Possible Errors:**
  * `401 Unauthorized`: Receiver's token expired.
  * Pagination limit issues if requested too many messages.

### 9. Receiver (Download Audio)
* **Node:** `FastAPI Serves Local Audio` (`/chat/audio/serve/{path}`)
* **Possible Errors:**
  * `404 Not Found`: File was deleted from the server disk or path is wrong.
  * `403 Forbidden`: A malicious user guessed the URL but isn't part of the conversation.
