/**
 * ConnectChat Authentication Module
 */
window.Auth = (function () {
    const TOKEN_KEY = 'connectchat_token';
    const USER_KEY = 'connectchat_user';

    function getStoredToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    function getStoredUser() {
        try {
            const raw = localStorage.getItem(USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    function saveSession(token, user) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        window.state.currentUser = user;
    }

    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        window.state.currentUser = null;
        window.state.activeChat = null;
    }

    async function checkExistingSession() {
        const token = getStoredToken();
        const user = getStoredUser();

        if (!token || !user) {
            clearSession();
            window.UI.showScreen('auth-screen');
            return;
        }

        window.state.currentUser = user;

        try {
            // Verify session with backend
            const verifiedUser = await window.ApiClient.get('/api/auth/me');
            saveSession(token, verifiedUser);
            onAuthSuccess(verifiedUser);
        } catch (err) {
            console.warn('Session expired or invalid, returning to sign in:', err);
            clearSession();
            window.UI.showScreen('auth-screen');
        }
    }

    async function login(identifier, password) {
        const result = await window.ApiClient.post('/api/auth/login', {
            identifier: identifier.trim(),
            password: password
        });

        if (result && result.token && result.user) {
            saveSession(result.token, result.user);
            onAuthSuccess(result.user);
            return result.user;
        }
        throw new Error(result.message || 'Login failed');
    }

    async function register(userData) {
        const result = await window.ApiClient.post('/api/auth/register', userData);

        if (result && result.token && result.user) {
            saveSession(result.token, result.user);
            onAuthSuccess(result.user);
            return result.user;
        }
        throw new Error(result.message || 'Registration failed');
    }

    async function logout() {
        try {
            await window.ApiClient.post('/api/auth/logout', {});
        } catch (e) {
            console.warn('Logout notification error:', e);
        }

        if (window.WebSocketManager) {
            window.WebSocketManager.disconnect();
        }

        clearSession();
        window.UI.showScreen('auth-screen');
        window.UI.showToast('Logged out successfully', 'info');
    }

    function handleUnauthorized() {
        clearSession();
        window.UI.showScreen('auth-screen');
        window.UI.showToast('Session expired. Please sign in again.', 'error');
    }

    function onAuthSuccess(user) {
        window.UI.updateCurrentUserProfileUI(user);
        window.UI.showScreen('main-screen');

        // Connect WebSocket STOMP broker
        if (window.WebSocketManager) {
            window.WebSocketManager.connect(user.id);
        }

        // Load initial data
        if (window.Contacts) window.Contacts.loadConnections();
        if (window.Groups) window.Groups.loadGroups();
        if (window.Stories) window.Stories.loadStoriesFeed();
    }

    return {
        getStoredToken,
        getStoredUser,
        checkExistingSession,
        login,
        register,
        logout,
        handleUnauthorized,
        onAuthSuccess
    };
})();
