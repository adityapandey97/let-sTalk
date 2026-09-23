/**
 * Let's Talk (ConnectChat) — Centralized HTTP API Client
 * Uses relative URLs by default for same-origin production deployment.
 */
window.APP_CONFIG = {
    API_BASE_URL: '',

    // WebRTC STUN ICE Servers
    ICE_SERVERS: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ],

    MAX_FILE_SIZE_MB: 50
};

window.getApiUrl = function(path) {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
        return path;
    }
    const base = window.APP_CONFIG.API_BASE_URL || '';
    if (!path.startsWith('/')) path = '/' + path;
    return base + path;
};

window.getWsUrl = function() {
    const base = window.APP_CONFIG.API_BASE_URL || '';
    return base ? (base + '/ws') : '/ws';
};

window.ApiClient = (function () {
    async function request(endpoint, options = {}) {
        const url = window.getApiUrl(endpoint);
        const headers = options.headers ? { ...options.headers } : {};

        // Attach Authorization token if available
        const token = localStorage.getItem('connectchat_token');
        if (token && !headers['Authorization']) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Set Content-Type: application/json if sending JSON body
        if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }

        options.headers = headers;

        try {
            const response = await fetch(url, options);

            if (response.status === 401) {
                window.Auth && window.Auth.handleUnauthorized && window.Auth.handleUnauthorized();
                throw new Error('Session expired. Please sign in again.');
            }

            const contentType = response.headers.get('content-type');
            let data = null;
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                const message = (data && data.message) || (data && data.error) || response.statusText || 'Request failed';
                const error = new Error(message);
                error.status = response.status;
                error.data = data;
                throw error;
            }

            return data;
        } catch (err) {
            console.error(`API Error [${endpoint}]:`, err);
            throw err;
        }
    }

    return {
        get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
        post: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'POST', body }),
        put: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PUT', body }),
        delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),
        request
    };
})();
