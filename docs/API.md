# ConnectChat API Reference

This document provides complete documentation for the ConnectChat REST API and WebSocket STOMP messaging protocol.

---

## Base URLs
- **REST Endpoints**: `http://localhost:8080/api`
- **Static Media Uploads**: `http://localhost:8080/uploads/{filename}`
- **WebSocket STOMP Handshake**: `ws://localhost:8080/ws` (with SockJS fallback: `http://localhost:8080/ws`)

---

## Authentication
ConnectChat uses persistent Bearer tokens generated upon registration or login.
Pass the token in the `Authorization` HTTP header:
```http
Authorization: Bearer <token>
```
Alternative for WebSocket handshakes: `?token=<token>` query parameter.

---

## 1. Authentication Endpoints (`/api/auth`)

### Register Account
`POST /api/auth/register`
- **Request Body**:
  ```json
  {
    "fullName": "Aditya Pandey",
    "username": "aditya",
    "email": "aditya@connectchat.com",
    "password": "password123",
    "bio": "Lead Engineer & Architect",
    "avatarUrl": ""
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "token": "d7kF9a0_VbQ3...",
    "user": {
      "id": 1,
      "fullName": "Aditya Pandey",
      "username": "aditya",
      "email": "aditya@connectchat.com",
      "bio": "Lead Engineer & Architect",
      "avatarUrl": "",
      "online": true,
      "lastSeen": "2026-09-22T01:30:00"
    },
    "message": "Registration successful"
  }
  ```

### Login
`POST /api/auth/login`
- **Request Body**:
  ```json
  {
    "identifier": "aditya",
    "password": "password123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "token": "d7kF9a0_VbQ3...",
    "user": { ... },
    "message": "Login successful"
  }
  ```

### Logout
`POST /api/auth/logout`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
  ```json
  {
    "message": "Logged out successfully"
  }
  ```

### Current User Profile
`GET /api/auth/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**: `UserDto`

---

## 2. User & Contacts Endpoints (`/api/users`, `/api/connections`)

### Search Users
`GET /api/users/search?username={query}&currentUserId={userId}`
- Returns users matching query with relationship status (`CONNECTED`, `OUTGOING_PENDING`, `INCOMING_PENDING`, `NONE`).

### Check Username Availability
`GET /api/users/username-available?username={query}`

### Update Profile
`PUT /api/users/{userId}/profile`
- **Request Body**:
  ```json
  {
    "fullName": "Aditya Pandey",
    "bio": "Updated bio text",
    "avatarUrl": "/uploads/uuid_avatar.png",
    "bgWallpaper": ""
  }
  ```

### Send Connection Request
`POST /api/connections/request`
- **Request Body**:
  ```json
  {
    "senderId": 1,
    "receiverId": 2
  }
  ```

### Accept Connection Request
`POST /api/connections/{requestId}/accept?userId={userId}`

### Reject Connection Request
`POST /api/connections/{requestId}/reject?userId={userId}`

### List Accepted Connections
`GET /api/connections/{userId}`

### List Pending Requests
`GET /api/connections/requests/{userId}`

---

## 3. Messaging Endpoints (`/api/messages`)

### Load Chat History (1-to-1)
`GET /api/messages/private?userId={userId}&otherUserId={otherUserId}`
- Automatically marks unread incoming messages as `READ`.
- Honors "Delete for Me" timestamp filters.

### Delete Message for Me
`DELETE /api/messages/{messageId}?userId={userId}`

### Delete Message for Everyone
`POST /api/messages/{messageId}/delete-for-everyone?userId={userId}`
- Allowed only for message sender within 24 hours.
- Sets `deletedForEveryone = true`, replaces content with "This message was deleted".

### Clear Chat History for Me
`DELETE /api/messages/private?userId={userId}&otherUserId={otherUserId}`
- Updates the user's `clearedAt` watermark without deleting the other user's history.

---

## 4. Group Chat Endpoints (`/api/groups`)

### Create Group
`POST /api/groups`
- **Request Body**:
  ```json
  {
    "name": "Dev Project Alpha",
    "creatorId": 1,
    "memberIds": [2, 3]
  }
  ```

### List User Groups
`GET /api/groups/user/{userId}`

### Group Messages
`GET /api/groups/{groupId}/messages?userId={userId}`

### Group Members
`GET /api/groups/{groupId}/members?userId={userId}`

---

## 5. Media & File Upload (`/api/media/upload`, `/api/files/upload`)

### Upload Attachment or Avatar
`POST /api/media/upload` (or `/api/files/upload`)
- **Content-Type**: `multipart/form-data`
- **Form Param**: `file` (Multipart file)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "url": "/uploads/93c3c3a4-8f7b-4029-a1b2-10f82834d8e4_document.pdf",
    "fileName": "document.pdf",
    "fileSize": 128450,
    "contentType": "application/pdf"
  }
  ```

---

## 6. Ephemeral Stories (`/api/stories`)

### Create Story
`POST /api/stories`
- **Request Body**:
  ```json
  {
    "userId": 1,
    "mediaUrl": "/uploads/sample_story.jpg",
    "caption": "Project launch day!"
  }
  ```

### Get Stories Feed
`GET /api/stories/feed/{userId}`
- Returns active stories from accepted connections (within 24 hours).

---

## 7. WebSocket STOMP Protocol

### Connection & Topics
Connect to `ws://localhost:8080/ws` with STOMP over SockJS.

#### Subscriptions:
1. `/topic/private/{userId}`: Incoming 1-to-1 messages and updates.
2. `/topic/group/{groupId}`: Incoming group messages.
3. `/topic/user/{userId}/notifications`: Read receipts, connection alerts, and typing indicators.
4. `/topic/user/{userId}/call`: WebRTC audio & video signaling packets (OFFER, ANSWER, ICE_CANDIDATE, RINGING, REJECT, END).

#### Publishing Destinations:
1. `/app/chat.private`: Send private message.
   ```json
   {
     "senderId": 1,
     "receiverId": 2,
     "content": "Hello there!",
     "messageType": "TEXT",
     "mediaUrl": null,
     "repliedMessageId": null
   }
   ```
2. `/app/chat.group`: Send group message.
   ```json
   {
     "groupId": 1,
     "senderId": 1,
     "content": "Team meeting in 5 mins"
   }
   ```
3. `/app/chat.status`: Send delivery and read receipts.
   ```json
   {
     "userId": 2,
     "messageId": 45,
     "status": "READ"
   }
   ```
4. `/app/call.signal`: WebRTC peer-to-peer signaling.
   ```json
   {
     "type": "OFFER",
     "senderId": 1,
     "receiverId": 2,
     "callType": "video",
     "payload": { "type": "offer", "sdp": "..." }
   }
   ```
