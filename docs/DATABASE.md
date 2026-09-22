# ConnectChat Database Architecture & Design

ConnectChat utilizes a fully normalized relational schema designed for high-concurrency real-time messaging, WebRTC signaling tracking, and zero-leak privacy controls.

---

## Entity-Relationship Overview

```
                      +-------------------+
                      |       users       |
                      +-------------------+
                       /        |        \
                      /         |         \
           1:N       /      1:N |      1:N \
+-------------------+ +-------------------+ +-------------------+
|    auth_tokens    | |  call_records     | |   notifications   |
+-------------------+ +-------------------+ +-------------------+
                        \                 /
                         \               /
                          v             v
             +-------------------------------+
             |      connection_requests      |
             +-------------------------------+
                            |
                     1:N    |   1:N
             +--------------+--------------+
             |                             |
             v                             v
+------------------------+     +------------------------+
|      chat_groups       |     |     conversations      |
+------------------------+     +------------------------+
      |            |                |             |
  1:N |        1:N |            1:N |         1:N |
      v            v                v             v
+-----------+ +-----------+   +-----------+ +-----------+
|group_mem  | |group_msg  |   |conv_mem   | | messages  |
+-----------+ +-----------+   +-----------+ +-----------+
                                                  |
                                              1:N |
                                                  v
                                            +-----------+
                                            |attachments|
                                            +-----------+
```

---

## Detailed Table Schemas

### 1. `users`
Core user identity, credentials, and real-time presence.
- `id` (BIGINT, PK, AUTO_INCREMENT)
- `full_name` (VARCHAR(100), NOT NULL)
- `username` (VARCHAR(50), NOT NULL, UNIQUE, INDEX)
- `email` (VARCHAR(150), NOT NULL, UNIQUE, INDEX)
- `password_hash` (VARCHAR(255), NOT NULL, BCrypt 12-round hash)
- `bio` (VARCHAR(255), DEFAULT '')
- `avatar_url` (VARCHAR(500), optional image path)
- `bg_wallpaper` (VARCHAR(500), optional custom chat background)
- `is_online` (BOOLEAN, DEFAULT FALSE)
- `last_seen` (DATETIME, timestamp of last user action)
- `is_email_verified` (BOOLEAN, DEFAULT TRUE)
- `created_at`, `updated_at` (DATETIME)

### 2. `auth_tokens`
Cryptographic session tokens issued upon login/registration.
- `id` (BIGINT, PK)
- `token` (VARCHAR(255), UNIQUE, INDEX)
- `user_id` (BIGINT, FK -> users.id, ON DELETE CASCADE, INDEX)
- `created_at` (DATETIME)
- `expires_at` (DATETIME)

### 3. `conversations`
Unified conversation container for 1-to-1 private chats and future group conversions.
- `id` (BIGINT, PK)
- `type` (VARCHAR(20), `PRIVATE` or `GROUP`, INDEX)
- `title` (VARCHAR(150), nullable for private chats)
- `avatar_url` (VARCHAR(500))
- `creator_id` (BIGINT, FK -> users.id)
- `created_at`, `updated_at` (DATETIME, INDEX on updated_at for conversation ordering)

### 4. `conversation_members`
Participant membership mapping with user-specific preferences and privacy watermarks.
- `id` (BIGINT, PK)
- `conversation_id` (BIGINT, FK -> conversations.id, ON DELETE CASCADE)
- `user_id` (BIGINT, FK -> users.id, ON DELETE CASCADE)
- `role` (VARCHAR(20), `ADMIN`, `MEMBER`)
- `is_muted` (BOOLEAN, DEFAULT FALSE)
- `is_archived` (BOOLEAN, DEFAULT FALSE)
- `cleared_at` (DATETIME, watermark for "Delete for Me" feature)
- `last_read_message_id` (BIGINT)
- `joined_at` (DATETIME)
- **Constraint**: `UNIQUE(conversation_id, user_id)`

### 5. `messages`
Individual message records.
- `id` (BIGINT, PK)
- `conversation_id` (BIGINT, FK -> conversations.id, INDEX)
- `sender_id` (BIGINT, FK -> users.id, INDEX)
- `receiver_id` (BIGINT, FK -> users.id, INDEX)
- `content` (TEXT, up to 4000 characters)
- `message_type` (VARCHAR(20), `TEXT`, `IMAGE`, `VIDEO`, `DOCUMENT`, `AUDIO`)
- `media_url` (LONGTEXT, public URL or path)
- `media_metadata` (TEXT, original filename, dimensions, duration, or size)
- `replied_message_id` (BIGINT, FK -> messages.id, ON DELETE SET NULL)
- `deleted_for_everyone` (BOOLEAN, DEFAULT FALSE)
- `deleted_at` (DATETIME)
- `sent_at` (DATETIME, INDEX)
- `status` (VARCHAR(20), `SENT`, `DELIVERED`, `READ`, INDEX)

### 6. `message_attachments`
Granular tracking for media files associated with messages.
- `id` (BIGINT, PK)
- `message_id` (BIGINT, FK -> messages.id, ON DELETE CASCADE, INDEX)
- `original_file_name` (VARCHAR(255))
- `stored_file_name` (VARCHAR(255))
- `file_type` (VARCHAR(100))
- `file_size` (BIGINT)
- `storage_path` (VARCHAR(500))
- `uploaded_at` (DATETIME)

### 7. `chat_groups` & `group_members` & `group_messages`
Multi-party messaging groups with instant broadcasts.

### 8. `stories` & `story_views`
Ephemeral 24-hour status stories with viewer tracking.

### 9. `call_records`
Persistent call logs for WebRTC audio/video call sessions.
- `caller_id`, `receiver_id` (BIGINT, FK -> users.id)
- `call_type` (`audio`, `video`)
- `status` (`MISSED`, `ACCEPTED`, `REJECTED`, `ENDED`)
- `started_at`, `ended_at`, `duration_seconds`

---

## Indexing & Performance Strategy
1. **Chat Chronology**: `messages(conversation_id, sent_at ASC)` optimizes fast paging and thread rendering.
2. **Unread Counts**: Composite index on `(receiver_id, status)` makes counting unread messages an instant index-only scan.
3. **Delete For Me Watermarking**: `cleared_at` on `conversation_members` eliminates expensive per-message deletion tables; messages sent before `cleared_at` are skipped at query execution.
4. **Active Sessions**: Fast token verification through unique index on `auth_tokens(token)`.
