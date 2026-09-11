# ConnectChat – Real-Time Messaging Application

**ConnectChat** is a real-time messaging web application built with **Spring Boot 3**, **Spring Data JPA**, **MySQL**, **WebSocket (STOMP + SockJS)**, and pure **HTML5, CSS3, and Vanilla JavaScript**.

It supports user profile creation, user discovery & search, connection requests, private one-to-one messaging with WhatsApp-style delivery/read ticks, group chats with member management, and full persistence in MySQL.

---

## 📋 Prerequisites & Things to Install

Before running the application, make sure you have the following installed on your machine:

1. **Java Development Kit (JDK 17 or higher)**
   - Download: [Adoptium Eclipse Temurin JDK 17 / 21](https://adoptium.net/) or [Oracle JDK](https://www.oracle.com/java/technologies/downloads/)
   - Verify installation in terminal:
     ```bash
     java -version
     ```
   - Make sure `JAVA_HOME` environment variable is set and added to your `PATH`.

2. **MySQL Server (Version 8.0 or higher)**
   - Download: [MySQL Community Server](https://dev.mysql.com/downloads/mysql/) or install via [XAMPP / WampServer](https://www.apachefriends.org/)
   - Ensure the MySQL service is running on default port `3306`.

3. **Web Browser**
   - Google Chrome, Microsoft Edge, Mozilla Firefox, or Brave.

*(Note: Maven is not required to be installed separately, as the project includes the self-contained Maven Wrapper `mvnw` / `mvnw.cmd`)*.

---

## 🗄️ Step-by-Step Database Setup

1. **Start your MySQL server** (e.g., via MySQL Workbench, Command Line, or XAMPP Control Panel).
2. Default connection settings configured in `src/main/resources/application.properties`:
   ```properties
   spring.datasource.url=jdbc:mysql://localhost:3306/connectchat_db?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
   spring.datasource.username=root
   spring.datasource.password=root
   ```
3. **If your MySQL password or username is different:**
   - Open `src/main/resources/application.properties`.
   - Update `spring.datasource.username` and `spring.datasource.password` to match your local MySQL credentials.
   - *Alternatively, set environment variables: `DB_USERNAME` and `DB_PASSWORD`.*

---

## 🏃 Step-by-Step Running Guide

### Method 1: Using One-Click Batch Script (Windows)
1. Double-click **`run.bat`** in the project folder.
2. The script will verify Java, download dependencies on first run, and start the server.

---

### Method 2: Using the Command Line (Terminal / PowerShell / Command Prompt)

#### On Windows (PowerShell / CMD):
```powershell
.\mvnw.cmd spring-boot:run
```

#### On macOS / Linux:
```bash
chmod +x ./mvnw
./mvnw spring-boot:run
```

---

### Method 3: Using an IDE (VS Code, IntelliJ IDEA, Eclipse)
1. Open the project root folder in your IDE.
2. Allow Maven to import the project dependencies.
3. Open `src/main/java/com/example/connectchat/ConnectChatApplication.java`.
4. Click **Run** or **Debug**.

---

## 🌐 Opening the Application

Once started, open your web browser and navigate to:
👉 **`http://localhost:8080`**

---

## 🧪 Testing Real-Time Chat Between Two Users

To experience real-time two-way messaging, open two separate browser windows (e.g., **Window 1 in standard Chrome** and **Window 2 in Incognito mode / Firefox**):

### 1. Create Profiles
- **Window 1 (User 1)**:
  - Full Name: `Aditya Pandey`
  - Username: `aditya_123`
  - Click **Create Profile & Launch**.
- **Window 2 (User 2 - Incognito)**:
  - Full Name: `Rahul Sharma`
  - Username: `rahul_123`
  - Click **Create Profile & Launch**.

### 2. Search & Connect
1. In **Window 1 (Aditya)**, click **Search Users**.
2. Type `rahul` and click **Send Request**.
3. In **Window 2 (Rahul)**, see the live red badge on **Requests (1)**.
4. Click **Requests** and click **Accept**.
5. Both users will immediately see each other under **CHATS**.

### 3. One-to-One Private Chat & Real-Time Status Ticks
1. Click **Rahul Sharma** under CHATS in Aditya's window.
2. Send a message.
3. Observe status progression:
   - `✓` (Grey Single Tick) — **SENT** to server.
   - `✓✓` (Grey Double Tick) — **DELIVERED** to recipient's device.
   - `✓✓` (Blue Double Tick) — **READ** when the recipient opens the chat.

### 4. Create Group & Group Chat
1. In Aditya's window, click **+ New** next to GROUPS.
2. Enter Group Name: `Tech Team`.
3. Check `Rahul Sharma` and click **Create Group**.
4. The group appears instantly for all members with real-time broadcasting.

---

## 📁 Cleaned Project Structure

```
connectchat/
├── .gitignore
├── pom.xml
├── README.md
├── mvnw
├── mvnw.cmd
├── run.bat
├── .mvn/
│   └── wrapper/
│       ├── maven-wrapper.jar
│       └── maven-wrapper.properties
│
└── src/
    ├── main/
    │   ├── java/com/example/connectchat/
    │   │   ├── ConnectChatApplication.java
    │   │   ├── config/
    │   │   │   └── WebSocketConfig.java
    │   │   ├── controller/
    │   │   │   ├── ConnectionController.java
    │   │   │   ├── GroupController.java
    │   │   │   ├── PrivateMessageController.java
    │   │   │   └── UserController.java
    │   │   ├── exception/
    │   │   │   ├── BadRequestException.java
    │   │   │   ├── DuplicateResourceException.java
    │   │   │   ├── ErrorResponse.java
    │   │   │   ├── GlobalExceptionHandler.java
    │   │   │   ├── ResourceNotFoundException.java
    │   │   │   └── UnauthorizedException.java
    │   │   ├── dto/
    │   │   │   ├── ConnectionRequestDto.java
    │   │   │   ├── ConnectionResponseDto.java
    │   │   │   ├── CreateGroupRequest.java
    │   │   │   ├── CreateUserRequest.java
    │   │   │   ├── GroupDto.java
    │   │   │   ├── GroupMemberDto.java
    │   │   │   ├── GroupMessageDto.java
    │   │   │   ├── MessageStatusUpdateRequest.java
    │   │   │   ├── NotificationDto.java
    │   │   │   ├── PrivateMessageDto.java
    │   │   │   ├── PrivateMessageRequest.java
    │   │   │   ├── UserDto.java
    │   │   │   └── UserSearchResultDto.java
    │   │   ├── model/
    │   │   │   ├── ChatGroup.java
    │   │   │   ├── ConnectionRequest.java
    │   │   │   ├── ConnectionStatus.java
    │   │   │   ├── GroupMember.java
    │   │   │   ├── GroupMessage.java
    │   │   │   ├── Message.java
    │   │   │   ├── MessageStatus.java
    │   │   │   └── User.java
    │   │   ├── repository/
    │   │   │   ├── ChatGroupRepository.java
    │   │   │   ├── ConnectionRequestRepository.java
    │   │   │   ├── GroupMemberRepository.java
    │   │   │   ├── GroupMessageRepository.java
    │   │   │   ├── MessageRepository.java
    │   │   │   └── UserRepository.java
    │   │   └── service/
    │   │       ├── ConnectionService.java
    │   │       ├── GroupService.java
    │   │       ├── PrivateMessageService.java
    │   │       └── UserService.java
    │   └── resources/
    │       ├── application.properties
    │       └── static/
    │           ├── index.html
    │           ├── css/
    │           │   └── style.css
    │           └── js/
    │               └── app.js
    │
    └── test/
        ├── java/com/example/connectchat/
        │   └── ConnectChatApplicationTests.java
        └── resources/
            └── application.properties
```

---

## 🔧 Troubleshooting

- **Port 8080 already in use**:
  Change `server.port=8080` in `src/main/resources/application.properties` to `server.port=8081` (or another free port).
- **Access Denied for user 'root'@'localhost'**:
  Update `spring.datasource.password` in `src/main/resources/application.properties` to your MySQL root password.
- **Java Not Found**:
  Install JDK 17+ and add `JAVA_HOME` to system environment variables.
