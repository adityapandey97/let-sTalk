# Let's Talk — Relational Database Architecture

The application uses an optimized, fully normalized relational database schema compatible with MySQL 8.0+ and H2 in MySQL compatibility mode.

---

## Entity-Relationship Diagram

```
                      +-------------------+
                      |       users       |
                      +-------------------+
                       /   |    |    \    \
             1:N      /    |    |     \    \ 1:N
   +-----------------+     |    |      \    +-----------------+
   |   connections   |     |    |       \   |      calls      |
   +-----------------+     |    |        \  +-----------------+
                           |    |         \
                    1:N    |    | 1:N      \ 1:N
         +-----------------+    +--------+  +-----------------+
         |                               |  |     stories     |
         v                               v  +-----------------+
+-----------------+             +-----------------+   |
|     groups      |             |  conversations  |   | 1:N
+-----------------+             +-----------------+   v
         | 1:N                           | 1:N      +-----------------+
         v                               v          |   story_views   |
+-----------------+             +-----------------+ +-----------------+
|  group_members  |             |  conv_members   |
+-----------------+             +-----------------+
                                         | 1:N
                                         v
                                +-----------------+
                                |    messages     |
                                +-----------------+
                                         | 1:N
                                         v
                                +-----------------+
                                |   attachments   |
                                +-----------------+
```

---

## Detailed Table Specifications

### 1. `users`
Stores user authentication credentials, profiles, and live presence.
- `id` (BIGINT, PK, AUTO_INCREMENT)
- `full_name` (VARCHAR(100), NOT NULL)
- `username` (VARCHAR(50), NOT NULL, UNIQUE, INDEX)
- `email` (VARCHAR(150), NOT NULL, UNIQUE, INDEX)
- `password_hash` (VARCHAR(255), NOT NULL, BCrypt)
- `bio` (VARCHAR(255), DEFAULT '')
- `profile_photo` (VARCHAR(500), DEFAULT '')
- `is_online` (BOOLEAN, DEFAULT FALSE, INDEX)
- `last_seen` (DATETIME)
- `created_at`, `updated_at` (DATETIME, NOT NULL)

### 2. `connections`
Defines 1-to-1 relationships and friendships between users.
- `id` (BIGINT, PK, AUTO_INCREMENT)
- `sender_id` (BIGINT, FK -> users.id ON DELETE CASCADE, INDEX)
- `receiver_id` (BIGINT, FK -> users.id ON DELETE CASCADE, INDEX)
- `status` (VARCHAR(20), NOT NULL, `PENDING`, `ACCEPTED`, `REJECTED`, INDEX)
- `created_at`, `updated_at` (DATETIME, NOT NULL)
- **Constraint**: `UNIQUE(sender_id, receiver_id)`

### 3. `conversations`
Unified conversation channel supporting both `PRIVATE` and `GROUP` communication.
- `id` (BIGINT, PK, AUTO_INCREMENT)
- `type` (VARCHAR(20), NOT NULL, `PRIVATE` or `GROUP`, INDEX)
- `title` (VARCHAR(150), group or custom chat title)
- `photo_url` (VARCHAR(500), group avatar or icon)
- `created_by` (BIGINT, FK -> users.id ON DELETE SET NULL)
- `created_at`, `updated_at` (DATETIME, NOT NULL, INDEX on updated_at)

### 4. `conversation_members`
Participant roster for each conversation.
- `id` (BIGINT, PK, AUTO_INCREMENT)
- `conversation_id` (BIGINT, FK -> conversations.id ON DELETE CASCADE, INDEX)
- `user_id` (BIGINT, FK -> users.id ON DELETE CASCADE, INDEX)
- `role` (VARCHAR(20), NOT NULL, `ADMIN` or `MEMBER`)
- `last_read_message_id` (BIGINT, unread message tracking)
- `joined_at` (DATETIME, NOT NULL)
- **Constraint**: `UNIQUE(conversation_id, user_id)`

