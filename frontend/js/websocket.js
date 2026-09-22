/**
 * ConnectChat WebSocket STOMP Manager
 */
window.WebSocketManager = (function () {
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

        const wsEndpoint = window.getWsUrl();
        // Support SockJS fallback
        const socket = new SockJS(wsEndpoint);
        stompClient = Stomp.over(socket);
        stompClient.debug = null; // Suppress verbose console spam

        const headers = {};
        const token = window.Auth ? window.Auth.getStoredToken() : null;
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        stompClient.connect(headers, () => {
            isConnected = true;
            reconnectAttempts = 0;
            window.state.connected = true;
            console.log('ConnectChat WebSocket STOMP connected');

            // 1. Subscribe to personal private messages
            subscribe(`/topic/private/${userId}`, (msg) => {
                const data = JSON.parse(msg.body);
                if (window.Chat) window.Chat.handleIncomingMessage(data);
            });

            // 2. Subscribe to personal notifications & status ticks
            subscribe(`/topic/user/${userId}/notifications`, (msg) => {
                const notif = JSON.parse(msg.body);
                if (window.Notifications) window.Notifications.handleIncomingNotification(notif);
            });

            // 3. Subscribe to WebRTC Audio & Video Calling signaling
            subscribe(`/topic/user/${userId}/call`, (msg) => {
                const signal = JSON.parse(msg.body);
                if (window.Calls) window.Calls.handleIncomingCallSignal(signal);
            });

            // Re-subscribe to any active groups
            if (window.state.groups) {
                window.state.groups.forEach(g => {
                    subscribeToGroup(g.id);
                });
            }
        }, (error) => {
            isConnected = false;
            window.state.connected = false;
            console.warn('ConnectChat WebSocket disconnected:', error);
            scheduleReconnect();
        });
    }

    function subscribe(topic, callback) {
        if (!stompClient || !isConnected) {
            return null;
        }
        if (activeSubscriptions.has(topic)) {
            try { activeSubscriptions.get(topic).unsubscribe(); } catch {}
        }
        const sub = stompClient.subscribe(topic, callback);
        activeSubscriptions.set(topic, sub);
        return sub;
    }

    function subscribeToGroup(groupId) {
        const topic = `/topic/group/${groupId}`;
        return subscribe(topic, (msg) => {
            const data = JSON.parse(msg.body);
            if (window.Groups) window.Groups.handleIncomingGroupMessage(data);
        });
    }

    function send(destination, payload) {
        if (!stompClient || !isConnected) {
            console.warn('Cannot send STOMP message: socket is not connected');
            return false;
        }
        stompClient.send(destination, {}, JSON.stringify(payload));
        return true;
    }

    function scheduleReconnect() {
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        if (!window.state.currentUser) return; // User logged out

        const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 15000);
        reconnectAttempts++;
        console.log(`Reconnecting WebSocket in ${Math.round(delay / 1000)}s (attempt ${reconnectAttempts})...`);
        reconnectTimeout = setTimeout(() => {
            if (currentUserId && window.state.currentUser) {
                connect(currentUserId);
            }
        }, delay);
    }

    function disconnect() {
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        activeSubscriptions.clear();
        if (stompClient) {
            try {
                stompClient.disconnect(() => {
                    console.log('ConnectChat WebSocket disconnected cleanly');
                });
            } catch (e) {
                console.warn('Error disconnecting STOMP client:', e);
            }
        }
        stompClient = null;
        isConnected = false;
        window.state.connected = false;
    }

    return {
        connect,
        disconnect,
        subscribe,
        subscribeToGroup,
        send,
        isConnected: () => isConnected
    };
})();
