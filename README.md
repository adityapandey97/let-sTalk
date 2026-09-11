# Let's Talk – Real-Time Messaging & Media Application

**Let's Talk** is a feature-packed real-time messaging and social web application built with **Spring Boot 3**, **Spring Data JPA**, **WebSocket (STOMP + SockJS)**, **H2 / MySQL**, and pure **HTML5, CSS3, and Vanilla JavaScript**.

It supports unique verified email login, 24-hour status stories, voice note audio recording & playback, rich media sharing (photos, videos, contact cards), WhatsApp-style read receipts, customizable profile avatars & chat wallpapers, and group chats.

---

## 🌟 Key Features

1. **Unique Email Login & OTP Verification**:
   - Register with Full Name, Unique Username, and Unique Email.
   - Built-in secure 6-digit OTP verification code workflow.
   - Fast login via registered email address or username handle.

2. **24-Hour Stories & Status**:
   - Post photo stories with captions or vibrant text statuses with custom color gradient palettes.
   - Real-time active status rings around user avatars.
   - Instagram/WhatsApp-style full-screen story viewer with auto-advancing progress timers, slide navigation, and direct reply-to-chat.

3. **Rich Media Messaging**:
   - 🖼️ **Send Images**: Inline photo thumbnails with a full-screen Lightbox image viewer.
   - 🎙️ **Voice Notes**: In-browser audio recording via `MediaRecorder` with live recording timer, wave visualizer, and custom inline playback controls.
   - 🎥 **Send Videos**: Video player embedded directly inside message bubbles.
   - 👤 **Send Contact Cards**: Share contacts with friends with 1-click connect/chat action.

4. **Profile & Wallpaper Customization**:
   - Custom profile pictures (custom image upload or stylish 3D avatar presets).
   - Bio & status updates.
   - 5 beautiful chat background wallpaper themes (Default Glass, Midnight Blue, Synth Sunset, Emerald Glow, Dark Doodles).

5. **Private & Group Real-Time Chat**:
   - WebSocket STOMP for sub-millisecond message delivery.
   - WhatsApp-style single/double checkmark delivery and read status receipts.
   - Multi-user group conversations with member management.

---

## 📋 Prerequisites

1. **Java Development Kit (JDK 17 or higher)**
   - Download: [Adoptium Eclipse Temurin JDK 17](https://adoptium.net/) or [Oracle JDK](https://www.oracle.com/java/technologies/downloads/)
   - Verify installation:
     ```bash
     java -version
     ```

2. **Web Browser**
   - Google Chrome, Microsoft Edge, Mozilla Firefox, or Brave.

---

## 🏃 Running the Application

### Method 1: Using One-Click Batch Script (Windows)
Double-click `run.bat` in the project root directory.

### Method 2: Using Maven Wrapper Terminal Command
```bash
./mvnw spring-boot:run
```
*(On Windows Command Prompt: `mvnw.cmd spring-boot:run`)*

### Accessing the Web Application
Open your browser and navigate to:
```
http://localhost:8080
```
