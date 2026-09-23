# Let's Talk — Complete REST API & WebSocket Reference

This document provides complete documentation for the REST API and WebSocket STOMP messaging protocol.

---

## Base URLs & Authentication
- **REST Base**: `/api`
- **Uploads Base**: `/uploads`
- **WebSocket STOMP Handshake**: `/ws` (with SockJS support)
- **Authentication**: JWT token passed in the `Authorization: Bearer <token>` header, or in STOMP CONNECT headers.

---

## 1. Authentication Endpoints (`/api/auth`)

### Register Account
`POST /api/auth/register` (Public)
```json
{
  "fullName": "Jane Doe",
  "username": "janedoe",
  "email": "jane@example.com",
  "password": "Password123!",
  "confirmPassword": "Password123!",
  "bio": "Software Engineer",
  "profilePhoto": "/uploads/profile/sample.jpg"
}
```
**Response (201 Created)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "fullName": "Jane Doe",
    "username": "janedoe",
    "email": "jane@example.com",
    "bio": "Software Engineer",
    "profilePhoto": "/uploads/profile/sample.jpg",
    "online": true,
    "lastSeen": "2026-09-23T10:00:00"
  }
}
```

### Login
`POST /api/auth/login` (Public)
```json
{
  "identifier": "janedoe",
  "password": "Password123!"
}
```
**Response (200 OK)**: Returns JWT token and UserProfileDto.

### Logout
`POST /api/auth/logout` (Bearer Auth)
**Response (200 OK)**: `{"success": true, "message": "Logged out successfully"}`

### Current User Profile
`GET /api/auth/me` (Bearer Auth)
**Response (200 OK)**: Returns authenticated UserProfileDto.

---

## 2. User Endpoints (`/api/users`)

### Search Users
`GET /api/users/search?q={query}` (Bearer Auth)
- Returns list of matching users with their connection status (`ACCEPTED`, `PENDING_SENT`, `PENDING_RECEIVED`, `NONE`).

### Get User Profile
`GET /api/users/{id}` (Bearer Auth)
- Returns UserProfileDto for specified user.

### Update Profile
`PUT /api/users/profile` (Bearer Auth)
```json
{
  "fullName": "Jane Smith",
  "username": "janesmith",
  "bio": "Building real-time apps",
  "profilePhoto": "/uploads/profile/new_photo.jpg"
}
```

### Upload Profile Photo
`POST /api/users/profile-photo` (Bearer Auth)
- Accepts `multipart/form-data` with `file` part or JSON body with `photoUrl`.

---

## 3. Connections Endpoints (`/api/connections`)

### Send Connection Request
`POST /api/connections/request` (Bearer Auth)
```json
{
  "targetUserId": 2
}
```

### List Pending Incoming Requests
`GET /api/connections/requests` (Bearer Auth)
- Returns array of pending ConnectionDto where current user is receiver.

### Accept Connection Request
`POST /api/connections/{id}/accept` (Bearer Auth)
- Accepts connection and automatically provisions private Conversation.

### Reject Connection Request
`POST /api/connections/{id}/reject` (Bearer Auth)
- Declines pending connection request.

### List Accepted Connections
`GET /api/connections` (Bearer Auth)
- Returns array of accepted connections for current user.

---

## 4. Conversations Endpoints (`/api/conversations`)

### List Conversations
`GET /api/conversations` (Bearer Auth)
- Returns user's conversations sorted by latest activity, including unread message count and recipient presence.

### Get Conversation Details
`GET /api/conversations/{id}` (Bearer Auth)
- Returns ConversationDto with participants list.

### Get or Create Private Conversation
`POST /api/conversations/private/{otherUserId}` (Bearer Auth)
- Retrieves existing private conversation or creates a new one between the two users.

### Clear Conversation History
`DELETE /api/conversations/{id}` (Bearer Auth)
- Clears conversation view for requesting user without affecting other participants.

---

## 5. Messages Endpoints (`/api/messages`)

### Get Conversation Messages
`GET /api/conversations/{id}/messages` (Bearer Auth)
- Returns chronological message history with reply attachments and deletion states. Automatically marks last message as read.

### Send Message
`POST /api/messages` (Bearer Auth)
```json
{
  "conversationId": 1,
  "content": "Hello there!",
  "type": "TEXT",
  "replyToMessageId": null,
  "mediaUrl": null,
  "fileName": null,
  "fileSize": null
}
```

### Delete Message (For Me)
`DELETE /api/messages/{id}` (Bearer Auth)
- Hides message from current user's conversation stream.

### Delete Message (For Everyone)
`POST /api/messages/{id}/delete-for-everyone` (Bearer Auth)
- Sender-only deletion within 24h. Marks `deletedForEveryone = true`, replaces content with "This message was deleted." and broadcasts deletion event.

---

## 6. File & Media Endpoints (`/api/files`)

### Upload File
`POST /api/files/upload` (Public / Bearer Auth)
- Multipart upload with `file` and optional `category` (`profile`, `images`, `videos`, `documents`, `voice`, `stories`).
- Enforces 50MB limit and safe UUID filenames.
**Response (201 Created)**:
```json
{
  "success": true,
  "fileUrl": "/uploads/images/3f82a1...jpg",
  "fileName": "photo.jpg",
  "fileSize": 1048576,
  "contentType": "image/jpeg"
}
```

### Delete File
`DELETE /api/files?fileUrl={url}` (Bearer Auth)
- Deletes uploaded file from filesystem.

---

## 7. Groups Endpoints (`/api/groups`)

### Create Group
`POST /api/groups` (Bearer Auth)
```json
{
  "name": "Design Team",
  "photo": "",
  "memberIds": [2, 3]
}
```

### List Groups
`GET /api/groups` (Bearer Auth)
- Returns groups where current user is a member.

### Get Group Details
`GET /api/groups/{id}` (Bearer Auth)
- Returns GroupDto with full member roster and associated `conversationId`.

### Update Group
`PUT /api/groups/{id}` (Bearer Auth)
- Creator only: updates group name or photo.

### Add Member
`POST /api/groups/{id}/members` (Bearer Auth)
```json
{
  "userId": 4
}
```

### Remove Member / Leave Group
`DELETE /api/groups/{id}/members/{userId}` (Bearer Auth)
- Allows group creator to remove member, or member to leave.

---

## 8. Stories Endpoints (`/api/stories`)

### Post Story
`POST /api/stories` (Bearer Auth)
```json
{
  "mediaPath": "/uploads/stories/story123.jpg",
  "mediaType": "IMAGE"
}
```

### List Active Stories
`GET /api/stories` (Bearer Auth)
- Returns non-expired stories grouped by user, ordered with "Your Story" first.

### Mark Story Viewed
`POST /api/stories/{id}/view` (Bearer Auth)
- Records view receipt for story viewer.

### Delete Story
`DELETE /api/stories/{id}` (Bearer Auth)
- Deletes user's own story.

---

## 9. Calls Endpoints (`/api/calls`)

### Call History
`GET /api/calls` (Bearer Auth)
- Returns call logs with duration and status (`MISSED`, `ACCEPTED`, `REJECTED`, `ENDED`).

### Initiate Call
`POST /api/calls/initiate` (Bearer Auth)
```json
{
  "receiverId": 2,
  "callType": "VIDEO"
}
```

### Update Call Status
`POST /api/calls/{id}/status` (Bearer Auth)
```json
{
  "status": "ENDED"
}
```

---

## 10. WebSocket STOMP Protocol (`/ws`)

### Destinations
- `/app/chat.send` -> Send message to conversation
- `/app/chat.status` -> Send delivery / read acknowledgment
- `/app/chat.typing` -> Send throttled typing indicator
- `/app/call.signal` -> WebRTC SDP and ICE signaling packet

### Subscriptions
- `/topic/conversation/{id}` -> Live conversation message broadcast
- `/topic/conversation/{id}/typing` -> Typing indicator stream
- `/topic/conversation/{id}/status` -> Status updates (`DELIVERED`, `READ`)
- `/topic/conversation/{id}/delete` -> Live message deletion updates
- `/topic/user/{id}/notifications` -> Personal notification stream
- `/topic/user/{id}/call` -> WebRTC signaling receiver stream
- `/topic/presence` -> Global online/offline presence changes
