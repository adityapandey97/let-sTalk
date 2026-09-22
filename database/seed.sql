-- =============================================================================
-- ConnectChat Initial Seed Data
-- Test accounts with password: "password123" (BCrypt hashed)
-- =============================================================================

-- Clean existing data in reverse foreign key order
DELETE FROM notifications;
DELETE FROM call_records;
DELETE FROM story_views;
DELETE FROM stories;
DELETE FROM group_messages;
DELETE FROM group_members;
DELETE FROM chat_groups;
DELETE FROM message_attachments;
DELETE FROM messages;
DELETE FROM conversation_members;
DELETE FROM conversations;
DELETE FROM connection_requests;
DELETE FROM auth_tokens;
DELETE FROM users;

-- 1. Insert Core Test Users
-- BCrypt hash for "password123": $2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG
INSERT INTO users (id, full_name, username, email, password_hash, bio, avatar_url, is_online, last_seen, is_email_verified, created_at, updated_at) VALUES
(1, 'Aditya Pandey', 'aditya', 'aditya@connectchat.com', '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG', 'Lead Engineer & Architect at ConnectChat', '', TRUE, NOW(), TRUE, NOW(), NOW()),
(2, 'Rahul Sharma', 'rahul', 'rahul@connectchat.com', '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG', 'Frontend Developer & UI/UX Designer', '', TRUE, NOW(), TRUE, NOW(), NOW()),
(3, 'Priya Patel', 'priya', 'priya@connectchat.com', '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG', 'DevOps & Cloud Infrastructure', '', FALSE, NOW(), TRUE, NOW(), NOW());

-- 2. Accepted Connection Requests between Aditya & Rahul, and Aditya & Priya
INSERT INTO connection_requests (id, sender_id, receiver_id, status, created_at, updated_at) VALUES
(1, 1, 2, 'ACCEPTED', NOW(), NOW()),
(2, 3, 1, 'ACCEPTED', NOW(), NOW());

-- 3. Unified Conversation between Aditya and Rahul
INSERT INTO conversations (id, type, title, avatar_url, creator_id, created_at, updated_at) VALUES
(1, 'PRIVATE', NULL, NULL, 1, NOW(), NOW());

INSERT INTO conversation_members (id, conversation_id, user_id, role, is_muted, is_archived, joined_at) VALUES
(1, 1, 1, 'MEMBER', FALSE, FALSE, NOW()),
(2, 1, 2, 'MEMBER', FALSE, FALSE, NOW());

-- 4. Sample Messages in Conversation
INSERT INTO messages (id, conversation_id, sender_id, receiver_id, content, message_type, media_url, deleted_for_everyone, sent_at, status) VALUES
(1, 1, 1, 2, 'Hey Rahul! Welcome to ConnectChat. Real-time messaging, WebRTC calling, and media file sharing are all active!', 'TEXT', NULL, FALSE, DATE_SUB(NOW(), INTERVAL 15 MINUTE), 'READ'),
(2, 1, 2, 1, 'Hey Aditya! The UI is looking super clean and ultra responsive. Testing out the real-time ticks and WebRTC audio/video calling!', 'TEXT', NULL, FALSE, DATE_SUB(NOW(), INTERVAL 10 MINUTE), 'READ'),
(3, 1, 1, 2, 'Awesome! Feel free to send documents, photos, audio clips or test deleting messages.', 'TEXT', NULL, FALSE, DATE_SUB(NOW(), INTERVAL 5 MINUTE), 'READ');

-- 5. Sample Chat Group
INSERT INTO chat_groups (id, name, creator_id, created_at) VALUES
(1, 'ConnectChat Core Team', 1, NOW());

INSERT INTO group_members (id, group_id, user_id, joined_at) VALUES
(1, 1, 1, NOW()),
(2, 1, 2, NOW());

INSERT INTO group_messages (id, group_id, sender_id, content, message_type, sent_at) VALUES
(1, 1, 1, 'Welcome everyone to the ConnectChat Core Team group channel!', 'TEXT', NOW());

-- 6. Sample Active Story
INSERT INTO stories (id, user_id, media_url, caption, created_at, expires_at) VALUES
(1, 1, NULL, 'ConnectChat v2.0 is live with WebRTC Calling and high-speed file transfers!', NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR));
