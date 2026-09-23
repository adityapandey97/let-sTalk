/**
 * ConnectChat Notification Manager
 */
window.Notifications = (function () {
    function handleIncomingNotification(notif) {
        if (!notif || !notif.type) return;

        switch (notif.type) {
            case 'MESSAGE_STATUS_UPDATE':
            case 'MESSAGE_READ':
                if (notif.messageId) {
                    updateMessageTick(notif.messageId, notif.messageStatus || 'READ');
                } else if (notif.senderId && window.state.activeChat && window.state.activeChat.id === notif.senderId) {
                    markAllRenderedMessagesRead();
                }
                break;

            case 'MESSAGE_DELETED':
                if (notif.messageId) {
                    const bubble = document.getElementById(`msg-bubble-${notif.messageId}`);
                    if (bubble) bubble.remove();
                }
                break;

            case 'MESSAGE_DELETED_FOR_EVERYONE':
                if (notif.messageId) {
                    markMessageDeletedForEveryoneInDOM(notif.messageId);
                }
                break;

            case 'CONVERSATION_CLEARED':
                if (window.state.activeChat && (window.state.activeChat.id === notif.senderId || window.state.activeChat.id === notif.receiverId)) {
                    const scrollContainer = document.getElementById('chat-messages-container');
                    if (scrollContainer) scrollContainer.innerHTML = '';
                }
                break;

            case 'CONNECTION_REQUEST':
            case 'CONNECTION_REQUEST_RECEIVED':
                window.UI.showToast(notif.message || `New connection request from ${notif.title || 'a user'}`, 'info');
                if (window.Connections) window.Connections.loadPendingRequests();
                break;

            case 'CONNECTION_ACCEPTED':
            case 'CONNECTION_REQUEST_ACCEPTED':
                window.UI.showToast(notif.message || `${notif.title || 'A user'} accepted your connection request`, 'success');
                if (window.Connections) window.Connections.loadConnections();
                if (window.Chat && typeof window.Chat.loadConversations === 'function') {
                    window.Chat.loadConversations();
                }
                break;

            case 'GROUP_CREATED':
                window.UI.showToast(notif.title || 'You were added to a new group', 'info');
                if (window.Groups) window.Groups.loadGroups();
                break;

            default:
                break;
        }
    }

    function updateMessageTick(messageId, status) {
        const tickEl = document.getElementById(`tick-${messageId}`);
        if (!tickEl) return;

        tickEl.className = `status-tick ${status.toLowerCase()}`;
        if (status === 'SENT') {
            tickEl.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
        } else if (status === 'DELIVERED') {
            tickEl.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 6 9 17 4 12"/><polyline points="22 10 13 21 8 16"/></svg>`;
        } else if (status === 'READ') {
            tickEl.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#53bdeb" stroke-width="2.5"><polyline points="18 6 9 17 4 12"/><polyline points="22 10 13 21 8 16"/></svg>`;
        }
    }

    function markAllRenderedMessagesRead() {
        document.querySelectorAll('.message-bubble-wrapper.outgoing .status-tick').forEach(tick => {
            tick.className = 'status-tick read';
            tick.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#53bdeb" stroke-width="2.5"><polyline points="18 6 9 17 4 12"/><polyline points="22 10 13 21 8 16"/></svg>`;
        });
    }

    function markMessageDeletedForEveryoneInDOM(messageId) {
        const bubble = document.getElementById(`msg-bubble-${messageId}`);
        if (!bubble) return;

        bubble.classList.add('deleted');
        bubble.innerHTML = `
            <span style="display:inline-flex; align-items:center; gap:6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                This message was deleted
            </span>
        `;
    }

    return {
        handleIncomingNotification,
        updateMessageTick,
        markAllRenderedMessagesRead,
        markMessageDeletedForEveryoneInDOM
    };
})();
