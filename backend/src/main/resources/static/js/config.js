/**
 * Application Configuration
 * Automatically detects whether frontend is served by the Spring Boot backend
 * (same-origin) or deployed on an independent domain (e.g. Vercel, Netlify, Cloudflare).
 */
window.APP_CONFIG = {
    // When running decoupled (e.g. frontend on port 5500 or Vercel, backend on port 8080 or Render),
    // set API_BASE_URL to your backend's URL (e.g. 'https://letstalk-backend.onrender.com' or 'http://localhost:8080').
    // If empty string, it defaults to the current origin (same-origin).
    API_BASE_URL: (window.location.port !== '8080' && window.location.hostname === 'localhost') 
        ? 'http://localhost:8080' 
        : '',

    // WebRTC STUN/TURN ICE Servers
    ICE_SERVERS: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ],

    // Maximum file upload size in MB
    MAX_FILE_SIZE_MB: 50,
    MAX_VIDEO_SIZE_MB: 50
};

// Helper to construct absolute API URLs
window.getApiUrl = function(path) {
    const base = window.APP_CONFIG.API_BASE_URL;
    if (!path.startsWith('/')) path = '/' + path;
    return base ? (base + path) : path;
};

// Helper to construct WebSocket URL
window.getWsUrl = function() {
    const base = window.APP_CONFIG.API_BASE_URL;
    return base ? (base + '/ws') : '/ws';
};
