# Let's Talk (ConnectChat) — Real-Time Messaging & HD Communication Platform

Let's Talk is a full-stack real-time communication platform built on a unified single-root architecture: **Java 17+ / Spring Boot 3.3.4** backend, relational database persistence (**MySQL 8.0+ / H2**), and a responsive **HTML5 / Vanilla CSS3 / Modular Vanilla JavaScript** frontend served directly from Spring Boot.

Zero bloated frontend frameworks (no React, Vue, Angular, or Tailwind) and zero simulated/dummy responses. Every button, interaction, upload, call, and real-time event executes against real backend services and database persistence.

---

## 🌟 Key Implemented Features

1. **Authentication & Identity**:
   - Secure registration with full name, unique username (3-30 chars, case-insensitive), unique email, BCrypt-hashed password, and optional profile photo.
   - Login via username OR email with password.
   - Stateless JWT generation and verification (`Authorization: Bearer <token>`).
   - Clean logout updating online presence in real time.
2. **User Profiles & Discovery**:
   - User profile with avatar upload (safe UUID storage, MIME check, size limit).
   - Bio editing and name customization.
   - User search by name or username with live relationship indicators.
3. **Connection System**:
   - 1-to-1 connection requests (`PENDING`, `ACCEPTED`, `REJECTED`).
   - Prevention of self-requests, duplicate requests, and duplicate accepted connections.
   - Automatic private conversation initialization upon request acceptance.
4. **Real-Time Private & Group Messaging**:
   - WebSocket STOMP messaging over SockJS with authenticated STOMP channel interceptor.
   - Active conversation list sorted by latest activity with unread message counts.
   - Double-check delivery ticks: `✓` (SENT), `✓✓` (DELIVERED), and `✓✓` blue (READ).
   - Throttled typing indicators ("... is typing").
   - Online presence tracking (`🟢 Online` / `Last seen`).
