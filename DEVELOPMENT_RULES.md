# Development Rules

## Philosophy
1. Do not over-engineer.
2. Do not introduce unnecessary frameworks.
3. Do not redesign completed architecture without justification.
4. Prefer simple production-like solutions.
5. Explain important architectural decisions before implementation.
6. Keep responsibilities separated clearly.
7. Write tests for important business logic.
8. Consider edge cases before declaring a feature complete.
9. Never silently change existing behavior.
10. Preserve existing working functionality.

## Educational Context (CN Learning)
When implementing networking-related features, identify relevant concepts:
- HTTP
- HTTPS
- TCP
- DNS
- REST
- WebSocket/realtime
- latency
- connection failure
- file upload
- authentication
- authorization

Explain them in the context of this application, without giving unnecessary textbook explanations. See `CN_CONCEPTS.md` for the core mappings.

## Security & Business Logic
- **Two-Play Rule**: The mobile client must NEVER be trusted to enforce the maximum-two-play restriction. The backend/database must enforce it. A user must not be able to bypass the limit by reinstalling the app, changing devices, modifying the client, or changing request parameters.
- Never expose secrets, API keys, JWT secrets, private audio, or database credentials.
- Do not trust client-provided authorization information.
- The backend must enforce all business rules.
- Mobile UI logic must be kept separate from backend business logic.

## Storage
- Audio files must not be stored directly inside PostgreSQL unless there is a very specific reason.
- Store audio in object storage and metadata in PostgreSQL.

## Workflow
- Before doing any work, read `PROJECT_STATE.md`, `DEVELOPMENT_RULES.md`, `ARCHITECTURE.md`, `DECISIONS.md`, and `CN_CONCEPTS.md`.
- Determine the exact current phase and subphase and continue from that state. Do not restart completed work.
- Make changes incrementally. Do not modify unrelated files.
- Do not delete working code unless explicitly required.
- After every meaningful task, update `PROJECT_STATE.md`.
- Never claim a task is complete unless implementation exists, relevant tests pass, existing tests still pass, and edge cases have been considered. 
- If a task cannot be completed: mark it BLOCKED and explain why. Do not hide failures.
- At the end of every session, leave the project in a recoverable state.

## Testing Requirements
For every feature test:
1. Happy path
2. Invalid input
3. Unauthorized access
4. Missing data
5. Duplicate request
6. Network failure where applicable
7. Boundary conditions
8. Concurrency/race conditions where applicable
