/**
 * ConnectChat Groups Module
 */
window.Groups = (function () {
    async function loadGroups() {
        if (!window.state.currentUser) return;
        const userId = window.state.currentUser.id;

        try {
            const groups = await window.ApiClient.get(`/api/groups/user/${userId}`);
            window.state.groups = groups || [];
            renderGroupsList();

            // Subscribe to all group channels on WebSocket
            if (window.WebSocketManager) {
                window.state.groups.forEach(g => {
                    window.WebSocketManager.subscribeToGroup(g.id);
                });
            }
        } catch (err) {
            console.error('Failed to load groups:', err);
        }
    }

    function renderGroupsList() {
        const container = document.getElementById('sidebar-groups-list');
        if (!container) return;

        const groups = window.state.groups || [];
        if (groups.length === 0) {
            container.innerHTML = `
                <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: var(--font-size-sm);">
                    No groups yet.<br/>Click <strong>New Group</strong> to create one!
                </div>
            `;
            return;
        }

        container.innerHTML = groups.map(g => {
            const initials = window.Utils.getInitials(g.name);
            const gradient = window.Utils.getAvatarGradient(g.name);

            return `
                <div class="conversation-item" onclick="window.Groups.openGroupChat(${g.id}, '${window.Utils.escapeHtml(g.name)}')">
                    <div class="avatar-wrap">
                        <div class="avatar" style="background: ${gradient}">${initials}</div>
                    </div>
                    <div class="conversation-info">
                        <div class="conversation-header-row">
                            <span class="conversation-name">${window.Utils.escapeHtml(g.name)}</span>
                        </div>
                        <div class="conversation-message-row">
                            <span class="conversation-snippet">${g.memberCount || 1} members</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function openGroupChat(groupId, name) {
        window.state.activeChat = {
            type: 'group',
            id: groupId,
            name: name
        };

        window.UI.toggleMobileChat(true);

        const emptyState = document.getElementById('chat-empty-state');
        const activeContainer = document.getElementById('chat-active-container');
        if (emptyState) emptyState.classList.add('hidden');
        if (activeContainer) activeContainer.classList.remove('hidden');

        const nameEl = document.getElementById('active-chat-name');
        const statusEl = document.getElementById('active-chat-status');
        const avatarContainer = document.getElementById('active-chat-avatar-wrap');

        if (nameEl) nameEl.textContent = name;
        if (statusEl) statusEl.textContent = 'Group Channel';

        if (avatarContainer) {
            const initials = window.Utils.getInitials(name);
            const gradient = window.Utils.getAvatarGradient(name);
            avatarContainer.innerHTML = `<div class="avatar" style="background: ${gradient}">${initials}</div>`;
        }

        loadGroupMessages(groupId);
    }

    async function loadGroupMessages(groupId) {
        if (!window.state.currentUser) return;
        const currentUserId = window.state.currentUser.id;

        const scrollContainer = document.getElementById('chat-messages-container');
        if (scrollContainer) {
            scrollContainer.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted);">Loading group messages...</div>`;
        }

        try {
            const messages = await window.ApiClient.get(`/api/groups/${groupId}/messages?userId=${currentUserId}`);
            renderGroupMessages(messages || []);
        } catch (err) {
            console.error('Failed to load group messages:', err);
        }
    }

    function renderGroupMessages(messages) {
        const container = document.getElementById('chat-messages-container');
        if (!container) return;

        if (messages.length === 0) {
            container.innerHTML = `
                <div style="padding: 40px 20px; text-align: center; color: var(--text-muted); font-size: var(--font-size-sm);">
                    Welcome to the group!<br/>Be the first to say hello.
                </div>
            `;
            return;
        }

        let html = '';
        messages.forEach(msg => {
            const isOutgoing = msg.senderId === window.state.currentUser.id;
            const timeStr = window.Utils.formatTime(msg.sentAt);

            html += `
                <div class="message-bubble-wrapper ${isOutgoing ? 'outgoing' : 'incoming'}">
                    <div class="message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}">
                        ${!isOutgoing ? `<div style="font-size: var(--font-size-xs); font-weight: 700; color: var(--primary-color); margin-bottom: 2px;">${window.Utils.escapeHtml(msg.senderFullName || msg.senderUsername)}</div>` : ''}
                        <span>${window.Utils.escapeHtml(msg.content)}</span>
                        <div class="message-meta">
                            <span>${timeStr}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
    }

    function handleIncomingGroupMessage(msg) {
        if (!msg) return;

        if (window.state.activeChat && window.state.activeChat.type === 'group' && window.state.activeChat.id === msg.groupId) {
            const container = document.getElementById('chat-messages-container');
            if (container) {
                const isOutgoing = msg.senderId === window.state.currentUser.id;
                const timeStr = window.Utils.formatTime(msg.sentAt);
                const bubbleHtml = `
                    <div class="message-bubble-wrapper ${isOutgoing ? 'outgoing' : 'incoming'}">
                        <div class="message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}">
                            ${!isOutgoing ? `<div style="font-size: var(--font-size-xs); font-weight: 700; color: var(--primary-color); margin-bottom: 2px;">${window.Utils.escapeHtml(msg.senderFullName || msg.senderUsername)}</div>` : ''}
                            <span>${window.Utils.escapeHtml(msg.content)}</span>
                            <div class="message-meta">
                                <span>${timeStr}</span>
                            </div>
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', bubbleHtml);
                container.scrollTop = container.scrollHeight;
            }
        }
    }

    async function createGroup(name, memberIds) {
        if (!window.state.currentUser) return;
        try {
            const created = await window.ApiClient.post('/api/groups', {
                name: name,
                creatorId: window.state.currentUser.id,
                memberIds: memberIds
            });
            window.UI.showToast(`Group "${name}" created!`, 'success');
            window.UI.closeModal('modal-new-group');
            loadGroups();
        } catch (err) {
            window.UI.showToast(err.message || 'Failed to create group', 'error');
        }
    }

    return {
        loadGroups,
        renderGroupsList,
        openGroupChat,
        handleIncomingGroupMessage,
        createGroup
    };
})();