5. **Interactive Messaging Features**:
   - Lightweight UTF-8 emoji picker with category tabs (Smileys, Gestures, Hearts, Objects).
   - Quoted replies referencing original messages.
   - "Delete for me" (hides message locally from user's view).
   - "Delete for everyone" (sender-only within 24h; replaces content with "This message was deleted." and broadcasts deletion).
   - "Delete chat" (clears conversation view for requesting user without deleting for the recipient).
6. **Rich Media & File Sharing (Up to 50MB)**:
   - Categorized storage: `profile/`, `images/`, `videos/`, `documents/`, `voice/`, `stories/`.
   - Photos with inline view and preview lightbox.
   - Videos with inline HTML5 video player.
   - Documents (PDF, DOCX, ZIP, etc.) with file size badge and download button.
   - Voice notes recorded directly in the browser via `MediaRecorder` API with timer and audio waveform player.
   - Protection against path traversal (`..`) and dangerous file extensions.
7. **Group Conversations**:
   - Group creation with custom name, optional photo, and initial participant selection from accepted connections.
   - Group creator admin rights (edit name/photo, add members, remove members).
   - Unified conversation routing for group messages with sender name headers.
8. **24-Hour Ephemeral Stories**:
   - Upload image or video stories with automatic 24-hour expiration (`expires_at = now + 24h`).
   - Stories tray showing "Your Story" and connected contacts' stories with unread gradient rings.
   - Full-screen story viewer with progress bar animation, next/previous controls, and view receipts.
9. **WebRTC One-to-One Audio & Video Calling**:
   - Real peer-to-peer audio and video calling using WebRTC `RTCPeerConnection`.
   - STOMP signaling broker (`CALL_OFFER`, `CALL_ANSWER`, `ICE_CANDIDATE`, `CALL_ACCEPTED`, `CALL_REJECTED`, `CALL_ENDED`).
   - Calling HUD with incoming ringing modal, local PIP preview, remote video feed, microphone mute, camera toggle, and hang-up controls.
   - Call history tracking (caller, receiver, type, status, duration).
10. **Theming & Responsiveness**:
    - 4 distinct curated themes: Day (Light), Night (Dark), Royal Blue, and Midnight Violet.
    - Persisted in `localStorage`.
    - Fully responsive layouts tested at 360px, 390px, 480px, 768px, 1024px, 1440px, and 1920px with mobile chat back-navigation.

---

## 🛠 Technology Stack

- **Frontend**: HTML5, Vanilla CSS3 (Custom Properties & Glassmorphism), Vanilla ES6+ JavaScript.
- **Backend**: Java 17+, Spring Boot 3.3.4 (Spring Web, Spring Data JPA, Spring WebSocket, Spring Security).
- **Security**: JJWT (io.jsonwebtoken 0.12.6), BCrypt Password Encoder.
- **Messaging**: STOMP over SockJS (`/ws`, `/app`, `/topic`).
- **Media / WebRTC**: HTML5 WebRTC API, MediaRecorder API.
- **Database**: MySQL 8.0+ (Production) / Persistent H2 (Development fallback).
- **Build**: Maven.
- **Reverse Proxy**: Apache HTTP Server 2.4+ (`mod_proxy`, `mod_proxy_wstunnel`, `mod_ssl`).

---

## 🏗 System Architecture

```
[ Client Browser (HTML5/CSS3/Vanilla JS) ]
                  |
    +-------------+-------------+
    |                           |
[ HTTPS REST API ]      [ WebSocket STOMP ]
 (/api/auth, /api/users,   (/ws, /app, /topic)
  /api/messages, etc.)          |
    |                           |
[ Spring Security / JWT ] [ Channel Interceptor ]
    \                           /
     +------------+------------+
                  |
        [ Service Layer ]
                  |
        [ JPA Repositories ]
                  |
        [ MySQL Database ]
```

---

## 📂 Project Directory Structure

```
connectchat/
│
├── frontend/                     # Standalone Vanilla Frontend
│   ├── index.html                # Single-page interface with sliding bar & carousel
│   ├── package.json              # Standalone frontend scripts
│   ├── css/                      # 10 Modular CSS3 stylesheets (Orange Theme)
│   │   ├── auth.css              # Sliding indicator bar & carousel transitions
│   │   ├── base.css              # Radiant orange design tokens (#ea580c / #f97316)
│   │   ├── calls.css             # WebRTC calling HUD & video grid
│   │   ├── chat.css              # Chat bubbles with warm amber tints
│   │   ├── components.css        # Buttons, inputs, badges, avatars
│   │   ├── layout.css            # Responsive multi-column layout
│   │   ├── modal.css             # Modals & popup menus
│   │   ├── responsive.css        # Mobile & tablet viewports
│   │   ├── stories.css           # 24h stories tray & viewers
│   │   └── theme.css             # Dynamic light & dark mode themes
│   ├── js/                       # 17 Modular Vanilla ES6+ JS modules
│   │   ├── api.js, app.js, auth.js, calls.js, chat.js, connections.js
│   │   ├── emoji.js, files.js, groups.js, messages.js, notifications.js
│   │   ├── profile.js, stories.js, theme.js, ui.js, utils.js, websocket.js
│   └── images/                   # System avatars, branding & graphic assets
│
├── backend/                      # Production-Grade Spring Boot Multi-Tier Backend
│   ├── pom.xml                   # Maven dependencies & build lifecycle
│   ├── Dockerfile                # Production container deployment
│   ├── database/                 # Relational SQL scripts (schema.sql, seed.sql)
│   ├── mvnw, mvnw.cmd, .mvn/     # Maven wrapper
│   └── src/
│       ├── main/
│       │   ├── java/com/connectchat/
│       │   │   ├── ConnectChatApplication.java
│       │   │   ├── config/       # WebSocketConfig, CorsConfig, WebConfig
│       │   │   ├── controller/   # REST Controllers (Auth, User, Connection, Message, etc.)
│       │   │   ├── dto/          # Data transfer objects (Requests & Responses)
│       │   │   ├── entity/       # JPA Entities (User, Message, Connection, Call, etc.)
│       │   │   ├── enums/        # Status and type enums
│       │   │   ├── exception/    # GlobalExceptionHandler & custom exceptions
│       │   │   ├── repository/   # 11 Spring Data JPA Repositories
│       │   │   ├── security/     # SecurityConfig, JwtService, JwtFilter
│       │   │   ├── service/      # Business services
│       │   │   └── websocket/    # STOMP broker controller & event listeners
│       │   └── resources/
│       │       ├── application.properties
│       │       └── static/       # Synchronized copy of frontend for all-in-one delivery
│       └── test/
│           └── java/com/connectchat/
│               ├── AuthIntegrationTest.java
│               ├── ConnectionIntegrationTest.java
│               ├── MessageFlowIntegrationTest.java
│               ├── FileValidationTest.java
│               ├── ConnectChatApplicationTests.java
│               └── EdgeCaseIntegrationTest.java   # 9 Comprehensive edge case tests
│
├── run.bat                       # Full-stack runner on port 8080
├── run-frontend.bat              # Standalone frontend runner (port 3000)
├── run-backend.bat               # Standalone backend runner (port 8080)
└── README.md
```

---

## 🚀 Running Locally

### Option 1: Full-Stack Runner (Recommended)
Double-click `run.bat` or run:
```cmd
run.bat
```
This builds and launches the Spring Boot application on `http://localhost:8080/`, serving the frontend and backend together.

### Option 2: Standalone Backend
Double-click `run-backend.bat` or run:
```cmd
run-backend.bat
```
Or directly with Maven inside `backend/`:
```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

### Option 3: Standalone Frontend
Double-click `run-frontend.bat` or run:
```cmd
run-frontend.bat
```
Serves the `frontend/` directory directly on `http://localhost:3000` via Node's `serve` or Python's `http.server`.

### 2. Running with MySQL 8.0
1. Create the database:
   ```sql
   CREATE DATABASE connectchat_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'connectchat_user'@'localhost' IDENTIFIED BY 'Password123!';
   GRANT ALL PRIVILEGES ON connectchat_db.* TO 'connectchat_user'@'localhost';
   FLUSH PRIVILEGES;
   ```
2. Execute `database/schema.sql`:
   ```bash
   mysql -u connectchat_user -p connectchat_db < database/schema.sql
   ```
3. Set environment variables:
   ```bash
   export DB_URL="jdbc:mysql://localhost:3306/connectchat_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
   export DB_DRIVER="com.mysql.cj.jdbc.Driver"
   export DB_USERNAME="connectchat_user"
   export DB_PASSWORD="Password123!"
   ```
4. Start the application:
   ```bash
   ./mvnw spring-boot:run
   ```

---

## 🌐 Apache Production Deployment & HTTPS

### Model B: Spring Boot Serves Frontend + Apache HTTPS Reverse Proxy (Recommended)
Configure Apache with `mod_proxy`, `mod_proxy_wstunnel`, and `mod_ssl`:

```apache
<VirtualHost *:443>
    ServerName chat.yourdomain.com

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/chat.yourdomain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/chat.yourdomain.com/privkey.pem

    # WebSocket Proxy for STOMP / SockJS
    RewriteEngine on
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/ws/(.*) ws://127.0.0.1:8080/ws/$1 [P,L]

    ProxyPass /ws/ ws://127.0.0.1:8080/ws/
    ProxyPassReverse /ws/ ws://127.0.0.1:8080/ws/

    # Application Gateway
    ProxyPass / http://127.0.0.1:8080/
    ProxyPassReverse / http://127.0.0.1:8080/
</VirtualHost>
```

> [!IMPORTANT]
> HTTPS is mandatory for browser camera and microphone permissions in production. Plain HTTP will prevent WebRTC calling and voice recording.

---

## 🧪 Testing Guide

### Automated Backend Tests
Run the test suite:
```powershell
.\mvnw.cmd clean test
```
Pack the production JAR:
```powershell
.\mvnw.cmd clean package
```

### Manual Two-Browser End-to-End Verification
1. Open Browser Window 1 (e.g. Chrome) and navigate to `http://localhost:8080`.
2. Register Account A (e.g. Username: `alice`, Name: `Alice Walker`, Password: `password123`).
3. Open Browser Window 2 (e.g. Incognito or Edge) and navigate to `http://localhost:8080`.
4. Register Account B (e.g. Username: `bob`, Name: `Bob Miller`, Password: `password123`).
5. In Alice's window, click **Find People**, search `bob`, and click **Connect**.
6. In Bob's window, observe the real-time notification badge on Contacts. Open Contacts and click **Accept**.
7. The conversation appears immediately on both dashboards.
8. Send messages between Alice and Bob: observe real-time delivery ticks (`✓` -> `✓✓` -> `✓✓` blue).
9. Test emoji picker, quoted reply, image/video uploads, voice recording, and "Delete for everyone".
10. Test Audio and Video calling: click the Call icon in Alice's chat; Bob's browser rings with incoming call HUD; click Accept to test WebRTC streaming.
11. Test Light / Dark / Royal / Violet theme toggles.
12. Logout and login again to verify data persistence.

---

## 🔧 Troubleshooting

- **Database Connection Error**: Verify MySQL is running on port 3306 and credentials in `.env` or `application.properties` match.
- **WebSocket Disconnection**: Ensure Apache configuration contains `ProxyPass /ws/ ws://127.0.0.1:8080/ws/` and `mod_proxy_wstunnel` is enabled.
- **Microphone / Camera Permission Denied**: Check browser settings. In production, ensure the site is accessed via HTTPS.
- **File Upload 413 Payload Too Large**: Configured limit is 50MB. Adjust `MAX_FILE_SIZE` and `MAX_REQUEST_SIZE` in `application.properties`.