### 5. `messages`
Message history with replies, reactions, and soft-deletion tracking.
- `id` (BIGINT, PK, AUTO_INCREMENT)
- `conversation_id` (BIGINT, FK -> conversations.id ON DELETE CASCADE, INDEX)
- `sender_id` (BIGINT, FK -> users.id ON DELETE CASCADE, INDEX)
- `content` (TEXT, message body or caption)
- `type` (VARCHAR(20), NOT NULL, `TEXT`, `IMAGE`, `VIDEO`, `DOCUMENT`, `VOICE`, `SYSTEM`)
- `status` (VARCHAR(20), NOT NULL, `SENT`, `DELIVERED`, `READ`, INDEX)
- `reply_to_message_id` (BIGINT, FK -> messages.id ON DELETE SET NULL)
- `deleted_for_everyone` (BOOLEAN, NOT NULL, DEFAULT FALSE)
- `created_at`, `updated_at` (DATETIME, NOT NULL, INDEX on created_at)

### 6. `attachments`
Structured file metadata linked directly to a message.
- `id` (BIGINT, PK, AUTO_INCREMENT)
- `message_id` (BIGINT, FK -> messages.id ON DELETE CASCADE, INDEX)
- `original_name` (VARCHAR(255), NOT NULL)
- `stored_name` (VARCHAR(255), NOT NULL)
- `file_type` (VARCHAR(100), NOT NULL)
- `file_size` (BIGINT, NOT NULL)
- `file_path` (VARCHAR(500), NOT NULL)
- `created_at` (DATETIME, NOT NULL)

### 7. `groups`
Group entity metadata.
- `id` (BIGINT, PK, AUTO_INCREMENT)
- `name` (VARCHAR(100), NOT NULL)
- `photo` (VARCHAR(500), DEFAULT '')
- `created_by` (BIGINT, FK -> users.id ON DELETE CASCADE, INDEX)
- `created_at`, `updated_at` (DATETIME, NOT NULL)

### 8. `group_members`
Group participants relationship.
- `id` (BIGINT, PK, AUTO_INCREMENT)
- `group_id` (BIGINT, FK -> groups.id ON DELETE CASCADE, INDEX)
- `user_id` (BIGINT, FK -> users.id ON DELETE CASCADE, INDEX)
- `joined_at` (DATETIME, NOT NULL)
- **Constraint**: `UNIQUE(group_id, user_id)`

### 9. `stories`
24-hour ephemeral stories.
- `id` (BIGINT, PK, AUTO_INCREMENT)
- `user_id` (BIGINT, FK -> users.id ON DELETE CASCADE, INDEX)
- `media_path` (VARCHAR(500), NOT NULL)
- `media_type` (VARCHAR(50), NOT NULL, `IMAGE` or `VIDEO`)
- `created_at` (DATETIME, NOT NULL)
- `expires_at` (DATETIME, NOT NULL, INDEX)

### 10. `story_views`
View receipts for stories.
- `id` (BIGINT, PK, AUTO_INCREMENT)
- `story_id` (BIGINT, FK -> stories.id ON DELETE CASCADE, INDEX)
- `viewer_id` (BIGINT, FK -> users.id ON DELETE CASCADE, INDEX)
- `viewed_at` (DATETIME, NOT NULL)
- **Constraint**: `UNIQUE(story_id, viewer_id)`

### 11. `calls`
WebRTC audio and video calling history.
- `id` (BIGINT, PK, AUTO_INCREMENT)
- `caller_id` (BIGINT, FK -> users.id ON DELETE CASCADE, INDEX)
- `receiver_id` (BIGINT, FK -> users.id ON DELETE CASCADE, INDEX)
- `type` (VARCHAR(20), NOT NULL, `AUDIO` or `VIDEO`)
- `status` (VARCHAR(20), NOT NULL, `MISSED`, `ACCEPTED`, `REJECTED`, `ENDED`)
- `started_at` (DATETIME, NOT NULL, INDEX)
- `ended_at` (DATETIME)
- `duration_seconds` (INT, DEFAULT 0)
