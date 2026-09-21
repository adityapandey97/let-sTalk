# Let's Talk – Spring Boot Backend

The backend for **Let's Talk**, a real-time messaging, media sharing, and WebRTC calling application.

Built with **Spring Boot 3.3.4**, **Spring Data JPA**, **WebSocket (STOMP + SockJS)**, and **H2/MySQL**.

---

## 🚀 Features

- **Authentication**: Salted SHA-256 password authentication, unique username checks, email login.
- **Messaging**: 1-to-1 private chat & multi-member group chat with instant WebSocket broadcasting.
- **Media Upload**: File & Video sharing up to 50MB with dedicated REST endpoints (`/api/media/upload`) and static resource streaming (`/uploads/**`).
- **WebRTC Signaling**: Voice and Video call signaling (`OFFER`, `ANSWER`, `ICE_CANDIDATE`, `CALL_END`) via `/app/call.signal` and `/topic/user/{id}/call`.
- **Chat Management**: Real-time message deletion and chat clearing with transactional persistence and live notifications.
- **24-Hour Stories**: Text status updates and photo stories with automatic expiration.

---

## 🛠️ Local Development

### Requirements
- JDK 17 or higher (`java -version`)
- Maven wrapper is included (`./mvnw` or `mvnw.cmd`)

### Run Backend
```bash
# On Windows
mvnw.cmd spring-boot:run

# On Linux/macOS
./mvnw spring-boot:run
```

The server starts on: **http://localhost:8080**
- API endpoints: `http://localhost:8080/api/*`
- WebSocket handshake: `http://localhost:8080/ws`
- H2 Console: `http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:file:./data/letstalk_db`, User: `sa`, Password: blank)
- Uploaded media: `http://localhost:8080/uploads/*`

---

## 🚢 Production Deployment

### Option 1: Docker
```bash
docker build -t letstalk-backend .
docker run -p 8080:8080 -v $(pwd)/data:/app/data -v $(pwd)/uploads:/app/uploads letstalk-backend
```

### Option 2: Render / Railway / Fly.io
1. Connect your Git repository.
2. Set root directory to `backend`.
3. Build command: `./mvnw clean package -DskipTests`
4. Start command: `java -jar target/letstalk-1.0.0.jar`
5. Set environment variable `PORT=8080`.
