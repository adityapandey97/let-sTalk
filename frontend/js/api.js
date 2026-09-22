/**
 * ConnectChat Unified HTTP API Client
 */
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
                // Token invalid or expired - trigger logout
                window.Auth && window.Auth.handleUnauthorized();
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
