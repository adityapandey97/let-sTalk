/**
 * Let's Talk — WebSocket STOMP Manager
 */
window.WebSocketManager = window.ChatWs = (function () {
    let stompClient = null;
    let isConnected = false;
    let currentUserId = null;
    let reconnectTimeout = null;
    let reconnectAttempts = 0;
    const activeSubscriptions = new Map();

    function connect(userId) {
        if (!userId) return;
        currentUserId = userId;

        if (stompClient && isConnected) {
            return;
        }

        const wsEndpoint = window.getWsUrl ? window.getWsUrl() : '/ws';
        const socket = new SockJS(wsEndpoint);
        stompClient = Stomp.over(socket);
        stompClient.debug = null; // Suppress verbose console logs

        const headers = {};
        const token = localStorage.getItem('connectchat_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        stompClient.connect(headers, () => {
            isConnected = true;
            reconnectAttempts = 0;
            if (window.state) window.state.connected = true;
            console.log("Let's Talk WebSocket STOMP connected");

            // 1. Subscribe to personal notifications & ticks
            subscribe(`/topic/user/${userId}/notifications`, (msg) => {
                try {
                    const notif = JSON.parse(msg.body);
                    if (window.Notifications) window.Notifications.handleIncomingNotification(notif);
                } catch (e) {}
            });

            // 2. Subscribe to WebRTC Audio & Video Calling signaling
            subscribe(`/topic/user/${userId}/call`, (msg) => {
                try {
                    const signal = JSON.parse(msg.body);
                    if (window.Calls) window.Calls.handleIncomingCallSignal(signal);
                } catch (e) {}
            });

            // 3. Subscribe to Presence updates
            subscribe('/topic/presence', (msg) => {
                try {
                    const data = JSON.parse(msg.body);
                    if (window.Chat && typeof window.Chat.handlePresenceChange === 'function') {
                        window.Chat.handlePresenceChange(data);
                    }
                } catch (e) {}
            });

            // 4. Re-subscribe to active conversation if open
            if (window.state && window.state.activeConversationId) {
                subscribeToConversation(window.state.activeConversationId);
            }
        }, (error) => {
            isConnected = false;
            if (window.state) window.state.connected = false;
            scheduleReconnect();
        });
    }

    function subscribe(topic, callback) {
        if (!stompClient || !isConnected) {
            return null;
        }
        if (activeSubscriptions.has(topic)) {
            try { activeSubscriptions.get(topic).unsubscribe(); } catch (e) {}
        }
        const sub = stompClient.subscribe(topic, callback);
        activeSubscriptions.set(topic, sub);
        return sub;
    }

    function subscribeToConversation(conversationId) {
        // Message topic
        subscribe(`/topic/conversation/${conversationId}`, (msg) => {
            try {
                const data = JSON.parse(msg.body);
                if (window.Chat && typeof window.Chat.handleIncomingMessage === 'function') {
                    window.Chat.handleIncomingMessage(data);
                }
            } catch (e) {}
        });

        // Typing indicator topic
        subscribe(`/topic/conversation/${conversationId}/typing`, (msg) => {
            try {
                const data = JSON.parse(msg.body);
                if (window.Chat && typeof window.Chat.handleTypingSignal === 'function') {
                    window.Chat.handleTypingSignal(data);
                }
            } catch (e) {}
        });

        // Status acknowledgments topic
        subscribe(`/topic/conversation/${conversationId}/status`, (msg) => {
            try {
                const data = JSON.parse(msg.body);
                if (window.Chat && typeof window.Chat.handleStatusUpdate === 'function') {
                    window.Chat.handleStatusUpdate(data);
                }
            } catch (e) {}
        });

        // Deletions topic
        subscribe(`/topic/conversation/${conversationId}/delete`, (msg) => {
            try {
                const data = JSON.parse(msg.body);
                if (window.Chat && typeof window.Chat.handleMessageDeleted === 'function') {
                    window.Chat.handleMessageDeleted(data);
                }
            } catch (e) {}
        });
    }

    function send(destination, payload) {
        if (!stompClient || !isConnected) {
            return false;
        }
        stompClient.send(destination, {}, JSON.stringify(payload));
        return true;
    }

    function scheduleReconnect() {
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        if (!window.state || !window.state.currentUser) return;

        const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 15000);
        reconnectAttempts++;
        reconnectTimeout = setTimeout(() => {
            if (currentUserId && window.state && window.state.currentUser) {
                connect(currentUserId);
            }
        }, delay);
    }

    function disconnect() {
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        activeSubscriptions.clear();
        if (stompClient) {
            try {
                stompClient.disconnect();
            } catch (e) {}
        }
        stompClient = null;
        isConnected = false;
        if (window.state) window.state.connected = false;
    }

    return {
        connect,
        disconnect,
        subscribe,
        subscribeToConversation,
        send,
        isConnected: () => isConnected
    };
})();
