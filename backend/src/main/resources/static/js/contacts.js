/**
 * ConnectChat Contacts & Connections Module
 */
window.Contacts = (function () {
    async function loadConnections() {
        if (!window.state.currentUser) return;
        const userId = window.state.currentUser.id;

        try {
            const connections = await window.ApiClient.get(`/api/connections/${userId}`);
            window.state.connections = connections || [];
            renderConnectionsList();
            renderChatSidebarConversations();
            loadPendingRequests();
        } catch (err) {
            console.error('Failed to load connections:', err);
        }
    }

    async function loadPendingRequests() {
        if (!window.state.currentUser) return;
        const userId = window.state.currentUser.id;

        try {
            const requests = await window.ApiClient.get(`/api/connections/requests/${userId}`);
            window.state.pendingRequests = requests || [];
            renderPendingRequestsBadge();
            renderPendingRequestsList();
        } catch (err) {
            console.error('Failed to load pending requests:', err);
        }
    }

    function renderPendingRequestsBadge() {
        const badge = document.getElementById('pending-requests-badge');
        if (!badge) return;
        const count = (window.state.pendingRequests || []).length;
        badge.textContent = count > 0 ? count : '';
        badge.classList.toggle('hidden', count === 0);
    }

    function renderConnectionsList() {
        const container = document.getElementById('sidebar-contacts-list');
        if (!container) return;

        const connections = window.state.connections || [];
        if (connections.length === 0) {
            container.innerHTML = `
                <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: var(--font-size-sm);">
                    No contacts yet.<br/>Use <strong>Find People</strong> to connect with friends!
                </div>
            `;
            return;
        }

        container.innerHTML = connections.map(conn => {
            const user = conn.user || conn.otherUser || (conn.sender && conn.sender.id === window.state.currentUser.id ? conn.receiver : conn.sender);
            if (!user) return '';
            const initials = window.Utils.getInitials(user.fullName || user.username);
            const gradient = window.Utils.getAvatarGradient(user.username);
            const avatarHtml = user.avatarUrl && user.avatarUrl.trim() !== ''
                ? `<img src="${window.getApiUrl(user.avatarUrl)}" alt="${window.Utils.escapeHtml(user.fullName)}" class="avatar" />`
                : `<div class="avatar" style="background: ${gradient}">${initials}</div>`;

            return `
                <div class="conversation-item" onclick="window.Chat.openDirectChat(${user.id}, '${window.Utils.escapeHtml(user.fullName || user.username)}', '${user.avatarUrl || ''}', '${window.Utils.escapeHtml(user.username)}')">
                    <div class="avatar-wrap">
                        ${avatarHtml}
                        <span class="status-indicator ${user.online ? 'online' : ''}"></span>
                    </div>
                    <div class="conversation-info">
                        <div class="conversation-header-row">
                            <span class="conversation-name">${window.Utils.escapeHtml(user.fullName || user.username)}</span>
                        </div>
                        <div class="conversation-message-row">
                            <span class="conversation-snippet">@${window.Utils.escapeHtml(user.username)} ${user.bio ? '&bull; ' + window.Utils.escapeHtml(user.bio) : ''}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderChatSidebarConversations() {
        const container = document.getElementById('sidebar-chats-list');
        if (!container) return;

        const connections = window.state.connections || [];
        if (connections.length === 0) {
            container.innerHTML = `
                <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: var(--font-size-sm);">
                    No chats yet.<br/>Start a conversation with a contact!
                </div>
            `;
            return;
        }

        container.innerHTML = connections.map(conn => {
            const user = conn.user || conn.otherUser || (conn.sender && conn.sender.id === window.state.currentUser.id ? conn.receiver : conn.sender);
            if (!user) return '';
            const initials = window.Utils.getInitials(user.fullName || user.username);
            const gradient = window.Utils.getAvatarGradient(user.username);
            const avatarHtml = user.avatarUrl && user.avatarUrl.trim() !== ''
                ? `<img src="${window.getApiUrl(user.avatarUrl)}" alt="${window.Utils.escapeHtml(user.fullName)}" class="avatar" />`
                : `<div class="avatar" style="background: ${gradient}">${initials}</div>`;

            const isActive = window.state.activeChat && window.state.activeChat.id === user.id && window.state.activeChat.type === 'direct';
            const snippet = conn.lastMessage ? window.Utils.escapeHtml(conn.lastMessage) : 'Click to chat';
            const timeStr = conn.lastMessageTime ? window.Utils.formatTime(conn.lastMessageTime) : '';

            return `
                <div class="conversation-item ${isActive ? 'active' : ''}" id="conv-item-${user.id}" onclick="window.Chat.openDirectChat(${user.id}, '${window.Utils.escapeHtml(user.fullName || user.username)}', '${user.avatarUrl || ''}', '${window.Utils.escapeHtml(user.username)}')">
                    <div class="avatar-wrap">
                        ${avatarHtml}
                        <span class="status-indicator ${user.online ? 'online' : ''}"></span>
                    </div>
                    <div class="conversation-info">
                        <div class="conversation-header-row">
                            <span class="conversation-name">${window.Utils.escapeHtml(user.fullName || user.username)}</span>
                            <span class="conversation-time" id="conv-time-${user.id}">${timeStr}</span>
                        </div>
                        <div class="conversation-message-row">
                            <span class="conversation-snippet" id="conv-snippet-${user.id}">${snippet}</span>
                            <span class="badge-unread ${conn.unreadCount > 0 ? '' : 'hidden'}" id="conv-badge-${user.id}">${conn.unreadCount || ''}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderPendingRequestsList() {
        const container = document.getElementById('pending-requests-list');
        if (!container) return;

        const requests = window.state.pendingRequests || [];
        if (requests.length === 0) {
            container.innerHTML = `
                <div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: var(--font-size-sm);">
                    No pending connection requests.
                </div>
            `;
            return;
        }

        container.innerHTML = requests.map(req => {
            const sender = req.sender;
            const initials = window.Utils.getInitials(sender.fullName || sender.username);
            const gradient = window.Utils.getAvatarGradient(sender.username);

            return `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--bg-hover); border-radius: var(--radius-sm); margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="avatar avatar-sm" style="background: ${gradient}">${initials}</div>
                        <div>
                            <strong style="display:block; font-size: var(--font-size-sm);">${window.Utils.escapeHtml(sender.fullName || sender.username)}</strong>
                            <span style="font-size: var(--font-size-xs); color: var(--text-muted);">@${window.Utils.escapeHtml(sender.username)}</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 6px;">
                        <button type="button" class="btn-primary" style="padding: 6px 12px; font-size: var(--font-size-xs);" onclick="window.Contacts.acceptRequest(${req.id})">Accept</button>
                        <button type="button" class="btn-secondary" style="padding: 6px 12px; font-size: var(--font-size-xs);" onclick="window.Contacts.rejectRequest(${req.id})">Decline</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    async function searchUsers(query) {
        if (!query || query.trim().length === 0) return [];
        if (!window.state.currentUser) return [];

        try {
            const results = await window.ApiClient.get(`/api/users/search?username=${encodeURIComponent(query.trim())}&currentUserId=${window.state.currentUser.id}`);
            return results || [];
        } catch (err) {
            console.error('Search users error:', err);
            return [];
        }
    }

    async function sendConnectionRequest(targetId) {
        if (!window.state.currentUser) return;
        try {
            await window.ApiClient.post('/api/connections/request', {
                senderId: window.state.currentUser.id,
                receiverId: targetId
            });
            window.UI.showToast('Connection request sent!', 'success');
        } catch (err) {
            window.UI.showToast(err.message || 'Failed to send request', 'error');
        }
    }

    async function acceptRequest(requestId) {
        if (!window.state.currentUser) return;
        try {
            await window.ApiClient.post(`/api/connections/${requestId}/accept?userId=${window.state.currentUser.id}`, {});
            window.UI.showToast('Connection accepted!', 'success');
            loadConnections();
        } catch (err) {
            window.UI.showToast(err.message || 'Failed to accept request', 'error');
        }
    }

    async function rejectRequest(requestId) {
        if (!window.state.currentUser) return;
        try {
            await window.ApiClient.post(`/api/connections/${requestId}/reject?userId=${window.state.currentUser.id}`, {});
            window.UI.showToast('Request declined', 'info');
            loadPendingRequests();
        } catch (err) {
            window.UI.showToast(err.message || 'Failed to decline request', 'error');
        }
    }

    return {
        loadConnections,
        loadPendingRequests,
        renderConnectionsList,
        renderChatSidebarConversations,
        searchUsers,
        sendConnectionRequest,
        acceptRequest,
        rejectRequest
    };
})();
