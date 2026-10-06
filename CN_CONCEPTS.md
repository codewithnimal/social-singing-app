# Computer Networking Concepts

This document maps core networking concepts directly to how they are implemented and utilized in our mobile social singing application.

## Client/Server Architecture
- **Client**: The React Native application running on the user's mobile device. It initiates requests and displays data.
- **Server**: The FastAPI application hosted remotely. It waits for incoming client requests, processes them, enforces business logic (like the two-play rule), and sends back responses.

## IP (Internet Protocol)
- **Concept**: The unique address assigned to both the client device and the server.
- **Application Context**: Our FastAPI server will be assigned a public IP address when deployed. Clients use this IP to route their HTTP requests across the internet to reach our backend.

## Ports
- **Concept**: Logical endpoints for communication on a single device.
- **Application Context**: Our local FastAPI server will run on a specific port (e.g., `8000`). The PostgreSQL database listens on port `5432`. When the client connects, it targets `http://<server-ip>:8000`. In production, standard ports like `443` for HTTPS will be used.

## DNS (Domain Name System)
- **Concept**: Translates human-readable domain names into IP addresses.
- **Application Context**: In production, the mobile app will not hardcode an IP address. It will use a domain like `api.singingapp.com`. The OS resolves this domain to our server's IP via DNS before initiating the TCP connection.

## TCP (Transmission Control Protocol)
- **Concept**: The reliable, connection-oriented protocol underlying HTTP and WebSockets.
- **Application Context**: Before the mobile app can send a REST request to FastAPI, a TCP handshake (SYN, SYN-ACK, ACK) occurs. This ensures packets (like an audio file metadata upload) are delivered in order and retransmitted if lost.

## HTTPS (HTTP Secure)
- **Concept**: HTTP encrypted over TLS/SSL.
- **Application Context**: Critical for security. When users send audio or their JWT token, HTTPS encrypts the TCP connection so intermediate routers or public Wi-Fi operators cannot intercept or modify the two-play rule logic or steal the audio.

## HTTP Request/Response
- **Concept**: The foundational message exchange format.
- **Application Context**: 
  - **Request**: The client sends a request (e.g., `GET /messages/123`, Headers: `Authorization: Bearer <token>`).
  - **Response**: The server replies with a status code (`200 OK` or `403 Forbidden` if already played twice) and a JSON body containing the presigned URL.

## REST (Representational State Transfer)
- **Concept**: An architectural style for building APIs using standard HTTP methods.
- **Application Context**: We map CRUD operations to HTTP methods:
  - `POST /users` (Create user)
  - `GET /friends` (List friends)
## Authentication
- **Concept**: Verifying the identity of a client.
- **Application Context**: Implemented using HTTP Basic/Form Data for the initial `/login` request. The client sends a `username` and `password`. The server verifies this against the bcrypt-hashed password stored in PostgreSQL.

## Authorization (JWT)
- **Concept**: Determining if a verified user has access to a specific resource.
- **Application Context**: Implemented using JSON Web Tokens (JWT). Upon successful login, the server issues a stateless JWT. The client stores this in `expo-secure-store` and attaches it to the `Authorization: Bearer <token>` header on subsequent requests. The server validates the cryptographic signature (using `HS256`) to authorize access to protected endpoints like `/me` without needing to query the database for session state.

## REST vs Realtime Messaging
- **REST Request (HTTP)**: A stateless, unidirectional communication model. The client (mobile app) must explicitly open a connection, send a request (e.g., `POST /chat/send`), and wait for a response. Once the response is received, the transaction is complete. The server cannot initiate contact with the client. If the client wants to know if there are new messages, it must repeatedly ask the server (polling).
- **Realtime Messaging (WebSockets)**: A stateful, bidirectional, persistent communication channel established over a single TCP connection. After the initial handshake, the connection remains open. This allows the server to proactively *push* data (like a new chat message) to the client the exact millisecond it arrives, without the client needing to ask. This is vastly more efficient for chat applications than REST polling, saving battery life, bandwidth, and reducing latency.

## Latency
- **Concept**: The time it takes for data to travel from the client to the server and back.
- **Application Context**: Important for the "Preview" and "Listen" loops. High latency in generating the presigned URL or downloading the audio from Object Storage will result in a sluggish user experience. We mitigate this by keeping object storage geographically close to the API server.

## File Transfer
- **Concept**: Moving large binary data across the network.
- **Application Context**: Audio files are not sent through FastAPI, which would bottleneck the API server. Instead, we use "out-of-band" file transfer. The API provides a secure, temporary ticket (presigned URL), and the client transfers the file directly to Object Storage via HTTP PUT (upload) or GET (download).
