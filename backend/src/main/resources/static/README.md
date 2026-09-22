# Let's Talk – Frontend Application

The web frontend for **Let's Talk**, a real-time messaging, social stories, voice note, media sharing, and WebRTC voice & video calling web application.

Built with **HTML5**, modern **CSS3** (glassmorphism design system), and **Vanilla JavaScript** (ES6+).

---

## 🌟 Key Features

- **Rich Messaging**: 1-to-1 direct chat & group conversations.
- **Media & File Sharing**: Send photos, videos, and documents (PDF, DOCX, XLSX, ZIP) with download links.
- **WebRTC Calling**: 1-to-1 Voice and Video Calling with remote/local video streams, mute controls, and incoming call ringing modal.
- **Delete Management**: Delete individual messages or clear conversation history with real-time WebSocket sync.
- **24-Hour Stories**: Share photos or gradient text status updates.
- **Voice Notes**: In-browser audio recording with wave visualizers.

---

## ⚙️ Configuration (`js/config.js`)

In `js/config.js`:
- `API_BASE_URL`: Defaults to `http://localhost:8080` when frontend runs on a different port during local development, or empty string when served directly by the backend.
- When deploying independently (e.g., to Vercel/Netlify):
  Set `API_BASE_URL: 'https://your-backend-url.onrender.com'`.

---

## 🏃 Running Locally

### Option 1: Using Node / NPM
```bash
# Start a local static server on port 3000
npm start
```
Then open: **http://localhost:3000**

### Option 2: Using Python Simple Server
```bash
python -m http.server 3000
```

### Option 3: Double Click
Double click `index.html` or run `run-frontend.bat` from the root directory.

---

## 🚢 Deploying Frontend

### Vercel / Netlify / Cloudflare Pages / GitHub Pages
1. Deploy this `frontend` directory as a static site.
2. In `js/config.js`, set `API_BASE_URL: 'https://your-deployed-backend-domain.com'`.
3. Done! The frontend will connect to your backend APIs and WebSocket STOMP endpoint seamlessly.
