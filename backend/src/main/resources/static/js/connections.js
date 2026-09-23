/**
 * Let's Talk — Connections & Search Module
 */
window.Connections = window.Contacts = (function () {
    async function loadConnections() {
        if (!window.state || !window.state.currentUser) return;

        try {
            const connections = await window.ApiClient.get('/api/connections');
            window.state.connections = connections || [];
            renderConnectionsList();
            renderChatSidebarConversations();
            loadPendingRequests();
        } catch (err) {
            console.error('Failed to load connections:', err);
        }
    }

    async function loadPendingRequests() {
        if (!window.state || !window.state.currentUser) return;

        try {
            const requests = await window.ApiClient.get('/api/connections/requests');
            window.state.pendingRequests = requests || [];
            renderPendingRequestsBadge();
            renderPendingRequestsList();
        } catch (err) {
            console.error('Failed to load pending requests:', err);
        }
    }

    function renderPendingRequestsBadge() {
        const count = (window.state.pendingRequests || []).length;
        const tabBadge = document.getElementById('requests-count-badge');
        if (tabBadge) {
            tabBadge.textContent = count > 0 ? count : '';
            tabBadge.classList.toggle('hidden', count === 0);
            tabBadge.classList.toggle('urgent', count > 0);
        }

        const headerCount = document.getElementById('pending-requests-header-count');
        if (headerCount) {
            headerCount.textContent = count;
        }
    }

    function renderConnectionsList() {
        const container = document.getElementById('sidebar-contacts-list');
        const countEl = document.getElementById('connections-header-count');
        const connections = window.state.connections || [];
        if (countEl) countEl.textContent = connections.length;
        if (!container) return;

        if (connections.length === 0) {
            container.innerHTML = `
                <div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: var(--font-size-sm);">
                    No connected friends yet.<br/>Search above to connect!
                </div>
            `;
            return;
        }

        container.innerHTML = connections.map(conn => {
            const user = conn.user || conn.otherUser;
            if (!user) return '';
            const initials = window.Utils.getInitials(user.fullName || user.username);
            const gradient = window.Utils.getAvatarGradient(user.username);
            const photoUrl = user.profilePhoto || user.avatarUrl;
            const avatarHtml = photoUrl && photoUrl.trim() !== ''
                ? `<img src="${window.getApiUrl(photoUrl)}" alt="${window.Utils.escapeHtml(user.fullName)}" class="avatar avatar-sm" />`
                : `<div class="avatar avatar-sm" style="background: ${gradient}">${initials}</div>`;

            return `
                <div class="connected-friend-item">
                    <div class="pending-user-info">
                        <div class="avatar-wrap">
                            ${avatarHtml}
                            <span class="status-indicator ${user.online ? 'online' : ''}"></span>
                        </div>
                        <div>
                            <div class="user-item-name">${window.Utils.escapeHtml(user.fullName || user.username)}</div>
                            <div class="user-item-handle">@${window.Utils.escapeHtml(user.username)}</div>
                        </div>
                    </div>
                    <button type="button" class="btn-primary btn-sm" onclick="window.Connections.startChatWithFriend(${user.id}, '${window.Utils.escapeHtml(user.fullName || user.username)}', '${photoUrl || ''}', '${window.Utils.escapeHtml(user.username)}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 4px;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                        Chat
                    </button>
                </div>
            `;
        }).join('');
    }

    function renderChatSidebarConversations() {
        const container = document.getElementById('sidebar-chats-list');
        if (!container) return;

        // If active conversations exist from Conversations API, Chat module handles it
        if (window.Chat && typeof window.Chat.loadConversations === 'function') {
            window.Chat.loadConversations();
        }
    }

    function renderPendingRequestsList() {
        const container = document.getElementById('pending-requests-list');
        if (!container) return;

        const requests = window.state.pendingRequests || [];
        if (requests.length === 0) {
            container.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: var(--font-size-sm);">No pending requests.</div>`;
            return;
        }

        container.innerHTML = requests.map(req => {
            const user = req.user || req.sender;
            if (!user) return '';
            const initials = window.Utils.getInitials(user.fullName || user.username);
            const gradient = window.Utils.getAvatarGradient(user.username);
            const photoUrl = user.profilePhoto || user.avatarUrl;
            const avatarHtml = photoUrl && photoUrl.trim() !== ''
                ? `<img src="${window.getApiUrl(photoUrl)}" class="avatar avatar-sm" alt="${window.Utils.escapeHtml(user.fullName)}"/>`
                : `<div class="avatar avatar-sm" style="background:${gradient}">${initials}</div>`;

            return `
                <div class="pending-request-item" id="req-item-${req.id}">
                    <div class="pending-user-info">
                        ${avatarHtml}
                        <div>
                            <div class="user-item-name">${window.Utils.escapeHtml(user.fullName || user.username)}</div>
                            <div class="user-item-handle">@${window.Utils.escapeHtml(user.username)}</div>
                        </div>
                    </div>
                    <div class="pending-actions">
                        <button class="btn-primary btn-sm" onclick="window.Connections.acceptRequest(${req.id})">Accept</button>
                        <button class="btn-secondary btn-sm" onclick="window.Connections.rejectRequest(${req.id})">Decline</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    async function searchUsers(query) {
        const resultsContainer = document.getElementById('user-search-results');
        if (!resultsContainer) return;

        if (!query || query.trim().length < 2) {
            resultsContainer.innerHTML = '';
            return;
        }

        resultsContainer.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-muted);">Searching...</div>`;

        try {
            const users = await window.ApiClient.get(`/api/users/search?q=${encodeURIComponent(query.trim())}`);

            if (!users || users.length === 0) {
                resultsContainer.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-muted);">No users found matching "${window.Utils.escapeHtml(query)}"</div>`;
                return;
            }

            resultsContainer.innerHTML = users.map(user => {
                const initials = window.Utils.getInitials(user.fullName || user.username);
                const gradient = window.Utils.getAvatarGradient(user.username);
                const photoUrl = user.profilePhoto || user.avatarUrl;
                const avatarHtml = photoUrl && photoUrl.trim() !== ''
                    ? `<img src="${window.getApiUrl(photoUrl)}" class="avatar" alt="${window.Utils.escapeHtml(user.fullName)}"/>`
                    : `<div class="avatar" style="background:${gradient}">${initials}</div>`;

                let actionButtonHtml = '';
                if (user.connectionStatus === 'ACCEPTED') {
                    actionButtonHtml = `<button class="btn-secondary btn-sm" disabled>Connected</button>`;
                } else if (user.connectionStatus === 'PENDING_SENT') {
                    actionButtonHtml = `<button class="btn-secondary btn-sm" disabled>Request Sent</button>`;
                } else if (user.connectionStatus === 'PENDING_RECEIVED') {
                    actionButtonHtml = `<button class="btn-primary btn-sm" onclick="window.Connections.acceptRequest(${user.connectionId})">Accept Request</button>`;
                } else {
                    actionButtonHtml = `<button class="btn-primary btn-sm" onclick="window.Connections.sendRequest(${user.id}, this)">Connect</button>`;
                }

                return `
                    <div class="user-search-card">
                        <div class="user-card-info">
                            ${avatarHtml}
                            <div>
                                <div class="user-item-name">${window.Utils.escapeHtml(user.fullName || user.username)}</div>
                                <div class="user-item-handle">@${window.Utils.escapeHtml(user.username)}</div>
                                ${user.bio ? `<div class="user-item-bio">${window.Utils.escapeHtml(user.bio)}</div>` : ''}
                            </div>
                        </div>
                        <div class="user-card-action">
                            ${actionButtonHtml}
                        </div>
                    </div>
                `;
            }).join('');
        } catch (err) {
            console.error('Search error:', err);
            resultsContainer.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--accent-red);">Search failed. Please try again.</div>`;
        }
    }

    async function sendRequest(targetUserId, buttonEl) {
        if (buttonEl) {
            buttonEl.disabled = true;
            buttonEl.textContent = 'Sending...';
        }

        try {
            await window.ApiClient.post('/api/connections/request', { targetUserId: targetUserId });
            if (buttonEl) {
                buttonEl.textContent = 'Request Sent';
                buttonEl.className = 'btn-secondary btn-sm';
            }
            window.UI && window.UI.showToast('Connection request sent!', 'success');
        } catch (err) {
            if (buttonEl) {
                buttonEl.disabled = false;
                buttonEl.textContent = 'Connect';
            }
            window.UI && window.UI.showToast(err.message || 'Failed to send request.', 'error');
        }
    }

    async function acceptRequest(connectionId) {
        try {
            await window.ApiClient.post(`/api/connections/${connectionId}/accept`);
            window.UI && window.UI.showToast('Connection request accepted!', 'success');
            await loadConnections();
            await loadPendingRequests();
            if (window.Chat && typeof window.Chat.loadConversations === 'function') {
                await window.Chat.loadConversations();
            }
        } catch (err) {
            window.UI && window.UI.showToast(err.message || 'Failed to accept request.', 'error');
        }
    }

    async function rejectRequest(connectionId) {
        try {
            await window.ApiClient.post(`/api/connections/${connectionId}/reject`);
            window.UI && window.UI.showToast('Connection request declined.', 'info');
            await loadPendingRequests();
        } catch (err) {
            window.UI && window.UI.showToast(err.message || 'Failed to reject request.', 'error');
        }
    }

    function startChatWithFriend(userId, name, photoUrl, username) {
        window.UI && window.UI.setSidebarActiveTab && window.UI.setSidebarActiveTab('chats');
        if (window.Chat && typeof window.Chat.openDirectChat === 'function') {
            window.Chat.openDirectChat(userId, name, photoUrl, username);
        }
    }

    let inlineSearchTimer = null;
    function searchUsersInline(query) {
        clearTimeout(inlineSearchTimer);
        const container = document.getElementById('requests-inline-results');
        if (!container) return;

        if (!query || query.trim().length < 2) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `<div style="padding: 10px; font-size: var(--font-size-xs); color: var(--text-muted); text-align: center;">Searching users...</div>`;

        inlineSearchTimer = setTimeout(async () => {
            try {
                const users = await window.ApiClient.get(`/api/users/search?q=${encodeURIComponent(query.trim())}`);
                if (!users || users.length === 0) {
                    container.innerHTML = `<div style="padding: 10px; font-size: var(--font-size-xs); color: var(--text-muted); text-align: center;">No users found</div>`;
                    return;
                }

                container.innerHTML = users.map(u => {
                    const initials = window.Utils.getInitials(u.fullName || u.username);
                    const gradient = window.Utils.getAvatarGradient(u.username);
                    const photo = u.profilePhoto || u.avatarUrl;
                    const avatarHtml = photo && photo.trim() !== ''
                        ? `<img src="${window.getApiUrl(photo)}" class="avatar avatar-sm" />`
                        : `<div class="avatar avatar-sm" style="background:${gradient}">${initials}</div>`;

                    let btnHtml = '';
                    if (u.connectionStatus === 'ACCEPTED') {
                        btnHtml = `<span style="font-size: 11px; color: var(--accent-green); font-weight: 600;">Connected</span>`;
                    } else if (u.connectionStatus === 'PENDING_SENT') {
                        btnHtml = `<span style="font-size: 11px; color: var(--text-muted);">Requested</span>`;
                    } else if (u.connectionStatus === 'PENDING_RECEIVED') {
                        btnHtml = `<button type="button" class="btn-primary btn-sm" onclick="window.Connections.acceptRequest(${u.connectionId})">Accept</button>`;
                    } else {
                        btnHtml = `<button type="button" class="btn-primary btn-sm" onclick="window.Connections.sendRequest(${u.id}, this)">Connect</button>`;
                    }

                    return `
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-sm); margin-bottom: 6px;">
                            <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
                                ${avatarHtml}
                                <div style="min-width: 0;">
                                    <div style="font-size: var(--font-size-xs); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${window.Utils.escapeHtml(u.fullName || u.username)}</div>
                                    <div style="font-size: 10px; color: var(--text-muted);">@${window.Utils.escapeHtml(u.username)}</div>
                                </div>
                            </div>
                            <div style="flex-shrink: 0;">${btnHtml}</div>
                        </div>
                    `;
                }).join('');
            } catch (e) {
                container.innerHTML = `<div style="padding: 10px; font-size: var(--font-size-xs); color: var(--accent-red); text-align: center;">Search failed</div>`;
            }
        }, 300);
    }

    return {
        loadConnections,
        loadPendingRequests,
        searchUsers,
        searchUsersInline,
        sendRequest,
        acceptRequest,
        rejectRequest,
        renderConnectionsList,
        startChatWithFriend
    };
})();
