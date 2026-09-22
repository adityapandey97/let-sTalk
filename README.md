# ConnectChat – Real-Time Messaging & WebRTC Communication Platform

ConnectChat is a high-performance, production-ready real-time communication platform built on a clean modular architecture: **Java 17+ / Spring Boot 3** backend, relational database persistence (**MySQL 8.0+ / H2**), and a decoupled, responsive **Vanilla HTML5/CSS3/ES6+ JavaScript** frontend.

Inspired by the intuitive usability patterns of WhatsApp, ConnectChat provides an original, state-of-the-art interface with zero bloated frontend frameworks (no React, Vue, Angular, or Tailwind) and zero AI dependencies.

---

## 🌟 Key Features

### 💬 Real-Time Messaging & Conversations
- **Instant Messaging**: Real-time STOMP WebSocket communication over SockJS.
- **Delivery & Read Receipts**: Real-time status ticks:
  - Single gray tick: Sent
  - Double gray tick: Delivered
  - Double blue tick: Read
- **Quoted Replies**: Click to reply to specific messages with visible snippet quote preview.
- **Message Deletion**:
  - **Delete for Me**: Clears the conversation or removes a message for the requester without deleting it for the other user.
  - **Delete for Everyone**: Allows senders to retract messages within 24 hours ("This message was deleted").
- **Live Typing Indicators**: Displays "typing..." in real-time when the counterparty is composing.
- **Full-Text In-Conversation Search**: Instant client and server filtering across messages.

### 👥 Group Conversations & Contacts
- **Connection Model**: Contact request workflow (`PENDING`, `ACCEPTED`, `REJECTED`).
- **Group Chats**: Create group channels, add participants from connected contacts, and broadcast messages instantly.

### 📁 Rich Media & File Sharing
- **Multi-Format Uploads**: Send photos, videos, voice recordings, and documents (PDF, DOCX, etc.).
- **Automatic Metadata & Previews**: Instant thumbnail rendering, document size badges, and download triggers.
- **Configurable Limits**: Supports up to 50MB per upload.

### 📞 WebRTC Audio & Video Calling
- **Peer-to-Peer Calls**: Real 1-to-1 WebRTC audio and video calling.
- **WebSocket Signaling**: SDP offers, answers, and ICE candidates relayed via STOMP broker.
- **Interactive Call HUD**: Ringing modal, audio waveform visualization, mute microphone, camera toggle, and call end controls.

### 📸 Ephemeral Stories (Status Updates)
- **24-Hour Stories**: Share photos or text status updates with connected friends.
- **Viewer Insights**: Tracks who has viewed your story.

### 🎨 Design & Accessibility
- **Responsive Split-View**: Left sidebar for conversations and contacts, right pane for active chat.
- **Dark Mode / Light Mode**: Instant toggle with persistent user preference in `localStorage`.
- **Pure SVG Iconography**: No bloated external icon fonts or slow dependencies.

---

## 🛠 Technology Stack

- **Backend**:
  - Java 17+ (LTS)
  - Spring Boot 3.3.4
  - Spring WebSocket with STOMP messaging & SimpleBroker
  - Spring Data JPA / Hibernate
  - Spring Security Crypto (BCrypt password hashing with 12 rounds)
  - H2 Database (MySQL compatibility mode for dev) & MySQL 8.0+ for production
- **Frontend**:
  - Semantic HTML5
  - Vanilla CSS3 (CSS custom properties, glassmorphism, responsive flexbox & grid)
  - Vanilla ES6+ JavaScript (Modular scripts, Fetch API, WebSocket STOMP)
- **Storage**:
  - Local disk storage served via Spring WebMvc static resource handler (`/uploads/**`)

---

## 🚀 Quick Start (Development)

### 1. Prerequisites
- **Java**: OpenJDK 17 or higher (`java -version`)
- **Maven**: Maven wrapper (`./mvnw` or `.\mvnw.cmd`) included

### 2. Start the Backend & Database
```bash
cd backend
.\mvnw.cmd spring-boot:run
```
The server will start at `http://localhost:8080` with embedded persistent H2 in MySQL mode.

### 3. Open the Application
Open your web browser and navigate to:
```
http://localhost:8080/
```

### 4. Pre-Configured Test Accounts (from database/seed.sql)
You can sign in immediately using either account:
- **Account 1**:
  - Email / Username: `aditya@connectchat.com` (or `aditya`)
  - Password: `password123`
- **Account 2**:
  - Email / Username: `rahul@connectchat.com` (or `rahul`)
  - Password: `password123`

---

## 📂 Project Directory Structure

```
.
├── backend/
│   ├── pom.xml
│   ├── src/main/java/com/example/connectchat/
│   │   ├── config/          # WebMvc, CORS, and WebSocket configuration
│   │   ├── controller/      # REST & STOMP controllers (Auth, Chat, Groups, Media, etc.)
│   │   ├── dto/             # Data Transfer Objects
│   │   ├── exception/       # Global exception handling & custom exceptions
│   │   ├── model/           # JPA entities (User, Conversation, Message, Group, etc.)
│   │   ├── repository/      # Spring Data JPA repositories
│   │   ├── security/        # AuthInterceptor, TokenProvider, BCrypt utils
│   │   ├── service/         # Business logic services
│   │   └── util/            # Password & string utilities
│   └── src/main/resources/
│       ├── application.properties
│       └── static/          # Synchronized frontend distribution files
├── frontend/
│   ├── index.html           # Main application view
│   ├── css/                 # Modular stylesheets
│   │   ├── variables.css
│   │   ├── reset.css
│   │   ├── layout.css
│   │   ├── components.css
│   │   ├── chat.css
│   │   ├── auth.css
│   │   ├── responsive.css
│   │   ├── dark-mode.css
│   │   └── style.css
│   └── js/                  # Modular JavaScript files
│       ├── config.js
│       ├── utils.js
│       ├── theme.js
│       ├── api.js
│       ├── auth.js
│       ├── websocket.js
│       ├── ui.js
│       ├── emoji.js
│       ├── files.js
│       ├── notifications.js
│       ├── contacts.js
│       ├── chat.js
│       ├── groups.js
│       ├── stories.js
│       ├── calls.js
│       ├── profile.js
│       └── app.js
├── database/
│   ├── schema.sql           # Complete MySQL DDL
│   └── seed.sql             # Initial seed data
├── docs/
│   ├── API.md               # Complete REST & WebSocket specification
│   ├── DATABASE.md          # ER diagrams & schema documentation
│   └── DEPLOYMENT.md        # Ubuntu, Nginx, SSL, and Systemd production guide
├── .env.example             # Environment variable template
└── README.md
```

---

## 🧪 Testing & Verification

Run backend unit and integration tests:
```bash
cd backend
.\mvnw.cmd test
```

---

## 🔒 Security & Privacy
- **Password Security**: Passwords are saved as 12-round BCrypt hashes.
- **Session Protection**: Bearer tokens with configurable expiry and revocation.
- **File Upload Protection**: Filename sanitization, UUID prefixing, and path traversal prevention.
- **Privacy Filtering**: Messages deleted for a user are filtered via conversation membership watermarks.
