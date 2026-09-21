# Let's Talk – Real-Time Messaging, Media & Calling Platform

**Let's Talk** is a modern, full-stack real-time social communication platform supporting text messaging, rich media sharing (photos, videos, documents/files, contact cards), in-browser voice note recording, 24-hour status stories, WhatsApp-style read receipts, and **1-to-1 WebRTC Voice & Video Calling**.

The project is cleanly decoupled into two independent directories for local development and cloud deployment:
- **`backend/`**: Spring Boot 3 REST API + WebSocket STOMP server (Java 17+, JPA, H2/MySQL, Dockerfile)
- **`frontend/`**: Modern Single Page Application (HTML5, CSS3 glassmorphism design system, Vanilla JS ES6+)

---

## 🌟 Key Features

### 1. 📁 Rich File & Document Sharing
- Send documents and attachments: PDF, DOCX, XLSX, PPT, ZIP, RAR, TXT, code files, and more.
- Color-coded file extension badges (e.g., Red for PDF, Blue for DOC, Amber for ZIP).
- File size formatting (KB/MB) and one-click direct download button.
- Dedicated multipart upload endpoint (`/api/media/upload`) supporting files up to 50MB.

### 2. 🎥 Video Messaging
- Upload and stream MP4, WebM, and other video formats.
- Inline responsive HTML5 video player embedded directly in chat bubbles with timeline controls.
- Integrated video download button in every video bubble.
- Upload progress banner showing live upload states.

### 3. 📞 WebRTC 1-to-1 Voice & Video Calling
- Instant 1-to-1 Voice Call and Video Call buttons directly in direct chat headers.
- Real-time signaling via WebSocket STOMP (`/app/call.signal` and `/topic/user/{id}/call`).
- Incoming call ringing modal with caller avatar, name, and Accept / Decline options.
- Active call overlay with:
  - Remote video stream (fullscreen)
  - Picture-in-picture local video preview (PiP)
  - Audio visualizer pulsation waves for voice calls
  - Live call duration timer (`MM:SS`)
  - In-call controls: Mute/Unmute microphone, Turn camera on/off, and Hang up.
- NAT traversal supported via public Google STUN servers.

### 4. 🗑️ Delete Message & Chat Management
- **Delete Single Messages**: Hover trash action on any message bubble with confirmation modal ("Delete for Everyone").
- **Clear Entire Conversation**: 1-click option in chat header to clear the entire chat history.
- **Transactional & Real-Time**: `@Transactional` database persistence and instant WebSocket notifications (`MESSAGE_DELETED`, `CONVERSATION_CLEARED`) sync immediately across both devices without page reloads.

### 5. ⏳ 24-Hour Stories & Status
- Post photo stories with captions or gradient text status updates.
- Real-time active status rings around user avatars.
- WhatsApp/Instagram-style story viewer with progress bar timers, pause/play, and direct reply-to-chat.

### 6. 🎙️ Voice Notes
- In-browser audio recording via `MediaRecorder` API.
- Live recording waveform visualizer, recording timer, and cancel/send actions.
- Custom inline voice player with scrubber and duration display.

### 7. 👥 Private & Group Conversations
- Sub-millisecond message delivery via STOMP over WebSocket.
- Delivery and read receipts (single checkmark, double checkmarks, blue read ticks).
- Group chats with member lists and multi-user broadcast.

---

## 📁 Repository Structure

```
New folder/
├── backend/                  # Spring Boot 3 Backend Server
│   ├── src/
│   │   ├── main/java/com/example/connectchat/
│   │   │   ├── config/      # WebSocket, WebMvc, CORS configurations
│   │   │   ├── controller/  # REST & WebSocket STOMP Controllers (Media, Call, User, Chat, Story)
│   │   │   ├── dto/         # DTOs (CallSignalDto, NotificationDto, MessageDto)
│   │   │   ├── model/       # JPA Entities (User, Message, GroupMessage, Story)
│   │   │   ├── repository/  # Spring Data JPA Repositories
│   │   │   └── service/     # Business logic & transactional services
│   │   └── main/resources/  # application.properties & static assets
│   ├── uploads/             # Persistent directory for uploaded files and videos
│   ├── Dockerfile           # Multi-stage Docker build file
│   ├── pom.xml              # Maven dependencies & build plugins
│   └── mvnw & mvnw.cmd      # Maven wrappers
│
├── frontend/                 # Decoupled Single Page Web Application
│   ├── css/
│   │   └── style.css        # Glassmorphism UI tokens, call overlay, file bubbles
│   ├── js/
│   │   ├── app.js           # Core client logic, WebRTC call engine, chat handlers
│   │   └── config.js        # Dynamic backend API & WebSocket base URL config
│   ├── index.html           # Semantic HTML5 layout with accessible modals
│   └── package.json         # Optional local dev server script
│
├── run.bat                   # 1-Click launcher to start backend & open app
├── run-backend.bat           # Run backend server standalone
├── run-frontend.bat          # Run frontend server standalone
└── README.md
```

---

## 🏃 Running the Application Locally

### Method 1: One-Click Launch (Windows)
Double-click **`run.bat`** in the project root.
- Starts the Spring Boot backend on **http://localhost:8080**
- Opens your browser to **http://localhost:8080**

### Method 2: Running Frontend & Backend Separately

**Step 1: Start Backend**
```bash
cd backend
mvnw.cmd spring-boot:run
```
*(Backend runs on `http://localhost:8080` with H2 console at `/h2-console`)*

**Step 2: Start Frontend**
```bash
cd frontend
npm start
# OR double click run-frontend.bat
```
*(Frontend runs on `http://localhost:3000` and communicates with the backend via CORS)*

---

## 🚢 Cloud Deployment Guide

### Deploying Backend
The backend is packaged with a production-ready `backend/Dockerfile` and Maven build.
- **Render / Railway / Fly.io / Heroku**:
  1. Point the service root to the `backend` folder.
  2. Build command: `./mvnw clean package -DskipTests`
  3. Run command: `java -jar target/letstalk-1.0.0.jar`
  4. Port: `8080`

### Deploying Frontend
The frontend is a static single-page app and can be deployed anywhere for free:
- **Vercel / Netlify / Cloudflare Pages / GitHub Pages**:
  1. Set the publish directory to `frontend`.
  2. Open `frontend/js/config.js` and set:
     ```javascript
     API_BASE_URL: 'https://your-deployed-backend.onrender.com'
     ```
  3. Deploy! The frontend will connect to your cloud backend automatically.
