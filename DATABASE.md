# Database Architecture

## Users
- `id` (PK)
- `username`, `email`, `hashed_password`

## Friendships
- `id` (PK)
- `user_id` (FK User)
- `friend_id` (FK User)
- `status` (pending, accepted, rejected)
- Unique constraint on (user_id, friend_id)

*(Phase 4 Chat models will be added here)*
